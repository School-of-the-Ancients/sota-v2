import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import type { AssessmentsRepository } from "../../lib/db/repositories/assessmentsRepo.ts";
import { validationSchemas } from "../../lib/validation/schemas.ts";
import type { LessonSessionSummary } from "../lessons/lessonTypes.ts";
import type { Quest } from "../quests/questTypes.ts";
import type {
  LearnerQuizAnswer,
  QuizAssessment,
  QuizGradeResult,
  QuizGradingOutput,
  QuizQuestion,
  QuizQuestionGradingResult,
  QuizGenerationOutput,
} from "./assessmentTypes.ts";

export type AssessmentServiceOptions = {
  assessmentsRepo: AssessmentsRepository;
  aiGateway: Pick<AIGateway, "generateText">;
};

export type GenerateQuizForQuestInput = {
  userId: string;
  quest: Quest;
  lessonSummaries?: LessonSessionSummary[];
  regenerate?: boolean;
};

export type GradeQuizSubmissionInput = {
  userId: string;
  quizId: string;
  learnerAnswers: LearnerQuizAnswer[];
  minimumConfidence?: number;
};

export class AssessmentService {
  private readonly assessmentsRepo: AssessmentsRepository;
  private readonly aiGateway: Pick<AIGateway, "generateText">;

  constructor(options: AssessmentServiceOptions) {
    this.assessmentsRepo = options.assessmentsRepo;
    this.aiGateway = options.aiGateway;
  }

  async generateQuizForQuest(input: GenerateQuizForQuestInput): Promise<QuizAssessment> {
    assertQuizReadyQuest(input.quest);

    if (!input.regenerate) {
      const existing = await this.assessmentsRepo.getActiveQuizByQuest(input.userId, input.quest.id);
      if (existing) {
        return existing;
      }
    }

    if (input.regenerate) {
      await this.assessmentsRepo.archiveActiveQuizzesByQuest(input.userId, input.quest.id);
    }

    const lessonSummaries = input.lessonSummaries ?? [];
    const sourceIds = [input.quest.id, ...lessonSummaries.map((summary) => summary.id)];
    const response = await this.aiGateway.generateText<QuizGenerationOutput>({
      task: "assessment_generation",
      promptVersion: "assessment.quiz-generation.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.quizGeneration,
      sourceIds,
      messages: [
        {
          role: "system",
          content:
            "Generate a learner-visible mastery quiz for a quest. Return structured JSON with questions aligned to the quest objective and mastery criteria. Include expected answers and rubric bullets for later grading.",
        },
        {
          role: "user",
          content: JSON.stringify({
            quest: {
              id: input.quest.id,
              title: input.quest.title,
              objective: input.quest.objective,
              focusPoints: input.quest.focusPoints,
              practiceTasks: input.quest.practiceTasks,
              masteryCriteria: input.quest.masteryCriteria,
            },
            lessonSummaries: lessonSummaries.map((summary) => ({
              id: summary.id,
              mentorId: summary.mentorId,
              summary: summary.summary,
              learnerVisibleRecap: summary.learnerVisibleRecap,
              promptVersions: summary.promptVersions,
            })),
          }),
        },
      ],
      metadata: {
        questId: input.quest.id,
        goalId: input.quest.goalId,
        curriculumId: input.quest.curriculumId,
        lessonSessionIds: lessonSummaries.map((summary) => summary.id),
      },
    });

    assertGeneratedQuiz(response.data);
    return this.assessmentsRepo.createQuiz({
      userId: input.userId,
      questId: input.quest.id,
      title: response.data.title,
      instructions: response.data.instructions,
      questions: response.data.questions.map((question, index) => ({
        id: question.id?.trim() || `q${index + 1}`,
        prompt: question.prompt,
        kind: question.kind,
        objectiveRefs: question.objective_refs,
        expectedAnswer: question.expected_answer,
        rubric: question.rubric,
        choices: question.choices,
      } satisfies QuizQuestion)),
      sourceLessonSessionIds: lessonSummaries.map((summary) => summary.id),
      promptVersion: response.promptVersion,
      generatedByPromptRunId: response.promptRunId,
      status: "active",
    });
  }

  async gradeQuizSubmission(input: GradeQuizSubmissionInput): Promise<QuizGradeResult> {
    const quiz = await this.assessmentsRepo.getQuizById(input.userId, input.quizId);
    if (!quiz) {
      throw new Error(`Quiz not found for grading: ${input.quizId}`);
    }
    assertLearnerAnswersCoverQuiz(input.learnerAnswers, quiz);

    const response = await this.aiGateway.generateText<QuizGradingOutput>({
      task: "assessment_grading",
      promptVersion: "assessment.short-answer-grading.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.quizGrading,
      sourceIds: [quiz.id, quiz.questId],
      messages: [
        {
          role: "system",
          content:
            "Grade learner short-answer quiz responses against the saved quiz rubric. Return learner-visible feedback with correct points, missing points, misconception tags, confidence, and one concrete improvement step. Do not mark low-confidence grading as mastery.",
        },
        {
          role: "user",
          content: JSON.stringify({
            quiz: {
              id: quiz.id,
              questId: quiz.questId,
              title: quiz.title,
              instructions: quiz.instructions,
              questions: quiz.questions.map((question) => ({
                id: question.id,
                prompt: question.prompt,
                kind: question.kind,
                objectiveRefs: question.objectiveRefs,
                expectedAnswer: question.expectedAnswer,
                rubric: question.rubric,
                choices: question.choices,
              })),
            },
            learnerAnswers: input.learnerAnswers,
          }),
        },
      ],
      metadata: {
        quizId: quiz.id,
        questId: quiz.questId,
        questionCount: quiz.questions.length,
      },
    });

    assertGeneratedGrade(response.data, quiz);
    const minimumConfidence = input.minimumConfidence ?? 0.7;
    const lowConfidence = response.data.confidence < minimumConfidence;
    const status = lowConfidence ? "manual_review" : "graded";
    const passed = lowConfidence ? false : response.data.passed;

    return this.assessmentsRepo.createGradeResult({
      userId: input.userId,
      questId: quiz.questId,
      quizId: quiz.id,
      status,
      learnerAnswers: input.learnerAnswers,
      overallScore: response.data.overall_score,
      passed,
      confidence: response.data.confidence,
      learnerSummary: response.data.learner_summary,
      improvementStep: response.data.improvement_step,
      misconceptionTags: response.data.misconception_tags,
      questionResults: response.data.question_results.map((result) => ({
        questionId: result.question_id,
        score: result.score,
        passed: result.passed,
        correct: result.correct,
        missing: result.missing,
        feedback: result.feedback,
        improvementStep: result.improvement_step,
        rubricHits: result.rubric_hits,
        misconceptionTags: result.misconception_tags,
      } satisfies QuizQuestionGradingResult)),
      promptVersion: response.promptVersion,
      gradedByPromptRunId: response.promptRunId,
      manualReviewReason: lowConfidence
        ? `Low confidence grading output: ${response.data.confidence} below ${minimumConfidence}`
        : undefined,
    });
  }
}

function assertQuizReadyQuest(quest: Quest): void {
  if (!quest.objective?.trim()) {
    throw new Error("Cannot generate a quiz for a quest without an objective");
  }
  if (!Array.isArray(quest.masteryCriteria) || quest.masteryCriteria.length === 0) {
    throw new Error("Cannot generate a quiz for a quest without mastery criteria");
  }
}

function assertGeneratedQuiz(generated: QuizGenerationOutput): void {
  if (!generated.title?.trim()) {
    throw new Error("Generated quiz must include a title");
  }
  if (!generated.instructions?.trim()) {
    throw new Error("Generated quiz must include instructions");
  }
  if (!Array.isArray(generated.questions) || generated.questions.length === 0) {
    throw new Error("Generated quiz must include at least one question");
  }

  generated.questions.forEach((question, index) => {
    const label = `Generated quiz question ${index + 1}`;
    if (!question.prompt?.trim()) {
      throw new Error(`${label} must include a prompt`);
    }
    if (!question.kind) {
      throw new Error(`${label} must include a kind`);
    }
    if (!Array.isArray(question.objective_refs) || question.objective_refs.length === 0) {
      throw new Error(`${label} must reference at least one objective or mastery criterion`);
    }
    if (!question.expected_answer?.trim()) {
      throw new Error(`${label} must include an expected answer`);
    }
    if (!Array.isArray(question.rubric) || question.rubric.length === 0) {
      throw new Error(`${label} must include a rubric`);
    }
  });
}

function assertLearnerAnswersCoverQuiz(learnerAnswers: LearnerQuizAnswer[], quiz: QuizAssessment): void {
  const answerMap = new Map(learnerAnswers.map((answer) => [answer.questionId, answer.answer]));
  const missing = quiz.questions.filter((question) => !answerMap.get(question.id)?.trim());
  if (missing.length > 0) {
    throw new Error(`Cannot grade quiz without learner answers for questions: ${missing.map((question) => question.id).join(", ")}`);
  }
}

function assertGeneratedGrade(generated: QuizGradingOutput, quiz: QuizAssessment): void {
  assertScore("Overall score", generated.overall_score);
  assertScore("Confidence", generated.confidence);
  if (typeof generated.passed !== "boolean") {
    throw new Error("Generated grade must include a passed boolean");
  }
  if (!generated.learner_summary?.trim()) {
    throw new Error("Generated grade must include a learner summary");
  }
  if (!generated.improvement_step?.trim()) {
    throw new Error("Generated grade must include an improvement step");
  }
  if (!Array.isArray(generated.misconception_tags)) {
    throw new Error("Generated grade must include misconception tags");
  }
  if (!Array.isArray(generated.question_results) || generated.question_results.length !== quiz.questions.length) {
    throw new Error("Generated grade must include one question result for each quiz question");
  }

  const expectedQuestionIds = new Set(quiz.questions.map((question) => question.id));
  const seenQuestionIds = new Set<string>();
  generated.question_results.forEach((result, index) => {
    const label = `Generated grade question result ${index + 1}`;
    if (!expectedQuestionIds.has(result.question_id)) {
      throw new Error(`${label} references unknown question id: ${result.question_id}`);
    }
    if (seenQuestionIds.has(result.question_id)) {
      throw new Error(`${label} duplicates question id: ${result.question_id}`);
    }
    seenQuestionIds.add(result.question_id);
    assertScore(`${label} score`, result.score);
    if (typeof result.passed !== "boolean") {
      throw new Error(`${label} must include a passed boolean`);
    }
    if (!result.feedback?.trim()) {
      throw new Error(`${label} must include learner-visible feedback`);
    }
    if (!result.improvement_step?.trim()) {
      throw new Error(`${label} must include an improvement step`);
    }
    if (!Array.isArray(result.rubric_hits)) {
      throw new Error(`${label} must include rubric hits`);
    }
    if (!Array.isArray(result.misconception_tags)) {
      throw new Error(`${label} must include misconception tags`);
    }
  });
}

function assertScore(label: string, value: number): void {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a number between 0 and 1`);
  }
}

export const assessmentService = AssessmentService;
