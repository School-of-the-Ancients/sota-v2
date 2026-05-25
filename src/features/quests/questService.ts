import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import type { QuestSeed } from "../curriculum/curriculumTypes.ts";
import type { LearningGoal } from "../goals/goalTypes.ts";
import { validationSchemas } from "../../lib/validation/schemas.ts";
import type { QuestsRepository } from "../../lib/db/repositories/questsRepo.ts";
import type { Quest, QuestGenerationItem, QuestGenerationOutput } from "./questTypes.ts";

export type QuestServiceOptions = {
  questsRepo: QuestsRepository;
  aiGateway: Pick<AIGateway, "generateText">;
};

export type GenerateQuestFromGoalInput = {
  userId: string;
  goal: LearningGoal;
};

export type GenerateQuestFromCurriculumSeedInput = {
  userId: string;
  seed: QuestSeed;
};

export class QuestService {
  private readonly questsRepo: QuestsRepository;
  private readonly aiGateway: Pick<AIGateway, "generateText">;

  constructor(options: QuestServiceOptions) {
    this.questsRepo = options.questsRepo;
    this.aiGateway = options.aiGateway;
  }

  async generateFromGoal(input: GenerateQuestFromGoalInput): Promise<Quest[]> {
    const generated = await this.aiGateway.generateText<QuestGenerationOutput>({
      task: "quest_generation",
      promptVersion: "quests.generate-from-goal.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.questGeneration,
      sourceIds: [input.goal.id],
      messages: [
        {
          role: "system",
          content:
            "Generate focused learning quests for a saved goal. Each quest must include prerequisite notes, a lesson plan, practice tasks, and mastery criteria.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.goal.title,
            description: input.goal.description,
            desiredOutcome: input.goal.desiredOutcome,
            currentLevel: input.goal.currentLevel,
            successCriteria: input.goal.successCriteria,
          }),
        },
      ],
      metadata: {
        goalId: input.goal.id,
      },
    });

    return this.persistGeneratedQuests({
      userId: input.userId,
      goalId: input.goal.id,
      generated: generated.data,
    });
  }

  async generateFromCurriculumSeed(input: GenerateQuestFromCurriculumSeedInput): Promise<Quest[]> {
    const generated = await this.aiGateway.generateText<QuestGenerationOutput>({
      task: "quest_generation",
      promptVersion: "quests.generate-from-curriculum.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.questGeneration,
      sourceIds: [input.seed.goalId, input.seed.curriculumId],
      messages: [
        {
          role: "system",
          content:
            "Generate a focused learning quest from a curriculum day seed. Preserve the objective and turn it into a lesson plan, practice tasks, and mastery criteria.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.seed.title,
            objective: input.seed.objective,
            focusPoints: input.seed.focusPoints,
            practiceTasks: input.seed.practiceTasks,
            masteryCriteria: input.seed.masteryCriteria,
          }),
        },
      ],
      metadata: {
        goalId: input.seed.goalId,
        curriculumId: input.seed.curriculumId,
      },
    });

    return this.persistGeneratedQuests({
      userId: input.userId,
      goalId: input.seed.goalId,
      curriculumId: input.seed.curriculumId,
      generated: generated.data,
    });
  }

  private async persistGeneratedQuests(input: {
    userId: string;
    goalId: string;
    curriculumId?: string;
    generated: QuestGenerationOutput;
  }): Promise<Quest[]> {
    assertGeneratedQuests(input.generated);

    const quests: Quest[] = [];
    for (const generatedQuest of input.generated.quests) {
      quests.push(
        await this.questsRepo.create({
          userId: input.userId,
          goalId: input.goalId,
          curriculumId: input.curriculumId,
          title: generatedQuest.title,
          objective: generatedQuest.objective,
          prerequisiteNotes: generatedQuest.prerequisite_notes ?? [],
          lessonPlan: generatedQuest.lesson_plan,
          focusPoints: generatedQuest.focus_points,
          practiceTasks: generatedQuest.practice_tasks,
          masteryCriteria: generatedQuest.mastery_criteria,
          status: "draft",
        }),
      );
    }

    return quests;
  }
}

function assertGeneratedQuests(generated: QuestGenerationOutput): void {
  if (!Array.isArray(generated.quests) || generated.quests.length === 0) {
    throw new Error("Quest generation must return at least one quest");
  }

  generated.quests.forEach((quest, index) => assertGeneratedQuest(quest, index));
}

function assertGeneratedQuest(quest: QuestGenerationItem, index: number): void {
  const label = `Generated quest ${index + 1}`;
  if (!quest.title?.trim()) {
    throw new Error(`${label} must include a title`);
  }
  if (!quest.objective?.trim()) {
    throw new Error(`${label} must include an objective`);
  }
  if (!Array.isArray(quest.lesson_plan) || quest.lesson_plan.length === 0) {
    throw new Error(`${label} must include a lesson plan`);
  }
  if (!Array.isArray(quest.focus_points) || quest.focus_points.length === 0) {
    throw new Error(`${label} must include focus points`);
  }
  if (!Array.isArray(quest.practice_tasks) || quest.practice_tasks.length === 0) {
    throw new Error(`${label} must include practice tasks`);
  }
  if (!Array.isArray(quest.mastery_criteria) || quest.mastery_criteria.length === 0) {
    throw new Error(`${label} must include mastery criteria`);
  }
}

export const questService = QuestService;
