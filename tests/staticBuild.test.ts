import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync, readFileSync } from "node:fs";

import { buildStaticApp } from "../src/bin/build-static.ts";

test("static build outputs Vercel-compatible pages", async () => {
  rmSync("dist", { recursive: true, force: true });

  const output = await buildStaticApp();

  assert.deepEqual(
    output.files.sort(),
    [
      "dist/curriculum/demo/index.html",
      "dist/goals/new/index.html",
      "dist/index.html",
      "dist/learn/demo/index.html",
      "dist/progress/index.html",
      "dist/quests/demo/index.html",
    ].sort(),
  );
  assert.equal(existsSync("dist/index.html"), true);
  assert.equal(existsSync("dist/goals/new/index.html"), true);
  assert.equal(existsSync("dist/curriculum/demo/index.html"), true);
  assert.equal(existsSync("dist/quests/demo/index.html"), true);
  assert.equal(existsSync("dist/learn/demo/index.html"), true);
  assert.equal(existsSync("dist/progress/index.html"), true);

  const home = readFileSync("dist/index.html", "utf8");
  assert.match(home, /Start a new goal/i);

  const goal = readFileSync("dist/goals/new/index.html", "utf8");
  assert.match(goal, /Start a learning goal/i);
  assert.doesNotMatch(goal, /method="post"/i);
  assert.doesNotMatch(goal, /action="\/goals\/new"/i);

  const quest = readFileSync("dist/quests/demo/index.html", "utf8");
  assert.match(quest, /Mastery criteria/i);

  const lesson = readFileSync("dist/learn/demo/index.html", "utf8");
  assert.match(lesson, /Socratic check/i);

  const progress = readFileSync("dist/progress/index.html", "utf8");
  assert.match(progress, /Recommended next action/i);
});
