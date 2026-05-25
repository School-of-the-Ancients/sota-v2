import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync, readFileSync } from "node:fs";

import { buildStaticApp } from "../src/bin/build-static.ts";

test("static build outputs Vercel-compatible pages", async () => {
  rmSync("dist", { recursive: true, force: true });

  const output = await buildStaticApp();

  assert.deepEqual(output.files.sort(), ["dist/goals/new/index.html", "dist/index.html"]);
  assert.equal(existsSync("dist/index.html"), true);
  assert.equal(existsSync("dist/goals/new/index.html"), true);

  const home = readFileSync("dist/index.html", "utf8");
  assert.match(home, /Start a new goal/i);

  const goal = readFileSync("dist/goals/new/index.html", "utf8");
  assert.match(goal, /Start a learning goal/i);
  assert.doesNotMatch(goal, /method="post"/i);
  assert.doesNotMatch(goal, /action="\/goals\/new"/i);
});
