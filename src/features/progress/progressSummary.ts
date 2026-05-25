import type { QuestStatus } from "../quests/questStateMachine.ts";

export type ProgressQuestRecord = {
  id: string;
  status: QuestStatus;
  updatedAt?: string | null;
};

export type LearnerProgressSummary = {
  activeQuests: number;
  completedQuests: number;
  questsNeedingReview: number;
  practiceDueQuests: number;
  lastQuestUpdateAt: string | null;
};

export function buildLearnerProgressSummary(quests: readonly ProgressQuestRecord[]): LearnerProgressSummary {
  return {
    activeQuests: quests.filter((quest) => quest.status === "active").length,
    completedQuests: quests.filter((quest) => quest.status === "completed").length,
    questsNeedingReview: quests.filter((quest) => quest.status === "needs_review").length,
    practiceDueQuests: quests.filter((quest) => quest.status === "practice_due").length,
    lastQuestUpdateAt: latestTimestamp(quests.map((quest) => quest.updatedAt)),
  };
}

function latestTimestamp(timestamps: readonly (string | null | undefined)[]): string | null {
  const sorted = timestamps
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort((left, right) => left.localeCompare(right));

  return sorted.at(-1) ?? null;
}
