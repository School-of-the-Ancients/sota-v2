import type {
  LearnerQuizAnswer,
  QuizAssessment,
  QuizAssessmentStatus,
  QuizGradeResult,
  QuizGradeStatus,
  QuizQuestion,
  QuizQuestionGradingResult,
  ReviewPathStatus,
  ReviewPracticeStep,
  TargetedReviewPath,
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

export type TargetedReviewPathCreateInput = {
  userId: string;
  questId: string;
  quizId: string;
  assessmentResultId: string;
  status: ReviewPathStatus;
  title: string;
  summary: string;
  missedConcepts: string[];
  practiceSteps: ReviewPracticeStep[];
  nextAction: string;
  promptVersion: string;
  generatedByPromptRunId?: string;
};

export type AssessmentsRepository = {
  createQuiz(input: QuizAssessmentCreateInput): Promise<QuizAssessment>;
  listQuizzesByQuest(userId: string, questId: string): Promise<QuizAssessment[]>;
  getActiveQuizByQuest(userId: string, questId: string): Promise<QuizAssessment | null>;
  getQuizById(userId: string, quizId: string): Promise<QuizAssessment | null>;
  archiveActiveQuizzesByQuest(userId: string, questId: string): Promise<void>;
  createGradeResult(input: QuizGradeResultCreateInput): Promise<QuizGradeResult>;
  listGradeResultsByQuiz(userId: string, quizId: string): Promise<QuizGradeResult[]>;
  listGradeResultsByQuest(userId: string, questId: string): Promise<QuizGradeResult[]>;
  deleteGradeResultsByQuest(userId: string, questId: string): Promise<void>;
  getGradeResultById(userId: string, assessmentResultId: string): Promise<QuizGradeResult | null>;
  createReviewPath(input: TargetedReviewPathCreateInput): Promise<TargetedReviewPath>;
  listReviewPathsByQuest(userId: string, questId: string): Promise<TargetedReviewPath[]>;
  supersedeReviewPathsByQuest(userId: string, questId: string): Promise<void>;
};

export class InMemoryAssessmentsRepository implements AssessmentsRepository {
  private readonly quizzes = new Map<string, QuizAssessment>();
  private readonly gradeResults = new Map<string, QuizGradeResult>();
  private readonly reviewPaths = new Map<string, TargetedReviewPath>();

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

  async listGradeResultsByQuest(userId: string, questId: string): Promise<QuizGradeResult[]> {
    return [...this.gradeResults.values()].filter((result) => result.userId === userId && result.questId === questId);
  }

  async deleteGradeResultsByQuest(userId: string, questId: string): Promise<void> {
    for (const result of await this.listGradeResultsByQuest(userId, questId)) {
      this.gradeResults.delete(result.id);
    }
  }

  async getGradeResultById(userId: string, assessmentResultId: string): Promise<QuizGradeResult | null> {
    const result = this.gradeResults.get(assessmentResultId) ?? null;
    return result?.userId === userId ? result : null;
  }

  async createReviewPath(input: TargetedReviewPathCreateInput): Promise<TargetedReviewPath> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `review-${this.reviewPaths.size + 1}`;
    const record: TargetedReviewPath = {
      id,
      userId: input.userId,
      questId: input.questId,
      quizId: input.quizId,
      assessmentResultId: input.assessmentResultId,
      status: input.status,
      title: input.title,
      summary: input.summary,
      missedConcepts: [...input.missedConcepts],
      practiceSteps: input.practiceSteps.map((step) => ({ ...step })),
      nextAction: input.nextAction,
      promptVersion: input.promptVersion,
      generatedByPromptRunId: input.generatedByPromptRunId,
      createdAt: now,
      updatedAt: now,
    };
    this.reviewPaths.set(id, record);
    return record;
  }

  async listReviewPathsByQuest(userId: string, questId: string): Promise<TargetedReviewPath[]> {
    return [...this.reviewPaths.values()].filter((review) => review.userId === userId && review.questId === questId);
  }

  async supersedeReviewPathsByQuest(userId: string, questId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const review of await this.listReviewPathsByQuest(userId, questId)) {
      if (review.status === "active" || review.status === "fallback") {
        const updated: TargetedReviewPath = { ...review, status: "superseded", updatedAt: now };
        this.reviewPaths.set(review.id, updated);
        Object.assign(review, updated);
      }
    }
  }
}

export const assessmentsRepo = new InMemoryAssessmentsRepository();
