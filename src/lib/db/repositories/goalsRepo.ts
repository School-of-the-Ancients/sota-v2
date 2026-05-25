import type { LearningGoal, LearningGoalLevel, LearningGoalStatus } from "../../../features/goals/goalTypes.ts";

export type GoalCreateInput = {
  userId: string;
  title: string;
  description?: string;
  desiredOutcome?: string;
  currentLevel?: LearningGoalLevel;
  timeBudgetMinutesPerDay?: number;
  deadline?: string;
  constraints?: unknown[];
  successCriteria?: string[];
  status?: LearningGoalStatus;
  source?: string;
};

export type GoalsRepository = {
  create(input: GoalCreateInput): Promise<LearningGoal>;
  listByUser(userId: string): Promise<LearningGoal[]>;
  getById(userId: string, id: string): Promise<LearningGoal | null>;
};

export class InMemoryGoalsRepository implements GoalsRepository {
  private readonly records = new Map<string, LearningGoal>();

  async create(input: GoalCreateInput): Promise<LearningGoal> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `goal-${this.records.size + 1}`;
    const record: LearningGoal = {
      id,
      userId: input.userId,
      title: input.title,
      description: input.description,
      desiredOutcome: input.desiredOutcome,
      currentLevel: input.currentLevel ?? "unknown",
      timeBudgetMinutesPerDay: input.timeBudgetMinutesPerDay,
      deadline: input.deadline,
      constraints: input.constraints ?? [],
      successCriteria: input.successCriteria ?? [],
      status: input.status ?? "active",
      source: input.source ?? "learner",
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(id, record);
    return record;
  }

  async listByUser(userId: string): Promise<LearningGoal[]> {
    return [...this.records.values()].filter((goal) => goal.userId === userId);
  }

  async getById(userId: string, id: string): Promise<LearningGoal | null> {
    const goal = this.records.get(id);
    return goal?.userId === userId ? goal : null;
  }
}

export const goalsRepo = new InMemoryGoalsRepository();
