import type { PromptRunCreateInput, PromptRunsRepository } from "../db/repositories/promptRunsRepo";
import type { SchemaValidator } from "../validation/schemas";
import type { TextProvider } from "./providers/textProvider";

export type AITask =
  | "goal_refinement"
  | "curriculum_generation"
  | "quest_generation"
  | "mentor_selection"
  | "lesson_response"
  | "lesson_summary"
  | "assessment_generation"
  | "assessment_grading"
  | "wiki_update"
  | "study_oracle_analysis"
  | "artifact_generation";

export type AIMessageRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIMessageRole;
  content: string;
};

export type TextGenerationRequest = {
  task: AITask;
  promptVersion: string;
  messages: AIMessage[];
  jsonSchema?: unknown;
  temperature?: number;
  userId: string;
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
};

export type TextGenerationResponse<T> = {
  data: T;
  provider: string;
  model: string;
  promptVersion: string;
  task: AITask;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  warnings?: string[];
  promptRunId?: string;
};

export type AIGatewayOptions = {
  textProvider: TextProvider;
  promptRunsRepo: PromptRunsRepository;
  schemaValidator?: SchemaValidator;
};

export class AIGateway {
  private readonly textProvider: TextProvider;
  private readonly promptRunsRepo: PromptRunsRepository;
  private readonly schemaValidator?: SchemaValidator;

  constructor(options: AIGatewayOptions) {
    this.textProvider = options.textProvider;
    this.promptRunsRepo = options.promptRunsRepo;
    this.schemaValidator = options.schemaValidator;
  }

  async generateText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
    this.assertServerSideRuntime();

    const promptRunBase: PromptRunCreateInput = {
      userId: request.userId,
      task: request.task,
      promptVersion: request.promptVersion,
      provider: this.textProvider.name,
      model: this.textProvider.model,
      inputHash: await this.hashMessages(request.messages),
      inputSummary: this.summarizeInput(request),
      sourceIds: request.sourceIds,
      metadata: request.metadata,
      status: "started",
    };

    const startedRun = await this.promptRunsRepo.create(promptRunBase);

    try {
      const providerResponse = await this.textProvider.generate<T>(request);
      const validation = request.jsonSchema
        ? this.requireSchemaValidator().validate<T>(providerResponse.data, request.jsonSchema)
        : { ok: true as const, data: providerResponse.data };

      if (!validation.ok) {
        await this.promptRunsRepo.update(startedRun.id, {
          status: "validation_failed",
          output: providerResponse.data,
          usage: providerResponse.usage,
          errorMessage: validation.error,
        });

        throw new Error(`AI gateway schema validation failed for ${request.task}: ${validation.error}`);
      }

      await this.promptRunsRepo.update(startedRun.id, {
        status: "success",
        output: validation.data,
        usage: providerResponse.usage,
      });

      return {
        ...providerResponse,
        data: validation.data,
        task: request.task,
        promptVersion: request.promptVersion,
        promptRunId: startedRun.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown AI gateway error";
      await this.promptRunsRepo.update(startedRun.id, {
        status: "failed",
        errorMessage,
      });
      throw error;
    }
  }

  private requireSchemaValidator(): SchemaValidator {
    if (!this.schemaValidator) {
      throw new Error("Structured AI output requested without a schema validator");
    }

    return this.schemaValidator;
  }

  private assertServerSideRuntime(): void {
    if (typeof window !== "undefined") {
      throw new Error("AIGateway must run server-side; browser code must not call model providers directly");
    }
  }

  private async hashMessages(messages: AIMessage[]): Promise<string> {
    const payload = JSON.stringify(messages.map(({ role, content }) => ({ role, content })));

    if (typeof crypto !== "undefined" && "subtle" in crypto) {
      const encoded = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    return `unhashed:${payload.length}`;
  }

  private summarizeInput(request: TextGenerationRequest): string {
    return [
      `task=${request.task}`,
      `promptVersion=${request.promptVersion}`,
      `messages=${request.messages.length}`,
      `sources=${request.sourceIds?.length ?? 0}`,
    ].join(" ");
  }
}
