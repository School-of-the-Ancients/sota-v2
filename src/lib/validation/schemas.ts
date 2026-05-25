export type SchemaValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type SchemaValidationFailure = {
  ok: false;
  error: string;
};

export type SchemaValidationResult<T> = SchemaValidationSuccess<T> | SchemaValidationFailure;

export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: readonly unknown[];
  const?: unknown;
  minItems?: number;
  maxItems?: number;
};

export type SchemaValidator = {
  validate<T>(data: unknown, schema: unknown): SchemaValidationResult<T>;
};

export class PassthroughSchemaValidator implements SchemaValidator {
  validate<T>(data: unknown, schema: unknown): SchemaValidationResult<T> {
    if (!schema) {
      return { ok: true, data: data as T };
    }

    const error = validateAgainstSchema(data, schema as JsonSchema, "output");
    if (error) {
      return { ok: false, error };
    }

    return { ok: true, data: data as T };
  }
}

function validateAgainstSchema(data: unknown, schema: JsonSchema, path: string): string | null {
  if (schema.type) {
    const typeError = validateType(data, schema.type, path);
    if (typeError) {
      return typeError;
    }
  }

  if (schema.enum && !schema.enum.includes(data)) {
    return `${path} must be one of: ${schema.enum.join(", ")}`;
  }

  if ("const" in schema && data !== schema.const) {
    return `${path} must equal ${String(schema.const)}`;
  }

  if (schema.type === "object" || schema.required || schema.properties) {
    if (!isRecord(data)) {
      return `${path} must be an object`;
    }

    const missing = (schema.required ?? []).filter((field) => !(field in data));
    if (missing.length > 0) {
      return `Missing required fields at ${path}: ${missing.join(", ")}`;
    }

    for (const [field, fieldSchema] of Object.entries(schema.properties ?? {})) {
      if (field in data) {
        const nestedError = validateAgainstSchema(data[field], fieldSchema, `${path}.${field}`);
        if (nestedError) {
          return nestedError;
        }
      }
    }
  }

  if (schema.type === "array") {
    const values = data as unknown[];
    if (schema.minItems !== undefined && values.length < schema.minItems) {
      return `${path} must contain at least ${schema.minItems} items`;
    }
    if (schema.maxItems !== undefined && values.length > schema.maxItems) {
      return `${path} must contain at most ${schema.maxItems} items`;
    }
    if (!schema.items) {
      return null;
    }

    for (const [index, value] of values.entries()) {
      const nestedError = validateAgainstSchema(value, schema.items, `${path}[${index}]`);
      if (nestedError) {
        return nestedError;
      }
    }
  }

  return null;
}

function validateType(data: unknown, type: NonNullable<JsonSchema["type"]>, path: string): string | null {
  if (type === "array") {
    return Array.isArray(data) ? null : `${path} must be an array`;
  }

  if (type === "object") {
    return isRecord(data) ? null : `${path} must be an object`;
  }

  if (type === "integer") {
    return Number.isInteger(data) ? null : `${path} must be an integer`;
  }

  return typeof data === type ? null : `${path} must be a ${type}`;
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

export const validationSchemas = {
  learningGoal: {
    type: "object",
    required: ["title", "desired_outcome"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      desired_outcome: { type: "string" },
      current_level: { type: "string", enum: ["beginner", "intermediate", "advanced", "unknown"] },
      time_budget_minutes_per_day: { type: "integer" },
      success_criteria: { type: "array", items: { type: "string" } },
    },
  },
  questGeneration: {
    type: "object",
    required: ["quests"],
    properties: {
      quests: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "objective", "lesson_plan", "focus_points", "practice_tasks", "mastery_criteria"],
          properties: {
            title: { type: "string" },
            objective: { type: "string" },
            prerequisite_notes: { type: "array", items: { type: "string" } },
            lesson_plan: { type: "array", items: { type: "string" } },
            focus_points: { type: "array", items: { type: "string" } },
            practice_tasks: { type: "array", items: { type: "string" } },
            mastery_criteria: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
  oneWeekCurriculum: {
    type: "object",
    required: ["title", "duration_days", "days"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      duration_days: { type: "integer", const: 7 },
      weekly_rhythm: { type: "string" },
      days: {
        type: "array",
        minItems: 7,
        maxItems: 7,
        items: {
          type: "object",
          required: ["day", "title", "objective", "focus_points", "practice_tasks", "mastery_criteria"],
          properties: {
            day: { type: "integer" },
            title: { type: "string" },
            objective: { type: "string" },
            focus_points: { type: "array", items: { type: "string" } },
            practice_tasks: { type: "array", items: { type: "string" } },
            mastery_criteria: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
} as const satisfies Record<string, JsonSchema>;
