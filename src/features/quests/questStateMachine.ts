export const questStates = ["draft", "active", "lesson_in_progress", "practice_due", "quiz_ready", "needs_review", "completed", "archived"] as const;

export type QuestStatus = (typeof questStates)[number];

export type QuestTransitionContext = {
  hasPassedAssessment?: boolean;
  hasManualOverride?: boolean;
  assessmentPassed?: boolean;
};

const questTransitionRules: Record<QuestStatus, readonly QuestStatus[]> = {
  draft: ["active", "archived"],
  active: ["lesson_in_progress", "paused" as QuestStatus, "archived"].filter((state): state is QuestStatus => questStates.includes(state)),
  lesson_in_progress: ["practice_due", "quiz_ready", "needs_review", "archived"],
  practice_due: ["lesson_in_progress", "quiz_ready", "needs_review", "archived"],
  quiz_ready: ["needs_review", "completed", "archived"],
  needs_review: ["lesson_in_progress", "practice_due", "quiz_ready", "archived"],
  completed: ["archived"],
  archived: [],
};

export function canTransitionQuest(from: QuestStatus, to: QuestStatus, context: QuestTransitionContext = {}): boolean {
  if (!questTransitionRules[from]?.includes(to)) {
    return false;
  }

  if (from === "quiz_ready" && to === "completed") {
    return context.assessmentPassed === true || context.hasPassedAssessment === true || context.hasManualOverride === true;
  }

  if (from === "quiz_ready" && to === "needs_review") {
    return context.assessmentPassed === false;
  }

  return true;
}

export function transitionQuest(from: QuestStatus, to: QuestStatus, context: QuestTransitionContext = {}): QuestStatus {
  if (!canTransitionQuest(from, to, context)) {
    if (to === "completed") {
      throw new Error("Quest completion requires a passed assessment or manual override");
    }

    throw new Error(`Invalid quest transition: ${from} -> ${to}`);
  }

  return to;
}
