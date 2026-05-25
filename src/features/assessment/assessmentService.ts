import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import type { AssessmentsRepository } from "../../lib/db/repositories/assessmentsRepo.ts";
import { validationSchemas } from "../../lib/validation/schemas.ts";
import type { LessonSessionSummary } from "../lessons/lessonTypes.ts";
import type { Quest } from "../quests/questTypes.ts";
import type { QuizAssessment, QuizGenerationOutput, QuizQuestion } from "./assessmentTypes.ts";

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

export const assessmentService = AssessmentService;
