import type { TextGenerationRequest, TextGenerationResponse } from "../aiGateway";

export type TextProvider = {
  name: string;
  generate<T>(request: TextGenerationRequest): Promise<TextGenerationResponse<T>>;
};
