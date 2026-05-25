import type { AITask } from "./aiGateway.ts";
import type { TextProvider } from "./providers/textProvider";

export type ModelCapability = "text" | "structured_json" | "vision" | "audio";

export type AIModelOption = {
  id: string;
  provider: string;
  model: string;
  displayName: string;
  capabilities: ModelCapability[];
  enabled: boolean;
};

export type UserAIModelPreferences = {
  userId: string;
  defaultModelOptionId?: string;
  taskOverrides?: Partial<Record<AITask, string>>;
};

export type UserAIModelPreferencesRepository = {
  getForUser(userId: string): Promise<UserAIModelPreferences | null>;
};

export type ModelResolutionInput = {
  userId: string;
  task: AITask;
  modelOptions: AIModelOption[];
  providers: TextProvider[];
  defaultModelOptionId: string;
  userModelPreferencesRepo?: UserAIModelPreferencesRepository;
};

export type ResolvedAIModel = {
  option: AIModelOption;
  provider: TextProvider;
  source: "task_override" | "user_default" | "app_default";
};

export async function resolveModelForTask(input: ModelResolutionInput): Promise<ResolvedAIModel> {
  const preferences = await input.userModelPreferencesRepo?.getForUser(input.userId);
  const taskOverride = preferences?.taskOverrides?.[input.task];
  const userDefault = preferences?.defaultModelOptionId;

  const candidates = [
    { id: taskOverride, source: "task_override" as const },
    { id: userDefault, source: "user_default" as const },
    { id: input.defaultModelOptionId, source: "app_default" as const },
  ].filter((candidate): candidate is { id: string; source: ResolvedAIModel["source"] } => Boolean(candidate.id));

  const errors: string[] = [];
  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate.id, candidate.source, input.modelOptions, input.providers);
    if (resolved.ok) {
      return resolved.value;
    }
    errors.push(resolved.error);
  }

  throw new Error(`No enabled AI model is available for ${input.task}: ${errors.join("; ")}`);
}

type CandidateResolution =
  | { ok: true; value: ResolvedAIModel }
  | { ok: false; error: string };

function resolveCandidate(
  modelOptionId: string,
  source: ResolvedAIModel["source"],
  modelOptions: AIModelOption[],
  providers: TextProvider[],
): CandidateResolution {
  const option = modelOptions.find((modelOption) => modelOption.id === modelOptionId);
  if (!option) {
    return { ok: false, error: `model option ${modelOptionId} is not allowlisted` };
  }
  if (!option.enabled) {
    return { ok: false, error: `model option ${modelOptionId} is disabled` };
  }

  const provider = providers.find((candidate) => candidate.name === option.provider && candidate.model === option.model);
  if (!provider) {
    return { ok: false, error: `model option ${modelOptionId} has no configured provider adapter` };
  }

  return { ok: true, value: { option, provider, source } };
}

export class InMemoryUserAIModelPreferencesRepository implements UserAIModelPreferencesRepository {
  private readonly records = new Map<string, UserAIModelPreferences>();

  async getForUser(userId: string): Promise<UserAIModelPreferences | null> {
    return this.records.get(userId) ?? null;
  }

  async save(input: UserAIModelPreferences): Promise<UserAIModelPreferences> {
    const record = {
      ...input,
      taskOverrides: input.taskOverrides ?? {},
    };
    this.records.set(input.userId, record);
    return record;
  }
}
