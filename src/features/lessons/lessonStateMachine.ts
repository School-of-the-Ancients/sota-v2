export const lessonStages = ["not_started", "explain", "example", "guided_practice", "socratic_check", "recap", "ended"] as const;

export type LessonStage = (typeof lessonStages)[number];

const lessonStageOrder: Record<LessonStage, LessonStage | null> = {
  not_started: "explain",
  explain: "example",
  example: "guided_practice",
  guided_practice: "socratic_check",
  socratic_check: "recap",
  recap: "ended",
  ended: null,
};

export function nextLessonStage(stage: LessonStage): LessonStage {
  const next = lessonStageOrder[stage];
  if (!next) {
    throw new Error("Ended lesson stage is terminal");
  }

  return next;
}

export function canAdvanceLessonStage(from: LessonStage, to: LessonStage): boolean {
  return lessonStageOrder[from] === to;
}

export function transitionLessonStage(from: LessonStage, to: LessonStage): LessonStage {
  if (!canAdvanceLessonStage(from, to)) {
    throw new Error(`Invalid lesson stage transition: ${from} -> ${to}`);
  }

  return to;
}
