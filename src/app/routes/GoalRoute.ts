import { GoalService } from "../../features/goals/goalService.ts";
import type { LearningGoal } from "../../features/goals/goalTypes.ts";
import type { AIGateway } from "../../lib/ai/aiGateway.ts";
import { goalsRepo, type GoalsRepository } from "../../lib/db/repositories/goalsRepo.ts";

export type GoalIntakeFormData = {
  goal?: string;
  refineWithAI?: string;
};

export type SubmitGoalIntakeRouteInput = {
  userId: string;
  formData: GoalIntakeFormData;
  goalsRepo?: GoalsRepository;
  aiGateway?: Pick<AIGateway, "generateText">;
};

export type GoalIntakeRouteResult =
  | {
      ok: true;
      goal: LearningGoal;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    };

export function renderGoalIntakeRoute(): string {
  return `
    <main data-route="goal-intake" class="goal-intake-route">
      <h1>Start a learning goal</h1>
      <p>Enter a learning goal, class need, curiosity, or exam target.</p>
      <form method="post" action="/goals/new">
        <label for="goal">Learning goal, class need, curiosity, or exam target</label>
        <textarea id="goal" name="goal" required rows="6" placeholder="Example: Prepare for CSCI 3104 algorithms this summer"></textarea>
        <label>
          <input type="checkbox" name="refineWithAI" checked />
          Refine this goal with the AI gateway before saving
        </label>
        <button type="submit">Save goal</button>
      </form>
    </main>
  `.trim();
}

export async function submitGoalIntakeRoute(input: SubmitGoalIntakeRouteInput): Promise<GoalIntakeRouteResult> {
  try {
    const service = new GoalService({
      goalsRepo: input.goalsRepo ?? goalsRepo,
      aiGateway: input.aiGateway,
    });

    const goal = await service.createFromIntake({
      userId: input.userId,
      goal: input.formData.goal ?? "",
      refineWithAI: input.formData.refineWithAI === "on",
    });

    return {
      ok: true,
      goal,
      redirectTo: `/goals/${goal.id}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown goal intake error",
    };
  }
}
