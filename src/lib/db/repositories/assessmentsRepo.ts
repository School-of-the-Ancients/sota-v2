import type { QuizAssessment, QuizAssessmentStatus, QuizQuestion } from "../../../features/assessment/assessmentTypes.ts";

export type QuizAssessmentCreateInput = {
  userId: string;
  questId: string;
  title: string;
  instructions: string;
  questions: QuizQuestion[];
  sourceLessonSessionIds: string[];
  promptVersion: string;
  generatedByPromptRunId?: string;
  status?: QuizAssessmentStatus;
};

export type AssessmentsRepository = {
  createQuiz(input: QuizAssessmentCreateInput): Promise<QuizAssessment>;
  listQuizzesByQuest(userId: string, questId: string): Promise<QuizAssessment[]>;
  getActiveQuizByQuest(userId: string, questId: string): Promise<QuizAssessment | null>;
  archiveActiveQuizzesByQuest(userId: string, questId: string): Promise<void>;
};

export class InMemoryAssessmentsRepository implements AssessmentsRepository {
  private readonly quizzes = new Map<string, QuizAssessment>();

  async createQuiz(input: QuizAssessmentCreateInput): Promise<QuizAssessment> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `quiz-${this.quizzes.size + 1}`;
    const record: QuizAssessment = {
      id,
      userId: input.userId,
      questId: input.questId,
      type: "quiz",
      status: input.status ?? "active",
      title: input.title,
      instructions: input.instructions,
      questions: input.questions.map((question) => ({ ...question })),
      sourceLessonSessionIds: [...input.sourceLessonSessionIds],
      promptVersion: input.promptVersion,
      generatedByPromptRunId: input.generatedByPromptRunId,
      createdAt: now,
      updatedAt: now,
    };

    this.quizzes.set(id, record);
    return record;
  }

  async listQuizzesByQuest(userId: string, questId: string): Promise<QuizAssessment[]> {
    return [...this.quizzes.values()].filter((quiz) => quiz.userId === userId && quiz.questId === questId);
  }

  async getActiveQuizByQuest(userId: string, questId: string): Promise<QuizAssessment | null> {
    return (await this.listQuizzesByQuest(userId, questId)).find((quiz) => quiz.status === "active") ?? null;
  }

  async archiveActiveQuizzesByQuest(userId: string, questId: string): Promise<void> {
    const activeQuizzes = (await this.listQuizzesByQuest(userId, questId)).filter((quiz) => quiz.status === "active");
    const now = new Date().toISOString();
    for (const quiz of activeQuizzes) {
      const updated: QuizAssessment = {
        ...quiz,
        status: "archived",
        updatedAt: now,
      };
      this.quizzes.set(quiz.id, updated);
      Object.assign(quiz, updated);
    }
  }
}

export const assessmentsRepo = new InMemoryAssessmentsRepository();
