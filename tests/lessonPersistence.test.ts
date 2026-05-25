import test from "node:test";
import assert from "node:assert/strict";

import { LessonRuntimeService } from "../src/features/lessons/lessonService.ts";
import type { PersistedLessonMessage, LessonSessionSummary } from "../src/features/lessons/lessonTypes.ts";
import { InMemoryLessonSessionsRepository } from "../src/lib/db/repositories/sessionsRepo.ts";

function completedLesson() {
  const service = new LessonRuntimeService();
  let session = service.startLesson({ userId: "user-1", questId: "quest-1", objective: "Classify nested loop runtime" });
  session = service.recordLessonMessage(session, "mentor", "We start by counting loop iterations.", {
    mentorId: "algorithms-coach",
    promptVersion: "mentors.algorithms-coach.v1",
  });
  session = service.recordLessonMessage(session, "learner", "I think the nested loop is O(n^2).");
  session = service.advance(session); // example
  session = service.advance(session); // guided practice
  session = service.recordLearnerAction(session, "submit_practice", "The outer loop runs n times and inner loop runs n times.");
  session = service.advance(session); // socratic_check
  session = service.recordLearnerAction(session, "answer_socratic_check", "Drop constants and lower order terms.");
  session = service.advance(session); // recap
  session = service.advance(session); // ended
  return session;
}

test("lesson sessions persist messages, mentor, prompt versions, summary, and learner recap", async () => {
  const repo = new InMemoryLessonSessionsRepository();
  const service = new LessonRuntimeService({ sessionsRepo: repo });
  const session = completedLesson();

  const persisted = await service.persistCompletedSession(session, {
    mentorId: "algorithms-coach",
    promptVersions: ["mentors.algorithms-coach.v1", "lessons.runtime.v1"],
    summary: "Learner practiced nested-loop runtime analysis and answered the Socratic check.",
    learnerVisibleRecap: "Nested loops often multiply work: n times n gives O(n^2).",
  });

  assert.equal(persisted.userId, "user-1");
  assert.equal(persisted.questId, "quest-1");
  assert.equal(persisted.mentorId, "algorithms-coach");
  assert.deepEqual(persisted.promptVersions, ["mentors.algorithms-coach.v1", "lessons.runtime.v1"]);
  assert.equal(persisted.summary, "Learner practiced nested-loop runtime analysis and answered the Socratic check.");
  assert.match(persisted.learnerVisibleRecap, /O\(n\^2\)/);
  assert.equal(persisted.finalStage, "ended");
  assert.equal(persisted.messages.length, 2);
  assert.deepEqual(persisted.messages.map((message: PersistedLessonMessage) => message.role), ["mentor", "learner"]);
  assert.deepEqual(await repo.getById("user-1", persisted.id), persisted);
});

test("lesson session persistence rejects unfinished sessions", async () => {
  const repo = new InMemoryLessonSessionsRepository();
  const service = new LessonRuntimeService({ sessionsRepo: repo });
  const session = service.startLesson({ userId: "user-1", questId: "quest-1", objective: "Explain BFS" });

  await assert.rejects(
    () => service.persistCompletedSession(session, {
      mentorId: "algorithms-coach",
      promptVersions: ["lessons.runtime.v1"],
      summary: "Too early.",
      learnerVisibleRecap: "Too early.",
    }),
    /ended stage/i,
  );
  assert.deepEqual(await repo.listByQuest("user-1", "quest-1"), []);
});

test("lesson summary records are queryable by quest", async () => {
  const repo = new InMemoryLessonSessionsRepository();
  const service = new LessonRuntimeService({ sessionsRepo: repo });

  const first = await service.persistCompletedSession(completedLesson(), {
    mentorId: "algorithms-coach",
    promptVersions: ["lessons.runtime.v1"],
    summary: "First pass summary.",
    learnerVisibleRecap: "First learner recap.",
  });
  const second = await service.persistCompletedSession(completedLesson(), {
    mentorId: "algorithms-coach",
    promptVersions: ["lessons.runtime.v2"],
    summary: "Second pass summary.",
    learnerVisibleRecap: "Second learner recap.",
  });

  const summaries = await repo.listSummariesByQuest("user-1", "quest-1");
  assert.deepEqual(summaries.map((summary: LessonSessionSummary) => summary.id), [first.id, second.id]);
  assert.deepEqual(summaries.map((summary: LessonSessionSummary) => summary.learnerVisibleRecap), [
    "First learner recap.",
    "Second learner recap.",
  ]);
});
