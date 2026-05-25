import type { LessonStage } from "./lessonStateMachine.ts";

export type { LessonStage } from "./lessonStateMachine.ts";

export type LessonRuntimeAction =
  | "advance"
  | "ask_more_explanation"
  | "ask_example"
  | "submit_practice"
  | "answer_socratic_check"
  | "finish";

export type LessonMessageRole = "system" | "mentor" | "learner";

export type LessonRuntimeEvent =
  | {
      type: "stage_started";
      stage: LessonStage;
      at: string;
    }
  | {
      type: "lesson_message_recorded";
      stage: LessonStage;
      role: LessonMessageRole;
      content: string;
      mentorId?: string;
      promptVersion?: string;
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
  messages: PersistedLessonMessage[];
  createdAt: string;
  updatedAt: string;
};

export type StartLessonInput = {
  userId: string;
  questId: string;
  objective: string;
};

export type PersistedLessonMessage = {
  id: string;
  role: LessonMessageRole;
  content: string;
  stage: LessonStage;
  mentorId?: string;
  promptVersion?: string;
  createdAt: string;
};

export type PersistCompletedLessonInput = {
  mentorId: string;
  promptVersions: string[];
  summary: string;
  learnerVisibleRecap: string;
};

export type PersistedLessonSession = {
  id: string;
  userId: string;
  questId: string;
  objective: string;
  mentorId: string;
  promptVersions: string[];
  summary: string;
  learnerVisibleRecap: string;
  finalStage: LessonStage;
  messages: PersistedLessonMessage[];
  history: LessonRuntimeEvent[];
  createdAt: string;
  updatedAt: string;
};

export type LessonSessionSummary = {
  id: string;
  userId: string;
  questId: string;
  mentorId: string;
  promptVersions: string[];
  summary: string;
  learnerVisibleRecap: string;
  finalStage: LessonStage;
  createdAt: string;
};
