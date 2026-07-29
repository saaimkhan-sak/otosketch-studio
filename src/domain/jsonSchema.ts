import { z } from "zod";
import { OperativeCaseSchema } from "./schema";

export const operativeCaseJsonSchema = z.toJSONSchema(OperativeCaseSchema, {
  target: "draft-7",
});

type JsonObject = { [key: string]: unknown };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function removeGrammarHostileSchemaKeywords(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeGrammarHostileSchemaKeywords);
  }
  if (!isJsonObject(value)) {
    return value;
  }

  const result: JsonObject = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === "format" || key === "pattern") {
      continue;
    }
    result[key] = removeGrammarHostileSchemaKeywords(nested);
  }
  return result;
}

export const modelOperativeCaseJsonSchema = removeGrammarHostileSchemaKeywords(operativeCaseJsonSchema);
export const ollamaOperativeCaseJsonSchema = modelOperativeCaseJsonSchema;
