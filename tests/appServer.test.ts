import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

import { createAppServer } from "../src/app/server.ts";
import type { OneWeekCurriculumOutput } from "../src/features/curriculum/curriculumTypes.ts";
import type { TextGenerationRequest, TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
import { InMemoryCurriculaRepository } from "../src/lib/db/repositories/curriculaRepo.ts";
import { InMemoryGoalsRepository } from "../src/lib/db/repositories/goalsRepo.ts";

const generatedCurriculum: OneWeekCurriculumOutput = {
  title: "One-week algorithms readiness sprint",
  description: "A practical seven-day prep plan for CSCI 3104.",
  duration_days: 7,
  weekly_rhythm: "Daily concept review, guided practice, and a mastery check.",
  days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
    day,
    title: `Day ${day}`,
    objective: `Complete day ${day} objective.`,
    focus_points: [`focus ${day}`],
    practice_tasks: [`practice ${day}`],
    mastery_criteria: [`mastery ${day}`],
  })),
};

function fakeCurriculumGateway() {
  return {
    async generateText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      return {
        data: generatedCurriculum as T,
        provider: "fake",
        model: "fake-model",
        promptVersion: request.promptVersion,
        task: request.task,
      };
    },
  };
}

test("app server serves root and goal intake pages", async (t) => {
  const server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address && typeof address === "object" ? address.port : 0;

  const home = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Start a new goal/i);

  const goal = await fetch(`http://127.0.0.1:${port}/goals/new`);
  assert.equal(goal.status, 200);
  assert.match(await goal.text(), /name="goal"/);
});

test("app server dispatches goal intake form posts", async (t) => {
  const server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address && typeof address === "object" ? address.port : 0;

  const response = await fetch(`http://127.0.0.1:${port}/goals/new`, {
    method: "POST",
    body: new URLSearchParams({ goal: "Prepare for algorithms" }),
    redirect: "manual",
  });

  assert.equal(response.status, 303);
  assert.match(response.headers.get("location") ?? "", /^\/goals\//);
});

test("app server can generate and review a one-week curriculum after goal intake", async (t) => {
  const goalsRepo = new InMemoryGoalsRepository();
  const curriculaRepo = new InMemoryCurriculaRepository();
  const server = createAppServer({
    goalsRepo,
    curriculaRepo,
    aiGateway: fakeCurriculumGateway(),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address && typeof address === "object" ? address.port : 0;

  const intake = await fetch(`http://127.0.0.1:${port}/goals/new`, {
    method: "POST",
    body: new URLSearchParams({ goal: "Prepare for algorithms" }),
    redirect: "manual",
  });
  const goalLocation = intake.headers.get("location") ?? "";
  assert.match(goalLocation, /^\/goals\//);
  const goalId = goalLocation.split("/").at(-1) ?? "";

  const generate = await fetch(`http://127.0.0.1:${port}/goals/${goalId}/curriculum`, {
    method: "POST",
    redirect: "manual",
  });

  assert.equal(generate.status, 303);
  assert.match(generate.headers.get("location") ?? "", new RegExp(`^/goals/${goalId}/curricula/`));

  const saved = await curriculaRepo.listByGoal("local-dev-user", goalId);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, "One-week algorithms readiness sprint");

  const review = await fetch(`http://127.0.0.1:${port}${generate.headers.get("location")}`);
  assert.equal(review.status, 200);
  const html = await review.text();
  assert.match(html, /One-week algorithms readiness sprint/);
  assert.match(html, /Day 1/);
  assert.match(html, /Regenerate curriculum/);
});

test("app server CLI starts a browser-loadable local app", async () => {
  const child = spawn("node", ["--experimental-strip-types", "src/bin/dev-server.ts", "--host", "127.0.0.1", "--port", "0"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  let settled = false;
  const ready = new Promise<{ port: number }>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`dev server did not become ready. Output: ${output}`));
      }
    }, 5000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ port: Number(match[1]) });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    });
    child.on("exit", (code) => {
      if (!settled && code !== null && code !== 0) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`dev server exited with ${code}. Output: ${output}`));
      }
    });
  });

  try {
    const { port } = await ready;
    const response = await fetch(`http://127.0.0.1:${port}/goals/new`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Start a learning goal/i);
  } finally {
    if (!child.killed) {
      child.kill("SIGINT");
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
});
