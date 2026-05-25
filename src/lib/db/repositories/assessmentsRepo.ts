import type {
  LearnerQuizAnswer,
  QuizAssessment,
  QuizAssessmentStatus,
  QuizGradeResult,
  QuizGradeStatus,
  QuizQuestion,
  QuizQuestionGradingResult,
} from "../../../features/assessment/assessmentTypes.ts";

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

export type QuizGradeResultCreateInput = {
  userId: string;
  questId: string;
  quizId: string;
  status: QuizGradeStatus;
  learnerAnswers: LearnerQuizAnswer[];
  overallScore: number;
  passed: boolean;
  confidence: number;
  learnerSummary: string;
  improvementStep: string;
  misconceptionTags: string[];
  questionResults: QuizQuestionGradingResult[];
  promptVersion: string;
  gradedByPromptRunId?: string;
  manualReviewReason?: string;
};

export type AssessmentsRepository = {
  createQuiz(input: QuizAssessmentCreateInput): Promise<QuizAssessment>;
  listQuizzesByQuest(userId: string, questId: string): Promise<QuizAssessment[]>;
  getActiveQuizByQuest(userId: string, questId: string): Promise<QuizAssessment | null>;
  getQuizById(userId: string, quizId: string): Promise<QuizAssessment | null>;
  archiveActiveQuizzesByQuest(userId: string, questId: string): Promise<void>;
  createGradeResult(input: QuizGradeResultCreateInput): Promise<QuizGradeResult>;
  listGradeResultsByQuiz(userId: string, quizId: string): Promise<QuizGradeResult[]>;
};

export class InMemoryAssessmentsRepository implements AssessmentsRepository {
  private readonly quizzes = new Map<string, QuizAssessment>();
  private readonly gradeResults = new Map<string, QuizGradeResult>();

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

  async getQuizById(userId: string, quizId: string): Promise<QuizAssessment | null> {
    const quiz = this.quizzes.get(quizId) ?? null;
    return quiz?.userId === userId ? quiz : null;
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

  async createGradeResult(input: QuizGradeResultCreateInput): Promise<QuizGradeResult> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `grade-${this.gradeResults.size + 1}`;
    const record: QuizGradeResult = {
      id,
      userId: input.userId,
      questId: input.questId,
      quizId: input.quizId,
      status: input.status,
      learnerAnswers: input.learnerAnswers.map((answer) => ({ ...answer })),
      overallScore: input.overallScore,
      passed: input.passed,
      confidence: input.confidence,
      learnerSummary: input.learnerSummary,
      improvementStep: input.improvementStep,
      misconceptionTags: [...input.misconceptionTags],
      questionResults: input.questionResults.map((result) => ({
        ...result,
        rubricHits: [...result.rubricHits],
        misconceptionTags: [...result.misconceptionTags],
      })),
      promptVersion: input.promptVersion,
      gradedByPromptRunId: input.gradedByPromptRunId,
      manualReviewReason: input.manualReviewReason,
      createdAt: now,
      updatedAt: now,
    };

    this.gradeResults.set(id, record);
    return record;
  }

  async listGradeResultsByQuiz(userId: string, quizId: string): Promise<QuizGradeResult[]> {
    return [...this.gradeResults.values()].filter((result) => result.userId === userId && result.quizId === quizId);
  }
}

export const assessmentsRepo = new InMemoryAssessmentsRepository();
