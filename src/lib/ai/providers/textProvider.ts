import type { TextGenerationRequest, TextGenerationResponse } from "../aiGateway";

export type TextProvider = {
  name: string;
  model: string;
  generate<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>>;
};

export class EchoTextProvider implements TextProvider {
  readonly name = "echo";
  readonly model = "echo-local";

  async generate<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>> {
    const lastMessage = request.messages.at(-1)?.content ?? "";

    return {
      data: { text: lastMessage } as T,
      provider: this.name,
      model: this.model,
      promptVersion: request.promptVersion,
      task: request.task,
      usage: {
        inputTokens: request.messages.reduce((total, message) => total + message.content.length, 0),
        outputTokens: lastMessage.length,
      },
    };
  }
}
