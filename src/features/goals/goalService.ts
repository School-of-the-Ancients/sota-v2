import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import type { GoalsRepository } from "../../lib/db/repositories/goalsRepo.ts";
import { validationSchemas } from "../../lib/validation/schemas.ts";
import type { GoalRefinementOutput, LearningGoal } from "./goalTypes.ts";

export type GoalServiceCreateInput = {
  userId: string;
  goal: string;
  refineWithAI?: boolean;
};

export type GoalServiceOptions = {
  goalsRepo: GoalsRepository;
  aiGateway?: Pick<AIGateway, "generateText">;
};

export class GoalService {
  private readonly goalsRepo: GoalsRepository;
  private readonly aiGateway?: Pick<AIGateway, "generateText">;

  constructor(options: GoalServiceOptions) {
    this.goalsRepo = options.goalsRepo;
    this.aiGateway = options.aiGateway;
  }

  async createFromIntake(input: GoalServiceCreateInput): Promise<LearningGoal> {
    const rawGoal = input.goal.trim();
    if (!rawGoal) {
      throw new Error("Goal is required");
    }

    const refined = input.refineWithAI ? await this.refineGoal(input.userId, rawGoal) : null;

    return this.goalsRepo.create({
      userId: input.userId,
      title: refined?.title ?? rawGoal,
      description: refined?.description ?? rawGoal,
      desiredOutcome: refined?.desired_outcome,
      currentLevel: refined?.current_level ?? "unknown",
      successCriteria: refined?.success_criteria ?? [],
      status: "active",
      source: refined ? "ai_refined_intake" : "learner",
    });
  }

  private async refineGoal(userId: string, rawGoal: string): Promise<GoalRefinementOutput> {
    if (!this.aiGateway) {
      throw new Error("Goal refinement requested without an AI gateway");
    }

    const response = await this.aiGateway.generateText<GoalRefinementOutput>({
      task: "goal_refinement",
      promptVersion: "goals.goal-refinement.v1",
      userId,
      jsonSchema: validationSchemas.learningGoal,
      messages: [
        {
          role: "system",
          content: "Refine a learner's raw goal into a clear title, desired outcome, level, and success criteria. Return validated JSON only.",
        },
        {
          role: "user",
          content: rawGoal,
        },
      ],
      metadata: {
        route: "/goals/new",
      },
    });

    return response.data;
  }
}

export const goalService = GoalService;
