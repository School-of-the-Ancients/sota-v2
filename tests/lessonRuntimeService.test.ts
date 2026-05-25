import test from "node:test";
import assert from "node:assert/strict";

import { LessonRuntimeService } from "../src/features/lessons/lessonService.ts";
import type { LessonRuntimeEvent } from "../src/features/lessons/lessonTypes.ts";

test("lesson runtime starts with a learner-visible explanation stage", () => {
  const service = new LessonRuntimeService();
  const session = service.startLesson({
    userId: "user-1",
    questId: "quest-1",
    objective: "Explain Big-O for simple loops",
  });

  assert.equal(session.stage, "explain");
  assert.equal(session.stageLabel, "Explain");
  assert.match(session.visibleToLearner, /Explain Big-O/);
  assert.deepEqual(session.availableActions, ["ask_more_explanation", "ask_example", "advance"]);
  assert.deepEqual(session.history.map((event) => event.type), ["stage_started"]);
});

test("lesson runtime lets learners ask for more explanation and examples before practice", () => {
  const service = new LessonRuntimeService();
  let session = service.startLesson({ userId: "user-1", questId: "quest-1", objective: "Trace BFS" });

  session = service.recordLearnerAction(session, "ask_more_explanation", "Can you explain queues again?");
  assert.equal(session.stage, "explain");
  assert.equal(session.history.at(-1)?.type, "learner_requested_more_explanation");

  session = service.recordLearnerAction(session, "ask_example", "Show a graph example");
  assert.equal(session.stage, "example");
  assert.equal(session.stageLabel, "Example");
  assert.match(session.visibleToLearner, /example/i);
  assert.equal(session.history.at(-1)?.type, "stage_started");
});

test("lesson runtime enforces practice before Socratic check", () => {
  const service = new LessonRuntimeService();
  let session = service.startLesson({ userId: "user-1", questId: "quest-1", objective: "Classify loop runtime" });

  assert.throws(
    () => service.advanceTo(session, "socratic_check"),
    /guided practice before Socratic check/i,
  );

  session = service.advance(session); // example
  session = service.advance(session); // guided practice
  assert.equal(session.stage, "guided_practice");
  assert.deepEqual(session.availableActions, ["submit_practice", "ask_more_explanation"]);

  session = service.recordLearnerAction(session, "submit_practice", "O(n)");
  session = service.advance(session);

  assert.equal(session.stage, "socratic_check");
  assert.equal(session.stageLabel, "Socratic check");
  assert.match(session.visibleToLearner, /question/i);
});

test("lesson runtime records recap and ended stages after Socratic check", () => {
  const service = new LessonRuntimeService();
  let session = service.startLesson({ userId: "user-1", questId: "quest-1", objective: "Rank growth rates" });

  session = service.advance(session); // example
  session = service.advance(session); // guided practice
  session = service.recordLearnerAction(session, "submit_practice", "n log n beats n squared");
  session = service.advance(session); // socratic check
  session = service.recordLearnerAction(session, "answer_socratic_check", "Drop constants and lower-order terms");
  session = service.advance(session); // recap
  assert.equal(session.stage, "recap");
  assert.deepEqual(session.availableActions, ["finish"]);

  session = service.advance(session);
  assert.equal(session.stage, "ended");
  assert.equal(session.stageLabel, "Ended");
  assert.deepEqual(session.availableActions, []);

  const stageEvents = session.history.filter((event): event is LessonRuntimeEvent & { type: "stage_started" } => event.type === "stage_started");
  assert.deepEqual(stageEvents.map((event) => event.stage), [
    "explain",
    "example",
    "guided_practice",
    "socratic_check",
    "recap",
    "ended",
  ]);
});
