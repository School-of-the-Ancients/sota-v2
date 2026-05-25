import { AIGateway, type TextGenerationRequest, type TextGenerationResponse } from "./aiGateway";

export type PromptRunner = {
  runText<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>>;
};

export function createPromptRunner(gateway: AIGateway): PromptRunner {
  return {
    runText<T>(request: TextGenerationRequest) {
      return gateway.generateText<T>(request);
    },
  };
}

export const promptRunner = {};
