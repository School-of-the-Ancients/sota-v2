import test from "node:test";
import assert from "node:assert/strict";

import { canAdvanceLessonStage, nextLessonStage, transitionLessonStage } from "../src/features/lessons/lessonStateMachine.ts";

test("lesson state machine follows the 3-2-1 lesson order", () => {
  const path = ["not_started"];
  path.push(nextLessonStage("not_started"));
  path.push(nextLessonStage("explain"));
  path.push(nextLessonStage("example"));
  path.push(nextLessonStage("guided_practice"));
  path.push(nextLessonStage("socratic_check"));
  path.push(nextLessonStage("recap"));

  assert.deepEqual(path, [
    "not_started",
    "explain",
    "example",
    "guided_practice",
    "socratic_check",
    "recap",
    "ended",
  ]);
});

test("lesson state machine prevents skipping guided practice before Socratic check", () => {
  assert.equal(canAdvanceLessonStage("explain", "socratic_check"), false);
  assert.throws(
    () => transitionLessonStage("explain", "socratic_check"),
    /invalid lesson stage transition/i,
  );
});

test("ended lesson stage is terminal", () => {
  assert.equal(canAdvanceLessonStage("ended", "recap"), false);
});
