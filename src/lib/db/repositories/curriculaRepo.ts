import type { Curriculum, CurriculumPlan, CurriculumStatus } from "../../../features/curriculum/curriculumTypes.ts";

export type CurriculumCreateInput = {
  userId: string;
  goalId: string;
  title: string;
  description?: string;
  durationDays: number;
  weeklyRhythm?: string;
  plan: CurriculumPlan;
  status?: CurriculumStatus;
  generatedByPromptRunId?: string;
};

export type CurriculaRepository = {
  create(input: CurriculumCreateInput): Promise<Curriculum>;
  updateStatus(userId: string, id: string, status: CurriculumStatus): Promise<Curriculum>;
  listByGoal(userId: string, goalId: string): Promise<Curriculum[]>;
  getById(userId: string, id: string): Promise<Curriculum | null>;
};

export class InMemoryCurriculaRepository implements CurriculaRepository {
  private readonly records = new Map<string, Curriculum>();

  async create(input: CurriculumCreateInput): Promise<Curriculum> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `curriculum-${this.records.size + 1}`;
    const record: Curriculum = {
      id,
      userId: input.userId,
      goalId: input.goalId,
      title: input.title,
      description: input.description,
      durationDays: input.durationDays,
      weeklyRhythm: input.weeklyRhythm,
      plan: input.plan,
      status: input.status ?? "draft",
      generatedByPromptRunId: input.generatedByPromptRunId,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(id, record);
    return record;
  }

  async updateStatus(userId: string, id: string, status: CurriculumStatus): Promise<Curriculum> {
    const existing = await this.getById(userId, id);
    if (!existing) {
      throw new Error(`Curriculum not found: ${id}`);
    }

    const updated: Curriculum = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(id, updated);
    Object.assign(existing, updated);
    return updated;
  }

  async listByGoal(userId: string, goalId: string): Promise<Curriculum[]> {
    return [...this.records.values()].filter((curriculum) => curriculum.userId === userId && curriculum.goalId === goalId);
  }

  async getById(userId: string, id: string): Promise<Curriculum | null> {
    const curriculum = this.records.get(id);
    return curriculum?.userId === userId ? curriculum : null;
  }
}

export const curriculaRepo = new InMemoryCurriculaRepository();
