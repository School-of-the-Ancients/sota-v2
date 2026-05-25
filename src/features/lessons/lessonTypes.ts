import type { LessonStage } from "./lessonStateMachine.ts";

export type { LessonStage } from "./lessonStateMachine.ts";

export type LessonRuntimeAction =
  | "advance"
  | "ask_more_explanation"
  | "ask_example"
  | "submit_practice"
  | "answer_socratic_check"
  | "finish";

export type LessonRuntimeEvent =
  | {
      type: "stage_started";
      stage: LessonStage;
      at: string;
    }
  | {
      type: "learner_requested_more_explanation";
      stage: LessonStage;
      message?: string;
      at: string;
    }
  | {
      type: "learner_requested_example";
      stage: LessonStage;
      message?: string;
      at: string;
    }
  | {
      type: "practice_submitted";
      stage: LessonStage;
      response?: string;
      at: string;
    }
  | {
      type: "socratic_answer_submitted";
      stage: LessonStage;
      response?: string;
      at: string;
    };

export type LessonRuntimeSession = {
  id: string;
  userId: string;
  questId: string;
  objective: string;
  stage: LessonStage;
  stageLabel: string;
  visibleToLearner: string;
  availableActions: LessonRuntimeAction[];
  history: LessonRuntimeEvent[];
  createdAt: string;
  updatedAt: string;
};

export type StartLessonInput = {
  userId: string;
  questId: string;
  objective: string;
};
