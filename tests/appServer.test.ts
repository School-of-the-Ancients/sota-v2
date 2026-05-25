import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

import { createAppServer } from "../src/app/server.ts";

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
