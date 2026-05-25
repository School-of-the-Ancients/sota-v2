import test from "node:test";
import assert from "node:assert/strict";

import { renderAppShell } from "../src/app/App.ts";
import { resolveRoute, routes } from "../src/app/router.ts";
import { buildStaticApp } from "../src/bin/build-static.ts";

const visibleM1Routes = [
  { path: "/goals/new", title: "Start a goal", marker: "data-route=\"goal-intake\"" },
  { path: "/curriculum/demo", title: "Curriculum", marker: "data-route=\"curriculum-review\"" },
  { path: "/quests/demo", title: "Quest", marker: "data-route=\"quest-detail\"" },
  { path: "/learn/demo", title: "Lesson", marker: "data-route=\"lesson-runtime\"" },
  { path: "/progress", title: "Progress", marker: "data-route=\"progress\"" },
] as const;

test("primary navigation exposes every implemented M1 surface", () => {
  const html = renderAppShell("/");

  for (const route of visibleM1Routes) {
    assert.match(html, new RegExp(`href="${route.path.replaceAll("/", "\\/")}"`));
    assert.match(html, new RegExp(`>${route.title}<`));
  }
});

test("router resolves visible M1 demo surfaces instead of not-found placeholders", () => {
  for (const route of visibleM1Routes) {
    const resolved = resolveRoute(route.path);

    assert.notEqual(resolved.id, "not-found", `${route.path} should resolve`);
    assert.match(resolved.html, new RegExp(route.marker));
  }
});

test("M1 frontend surfaces show the implemented learning loop capabilities", () => {
  const home = renderAppShell("/");
  const curriculum = renderAppShell("/curriculum/demo");
  const quest = renderAppShell("/quests/demo");
  const lesson = renderAppShell("/learn/demo");
  const progress = renderAppShell("/progress");

  assert.match(home, /Goal intake/i);
  assert.match(home, /One-week curriculum/i);
  assert.match(home, /Quest generation/i);
  assert.match(home, /3-2-1 lesson/i);
  assert.match(home, /Saved session/i);

  assert.match(curriculum, /Review the seven-day plan/i);
  assert.match(quest, /Mastery criteria/i);
  assert.match(lesson, /Explanation/i);
  assert.match(lesson, /Guided practice/i);
  assert.match(lesson, /Socratic check/i);
  assert.match(progress, /Active quest/i);
  assert.match(progress, /Recommended next action/i);
});

test("static build publishes the visible M1 frontend pages", async () => {
  const result = await buildStaticApp();

  assert.deepEqual(
    result.files.sort(),
    [
      "dist/curriculum/demo/index.html",
      "dist/goals/new/index.html",
      "dist/index.html",
      "dist/learn/demo/index.html",
      "dist/progress/index.html",
      "dist/quests/demo/index.html",
    ].sort(),
  );
});
