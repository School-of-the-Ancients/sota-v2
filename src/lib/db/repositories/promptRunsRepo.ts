export type PromptRunStatus = "started" | "success" | "failed" | "validation_failed" | "redacted";

export type PromptRunCreateInput = {
  userId?: string;
  task: string;
  promptVersion: string;
  provider: string;
  model: string;
  inputHash?: string;
  inputSummary?: string;
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
  status: PromptRunStatus;
};

export type PromptRunUpdateInput = Partial<{
  status: PromptRunStatus;
  output: unknown;
  usage: unknown;
  errorMessage: string;
}>;

export type PromptRunRecord = PromptRunCreateInput & {
  id: string;
  output?: unknown;
  usage?: unknown;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type PromptRunsRepository = {
  create(input: PromptRunCreateInput): Promise<PromptRunRecord>;
  update(id: string, input: PromptRunUpdateInput): Promise<PromptRunRecord>;
};

export class InMemoryPromptRunsRepository implements PromptRunsRepository {
  private readonly records = new Map<string, PromptRunRecord>();

  async create(input: PromptRunCreateInput): Promise<PromptRunRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `prompt-run-${this.records.size + 1}`;
    const record: PromptRunRecord = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(id, record);
    return record;
  }

  async update(id: string, input: PromptRunUpdateInput): Promise<PromptRunRecord> {
    const existing = this.records.get(id);
    if (!existing) {
      throw new Error(`Prompt run not found: ${id}`);
    }

    const updated: PromptRunRecord = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(id, updated);
    return updated;
  }

  get(id: string): PromptRunRecord | undefined {
    return this.records.get(id);
  }
}

export const promptRunsRepo = new InMemoryPromptRunsRepository();
