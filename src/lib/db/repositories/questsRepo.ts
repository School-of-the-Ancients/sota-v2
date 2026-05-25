import type { Quest, QuestMasteryEvidence } from "../../../features/quests/questTypes.ts";
import type { QuestStatus } from "../../../features/quests/questStateMachine.ts";

export type QuestCreateInput = {
  userId: string;
  goalId: string;
  curriculumId?: string;
  title: string;
  objective: string;
  prerequisiteNotes?: string[];
  lessonPlan: string[];
  focusPoints: string[];
  practiceTasks: string[];
  masteryCriteria: string[];
  status?: QuestStatus;
  generatedByPromptRunId?: string;
};

export type QuestsRepository = {
  create(input: QuestCreateInput): Promise<Quest>;
  listByGoal(userId: string, goalId: string): Promise<Quest[]>;
  getById(userId: string, id: string): Promise<Quest | null>;
  updateStatus(userId: string, id: string, status: QuestStatus): Promise<Quest>;
  updateMasteryState(userId: string, id: string, input: {
    status: QuestStatus;
    masteryEvidence?: QuestMasteryEvidence;
    nextAction?: string;
  }): Promise<Quest>;
};

export class InMemoryQuestsRepository implements QuestsRepository {
  private readonly records = new Map<string, Quest>();

  async create(input: QuestCreateInput): Promise<Quest> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `quest-${this.records.size + 1}`;
    const record: Quest = {
      id,
      userId: input.userId,
      goalId: input.goalId,
      curriculumId: input.curriculumId,
      title: input.title,
      objective: input.objective,
      prerequisiteNotes: input.prerequisiteNotes ?? [],
      lessonPlan: input.lessonPlan,
      focusPoints: input.focusPoints,
      practiceTasks: input.practiceTasks,
      masteryCriteria: input.masteryCriteria,
      status: input.status ?? "draft",
      generatedByPromptRunId: input.generatedByPromptRunId,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(id, record);
    return record;
  }

  async listByGoal(userId: string, goalId: string): Promise<Quest[]> {
    return [...this.records.values()].filter((quest) => quest.userId === userId && quest.goalId === goalId);
  }

  async getById(userId: string, id: string): Promise<Quest | null> {
    const quest = this.records.get(id);
    return quest?.userId === userId ? quest : null;
  }

  async updateStatus(userId: string, id: string, status: QuestStatus): Promise<Quest> {
    return this.updateMasteryState(userId, id, { status });
  }

  async updateMasteryState(userId: string, id: string, input: {
    status: QuestStatus;
    masteryEvidence?: QuestMasteryEvidence;
    nextAction?: string;
  }): Promise<Quest> {
    const existing = await this.getById(userId, id);
    if (!existing) {
      throw new Error(`Quest not found: ${id}`);
    }

    const updated: Quest = {
      ...existing,
      status: input.status,
      masteryEvidence: input.masteryEvidence,
      nextAction: input.nextAction,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(id, updated);
    Object.assign(existing, updated);
    return updated;
  }
}

export const questsRepo = new InMemoryQuestsRepository();
