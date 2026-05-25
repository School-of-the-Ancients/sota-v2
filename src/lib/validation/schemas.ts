export type SchemaValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type SchemaValidationFailure = {
  ok: false;
  error: string;
};

export type SchemaValidationResult<T> = SchemaValidationSuccess<T> | SchemaValidationFailure;

export type SchemaValidator = {
  validate<T>(data: unknown, schema: unknown): SchemaValidationResult<T>;
};

export class PassthroughSchemaValidator implements SchemaValidator {
  validate<T>(data: unknown, schema: unknown): SchemaValidationResult<T> {
    if (!schema) {
      return { ok: true, data: data as T };
    }

    if (typeof schema === "object" && schema !== null && "required" in schema) {
      const required = (schema as { required?: string[] }).required ?? [];
      if (typeof data !== "object" || data === null) {
        return { ok: false, error: "Expected object output for schema with required fields" };
      }

      const missing = required.filter((field) => !(field in (data as Record<string, unknown>)));
      if (missing.length > 0) {
        return { ok: false, error: `Missing required fields: ${missing.join(", ")}` };
      }
    }

    return { ok: true, data: data as T };
  }
}

export const validationSchemas = {};
