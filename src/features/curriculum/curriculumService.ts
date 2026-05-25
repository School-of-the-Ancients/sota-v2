import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import type { CurriculaRepository } from "../../lib/db/repositories/curriculaRepo.ts";
import { validationSchemas } from "../../lib/validation/schemas.ts";
import type { LearningGoal } from "../goals/goalTypes.ts";
import type { Curriculum, OneWeekCurriculumOutput, QuestSeed } from "./curriculumTypes.ts";

export type CurriculumServiceOptions = {
  curriculaRepo: CurriculaRepository;
  aiGateway: Pick<AIGateway, "generateText">;
};

export type GenerateOneWeekCurriculumInput = {
  userId: string;
  goal: LearningGoal;
};

export type RegenerateOneWeekCurriculumInput = GenerateOneWeekCurriculumInput & {
  previousCurriculumId: string;
};

export class CurriculumService {
  private readonly curriculaRepo: CurriculaRepository;
  private readonly aiGateway: Pick<AIGateway, "generateText">;

  constructor(options: CurriculumServiceOptions) {
    this.curriculaRepo = options.curriculaRepo;
    this.aiGateway = options.aiGateway;
  }

  async generateOneWeekFromGoal(input: GenerateOneWeekCurriculumInput): Promise<Curriculum> {
    const generated = await this.generatePlan(input);
    return this.saveGeneratedPlan(input.userId, input.goal.id, generated);
  }

  async regenerateOneWeekFromGoal(input: RegenerateOneWeekCurriculumInput): Promise<Curriculum> {
    await this.curriculaRepo.updateStatus(input.userId, input.previousCurriculumId, "archived");
    return this.generateOneWeekFromGoal(input);
  }

  deriveQuestSeeds(curriculum: Curriculum): QuestSeed[] {
    return curriculum.plan.days.map((day) => ({
      goalId: curriculum.goalId,
      curriculumId: curriculum.id,
      title: day.title,
      objective: day.objective,
      focusPoints: day.focus_points,
      practiceTasks: day.practice_tasks,
      masteryCriteria: day.mastery_criteria,
    }));
  }

  private async generatePlan(input: GenerateOneWeekCurriculumInput): Promise<OneWeekCurriculumOutput> {
    const response = await this.aiGateway.generateText<OneWeekCurriculumOutput>({
      task: "curriculum_generation",
      promptVersion: "curriculum.one-week-curriculum.v1",
      userId: input.userId,
      jsonSchema: validationSchemas.oneWeekCurriculum,
      sourceIds: [input.goal.id],
      messages: [
        {
          role: "system",
          content: "Generate a practical one-week curriculum for the learner's saved goal. Return structured JSON with seven day-level plans that can become quests.",
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

    return response.data;
  }

  private async saveGeneratedPlan(userId: string, goalId: string, generated: OneWeekCurriculumOutput): Promise<Curriculum> {
    return this.curriculaRepo.create({
      userId,
      goalId,
      title: generated.title,
      description: generated.description,
      durationDays: generated.duration_days,
      weeklyRhythm: generated.weekly_rhythm,
      plan: {
        days: generated.days,
      },
      status: "draft",
    });
  }
}

export const curriculumService = CurriculumService;
