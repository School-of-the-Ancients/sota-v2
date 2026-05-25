import test from "node:test";
import assert from "node:assert/strict";

import { AIGateway, type TextGenerationRequest, type TextGenerationResponse } from "../src/lib/ai/aiGateway.ts";
import { InMemoryPromptRunsRepository } from "../src/lib/db/repositories/promptRunsRepo.ts";
import type { TextProvider } from "../src/lib/ai/providers/textProvider.ts";

function fakeProvider(name: string, model: string): TextProvider {
  return {
    name,
    model,
    async generate<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      return {
        data: { text: `${name}:${model}:${request.task}` } as T,
        provider: name,
        model,
        promptVersion: request.promptVersion,
        task: request.task,
      };
    },
  };
}

test("AI gateway resolves task-specific user model preferences from an allowlisted registry", async () => {
  const promptRunsRepo = new InMemoryPromptRunsRepository();
  const gateway = new AIGateway({
    textProviders: [fakeProvider("echo", "echo-local"), fakeProvider("openai", "gpt-4.1"), fakeProvider("google", "gemini-1.5-pro")],
    defaultModelOptionId: "echo-local",
    modelOptions: [
      { id: "echo-local", provider: "echo", model: "echo-local", displayName: "Echo Local", capabilities: ["text", "structured_json"], enabled: true },
      { id: "gpt-4.1", provider: "openai", model: "gpt-4.1", displayName: "GPT 4.1", capabilities: ["text", "structured_json"], enabled: true },
      { id: "gemini-pro", provider: "google", model: "gemini-1.5-pro", displayName: "Gemini Pro", capabilities: ["text", "structured_json"], enabled: true },
    ],
    userModelPreferencesRepo: {
      async getForUser(userId: string) {
        assert.equal(userId, "learner-1");
        return {
          userId,
          defaultModelOptionId: "gpt-4.1",
          taskOverrides: {
            curriculum_generation: "gemini-pro",
          },
        };
      },
    },
    promptRunsRepo,
  });

  const response = await gateway.generateText<{ text: string }>({
    task: "curriculum_generation",
    promptVersion: "curriculum.one-week-curriculum.v1",
    userId: "learner-1",
    messages: [{ role: "user", content: "make a plan" }],
  });

  assert.equal(response.provider, "google");
  assert.equal(response.model, "gemini-1.5-pro");
  const promptRun = promptRunsRepo.get(response.promptRunId ?? "");
  assert.equal(promptRun?.provider, "google");
  assert.equal(promptRun?.model, "gemini-1.5-pro");
  assert.equal(promptRun?.metadata?.modelOptionId, "gemini-pro");
});

test("AI gateway falls back to user default then app default model preference", async () => {
  const gateway = new AIGateway({
    textProviders: [fakeProvider("echo", "echo-local"), fakeProvider("openai", "gpt-4.1")],
    defaultModelOptionId: "echo-local",
    modelOptions: [
      { id: "echo-local", provider: "echo", model: "echo-local", displayName: "Echo Local", capabilities: ["text"], enabled: true },
      { id: "gpt-4.1", provider: "openai", model: "gpt-4.1", displayName: "GPT 4.1", capabilities: ["text"], enabled: true },
    ],
    userModelPreferencesRepo: {
      async getForUser(userId: string) {
        return userId === "learner-1" ? { userId, defaultModelOptionId: "gpt-4.1", taskOverrides: {} } : null;
      },
    },
    promptRunsRepo: new InMemoryPromptRunsRepository(),
  });

  const userDefault = await gateway.generateText<{ text: string }>({
    task: "lesson_response",
    promptVersion: "lessons.response.v1",
    userId: "learner-1",
    messages: [{ role: "user", content: "help" }],
  });
  assert.equal(userDefault.provider, "openai");
  assert.equal(userDefault.model, "gpt-4.1");

  const appDefault = await gateway.generateText<{ text: string }>({
    task: "lesson_response",
    promptVersion: "lessons.response.v1",
    userId: "learner-2",
    messages: [{ role: "user", content: "help" }],
  });
  assert.equal(appDefault.provider, "echo");
  assert.equal(appDefault.model, "echo-local");
});

test("AI gateway rejects disabled or unsupported model preferences before provider calls", async () => {
  let providerCalls = 0;
  const provider = fakeProvider("openai", "gpt-4.1");
  const countingProvider: TextProvider = {
    ...provider,
    async generate<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
      providerCalls += 1;
      return provider.generate<T>(request);
    },
  };

  const gateway = new AIGateway({
    textProviders: [countingProvider],
    defaultModelOptionId: "disabled-gpt",
    modelOptions: [
      { id: "disabled-gpt", provider: "openai", model: "gpt-4.1", displayName: "GPT 4.1", capabilities: ["text"], enabled: false },
    ],
    promptRunsRepo: new InMemoryPromptRunsRepository(),
  });

  await assert.rejects(
    () =>
      gateway.generateText({
        task: "lesson_response",
        promptVersion: "lessons.response.v1",
        userId: "learner-1",
        messages: [{ role: "user", content: "help" }],
      }),
    /disabled|not enabled|unsupported/i,
  );
  assert.equal(providerCalls, 0);
});
