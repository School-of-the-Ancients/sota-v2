import { nextLessonStage, transitionLessonStage } from "./lessonStateMachine.ts";
import { sessionsRepo } from "../../lib/db/repositories/sessionsRepo.ts";
import type { LessonSessionsRepository } from "../../lib/db/repositories/sessionsRepo.ts";
import type {
  LessonMessageRole,
  LessonStage,
  LessonRuntimeAction,
  LessonRuntimeEvent,
  LessonRuntimeSession,
  PersistCompletedLessonInput,
  PersistedLessonMessage,
  PersistedLessonSession,
  StartLessonInput,
} from "./lessonTypes.ts";

const stageLabels: Record<LessonStage, string> = {
  not_started: "Not started",
  explain: "Explain",
  example: "Example",
  guided_practice: "Guided practice",
  socratic_check: "Socratic check",
  recap: "Recap",
  ended: "Ended",
};

const stageActions: Record<LessonStage, LessonRuntimeAction[]> = {
  not_started: ["advance"],
  explain: ["ask_more_explanation", "ask_example", "advance"],
  example: ["ask_more_explanation", "advance"],
  guided_practice: ["submit_practice", "ask_more_explanation"],
  socratic_check: ["answer_socratic_check", "ask_more_explanation", "advance"],
  recap: ["finish"],
  ended: [],
};

export class LessonRuntimeService {
  private readonly sessionsRepo: LessonSessionsRepository;

  constructor(options: { sessionsRepo?: LessonSessionsRepository } = {}) {
    this.sessionsRepo = options.sessionsRepo ?? sessionsRepo;
  }

  startLesson(input: StartLessonInput): LessonRuntimeSession {
    const now = new Date().toISOString();
    return createSession({
      id: crypto.randomUUID?.() ?? `lesson-${input.questId}`,
      userId: input.userId,
      questId: input.questId,
      objective: input.objective,
      stage: "explain",
      history: [stageStarted("explain", now)],
      messages: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  recordLearnerAction(session: LessonRuntimeSession, action: LessonRuntimeAction, message?: string): LessonRuntimeSession {
    if (!session.availableActions.includes(action)) {
      throw new Error(`Action ${action} is not available during ${session.stage}`);
    }

    if (action === "ask_example") {
      return this.advanceTo(withEvent(session, learnerRequestedExample(session.stage, message)), "example");
    }

    if (action === "ask_more_explanation") {
      return withEvent(session, learnerRequestedMoreExplanation(session.stage, message));
    }

    if (action === "submit_practice") {
      return withEvent(session, practiceSubmitted(session.stage, message));
    }

    if (action === "answer_socratic_check") {
      return withEvent(session, socraticAnswerSubmitted(session.stage, message));
    }

    if (action === "finish" || action === "advance") {
      return this.advance(session);
    }

    return session;
  }

  advance(session: LessonRuntimeSession): LessonRuntimeSession {
    return this.advanceTo(session, nextLessonStage(session.stage));
  }

  advanceTo(session: LessonRuntimeSession, targetStage: LessonStage): LessonRuntimeSession {
    if (targetStage === "socratic_check" && session.stage !== "guided_practice") {
      throw new Error("Learner must complete guided practice before Socratic check");
    }

    const nextStage = transitionLessonStage(session.stage, targetStage);
    return updateStage(session, nextStage);
  }

  recordLessonMessage(
    session: LessonRuntimeSession,
    role: LessonMessageRole,
    content: string,
    metadata: { mentorId?: string; promptVersion?: string } = {},
  ): LessonRuntimeSession {
    const now = new Date().toISOString();
    const message: PersistedLessonMessage = {
      id: crypto.randomUUID?.() ?? `lesson-message-${session.messages.length + 1}`,
      role,
      content,
      stage: session.stage,
      mentorId: metadata.mentorId,
      promptVersion: metadata.promptVersion,
      createdAt: now,
    };

    const event = lessonMessageRecorded(session.stage, role, content, metadata, now);
    return {
      ...session,
      messages: [...session.messages, message],
      history: [...session.history, event],
      updatedAt: now,
    };
  }

  async persistCompletedSession(
    session: LessonRuntimeSession,
    input: PersistCompletedLessonInput,
  ): Promise<PersistedLessonSession> {
    if (session.stage !== "ended") {
      throw new Error("Lesson session must reach the ended stage before persistence");
    }

    return this.sessionsRepo.createCompleted({
      session,
      mentorId: input.mentorId,
      promptVersions: input.promptVersions,
      summary: input.summary,
      learnerVisibleRecap: input.learnerVisibleRecap,
    });
  }
}

function createSession(input: {
  id: string;
  userId: string;
  questId: string;
  objective: string;
  stage: LessonStage;
  history: LessonRuntimeEvent[];
  messages: PersistedLessonMessage[];
  createdAt: string;
  updatedAt: string;
}): LessonRuntimeSession {
  return {
    id: input.id,
    userId: input.userId,
    questId: input.questId,
    objective: input.objective,
    stage: input.stage,
    stageLabel: stageLabels[input.stage],
    visibleToLearner: visibleStageText(input.stage, input.objective),
    availableActions: stageActions[input.stage],
    history: input.history,
    messages: input.messages,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function updateStage(session: LessonRuntimeSession, stage: LessonStage): LessonRuntimeSession {
  const now = new Date().toISOString();
  return {
    ...session,
    stage,
    stageLabel: stageLabels[stage],
    visibleToLearner: visibleStageText(stage, session.objective),
    availableActions: stageActions[stage],
    history: [...session.history, stageStarted(stage, now)],
    updatedAt: now,
  };
}

function withEvent(session: LessonRuntimeSession, event: LessonRuntimeEvent): LessonRuntimeSession {
  return {
    ...session,
    history: [...session.history, event],
    updatedAt: event.at,
  };
}

function visibleStageText(stage: LessonStage, objective: string): string {
  switch (stage) {
    case "not_started":
      return "Lesson is ready to begin.";
    case "explain":
      return `Explain the core idea: ${objective}. Ask for more explanation if any term is unclear.`;
    case "example":
      return `Study an example for: ${objective}. Compare each step to the explanation.`;
    case "guided_practice":
      return `Try guided practice for: ${objective}. Submit an attempt before the Socratic check.`;
    case "socratic_check":
      return `Answer a short Socratic question about: ${objective}. Explain your reasoning.`;
    case "recap":
      return `Recap what you learned about: ${objective}. Note the next action before ending.`;
    case "ended":
      return "Lesson ended.";
  }
}

function stageStarted(stage: LessonStage, at: string): LessonRuntimeEvent {
  return { type: "stage_started", stage, at };
}

function lessonMessageRecorded(
  stage: LessonStage,
  role: LessonMessageRole,
  content: string,
  metadata: { mentorId?: string; promptVersion?: string },
  at: string,
): LessonRuntimeEvent {
  return {
    type: "lesson_message_recorded",
    stage,
    role,
    content,
    mentorId: metadata.mentorId,
    promptVersion: metadata.promptVersion,
    at,
  };
}

function learnerRequestedMoreExplanation(stage: LessonStage, message: string | undefined): LessonRuntimeEvent {
  return { type: "learner_requested_more_explanation", stage, message, at: new Date().toISOString() };
}

function learnerRequestedExample(stage: LessonStage, message: string | undefined): LessonRuntimeEvent {
  return { type: "learner_requested_example", stage, message, at: new Date().toISOString() };
}

function practiceSubmitted(stage: LessonStage, response: string | undefined): LessonRuntimeEvent {
  return { type: "practice_submitted", stage, response, at: new Date().toISOString() };
}

function socraticAnswerSubmitted(stage: LessonStage, response: string | undefined): LessonRuntimeEvent {
  return { type: "socratic_answer_submitted", stage, response, at: new Date().toISOString() };
}

export const lessonService = new LessonRuntimeService();
