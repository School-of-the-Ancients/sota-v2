import test from "node:test";
import assert from "node:assert/strict";

import { buildLearnerProgressSummary } from "../src/features/progress/progressSummary.ts";

test("progress summary is recomputed from quest records", () => {
  const summary = buildLearnerProgressSummary([
    { id: "q1", status: "active", updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "q2", status: "completed", updatedAt: "2026-01-02T00:00:00.000Z" },
    { id: "q3", status: "needs_review", updatedAt: "2026-01-03T00:00:00.000Z" },
    { id: "q4", status: "practice_due", updatedAt: "2026-01-04T00:00:00.000Z" },
  ]);

  assert.deepEqual(summary, {
    activeQuests: 1,
    completedQuests: 1,
    questsNeedingReview: 1,
    practiceDueQuests: 1,
    lastQuestUpdateAt: "2026-01-04T00:00:00.000Z",
  });
});

test("progress summary changes when source quest records are removed", () => {
  const quests = [
    { id: "q1", status: "completed" as const, updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "q2", status: "completed" as const, updatedAt: "2026-01-02T00:00:00.000Z" },
  ];

  assert.equal(buildLearnerProgressSummary(quests).completedQuests, 2);
  assert.equal(buildLearnerProgressSummary(quests.slice(0, 1)).completedQuests, 1);
});
