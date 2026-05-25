import test from "node:test";
import assert from "node:assert/strict";

import { canTransitionQuest, transitionQuest } from "../src/features/quests/questStateMachine.ts";

test("quest state machine allows the happy path through mastery", () => {
  assert.equal(canTransitionQuest("draft", "active"), true);
  assert.equal(canTransitionQuest("active", "lesson_in_progress"), true);
  assert.equal(canTransitionQuest("lesson_in_progress", "practice_due"), true);
  assert.equal(canTransitionQuest("practice_due", "quiz_ready"), true);
  assert.equal(canTransitionQuest("quiz_ready", "completed", { hasPassedAssessment: true }), true);
});

test("quest state machine blocks completion without mastery evidence", () => {
  assert.equal(canTransitionQuest("quiz_ready", "completed"), false);
  assert.throws(
    () => transitionQuest("quiz_ready", "completed"),
    /passed assessment or manual override/i,
  );
});

test("quest state machine routes failed assessments to review", () => {
  assert.equal(canTransitionQuest("quiz_ready", "needs_review", { assessmentPassed: false }), true);
  assert.equal(canTransitionQuest("quiz_ready", "completed", { assessmentPassed: false }), false);
});

test("archived quests are terminal", () => {
  assert.equal(canTransitionQuest("archived", "active"), false);
});
