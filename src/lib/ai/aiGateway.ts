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

export type TextGenerationRequest = {
  task: AITask;
  promptVersion: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
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
  usage?: { inputTokens?: number; outputTokens?: number };
  warnings?: string[];
};
