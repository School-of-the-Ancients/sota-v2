import test from "node:test";
import assert from "node:assert/strict";

import { buildActiveQuestProgressSurface, renderHomeRoute } from "../src/app/routes/HomeRoute.ts";
import type { Quest } from "../src/features/quests/questTypes.ts";

const baseQuest: Quest = {
  id: "quest-1",
  userId: "user-1",
  goalId: "goal-1",
  curriculumId: "curriculum-1",
  title: "Big-O foundations",
  objective: "Classify simple loop runtimes.",
  prerequisiteNotes: ["Know variables and loops"],
  lessonPlan: ["Explain Big-O", "Walk through a loop example"],
  focusPoints: ["Big-O", "loop analysis"],
  practiceTasks: ["Classify five snippets"],
  masteryCriteria: ["Explain dominant term rule"],
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

test("home progress surface selects the active quest and recommended next action", () => {
  const surface = buildActiveQuestProgressSurface([
    { ...baseQuest, id: "quest-old", title: "Old quest", updatedAt: "2026-01-01T00:00:00.000Z" },
    { ...baseQuest, id: "quest-current", title: "Current quest", status: "practice_due", updatedAt: "2026-01-03T00:00:00.000Z" },
  ]);

  assert.equal(surface.activeQuest?.id, "quest-current");
  assert.equal(surface.currentState, "Practice due");
  assert.equal(surface.recommendedNextAction.label, "Submit guided practice");
  assert.match(surface.recommendedNextAction.href, /quest-current/);
});

test("home route renders active quest, state, and next action", () => {
  const html = renderHomeRoute({ quests: [{ ...baseQuest, status: "lesson_in_progress" }] });

  assert.match(html, /data-section="active-quest"/);
  assert.match(html, /Big-O foundations/);
  assert.match(html, /Lesson in progress/);
  assert.match(html, /Continue 3-2-1 lesson/);
  assert.match(html, /Classify simple loop runtimes/);
});

test("home route renders an empty progress state when no active quest exists", () => {
  const html = renderHomeRoute({ quests: [{ ...baseQuest, status: "completed" }] });

  assert.match(html, /No active quest yet/i);
  assert.match(html, /Generate a quest/i);
  assert.doesNotMatch(html, /data-quest-id="quest-1"/);
});
