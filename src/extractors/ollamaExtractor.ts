import { ollamaOperativeCaseJsonSchema } from "@/domain/jsonSchema";
import { recoverEvidenceSpans } from "@/domain/evidence";
import { normalizeOperativeCase } from "@/domain/normalize";
import { detectPossiblePhi } from "@/domain/safety";
import { ModelProviderError, PossiblePhiError } from "@/lib/errors";
import type { NoteExtractor } from "./NoteExtractor";
import { buildExtractionPrompt, EXTRACTION_SYSTEM_PROMPT } from "./prompt";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyTrustedOllamaMetadata(parsed: unknown) {
  if (!isRecord(parsed)) return;
  parsed.inputKind = "synthetic_note";
  parsed.extractionProvider = "ollama";
  parsed.createdAtIso = new Date().toISOString();
  parsed.review = { status: "draft_unreviewed" };
}

export const ollamaExtractor: NoteExtractor = {
  provider: "ollama",
  async extract(input) {
    const started = performance.now();
    const possiblePhi = detectPossiblePhi(input.note);
    if (possiblePhi.containsPossiblePhi) {
      throw new PossiblePhiError(possiblePhi.warnings.join(" "));
    }

    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: ollamaOperativeCaseJsonSchema,
          options: { temperature: 0 },
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            { role: "user", content: buildExtractionPrompt(input.note) },
          ],
        }),
      });
    } catch {
      throw new ModelProviderError("Ollama is unavailable. Start the local Ollama server or use mock/rules mode.");
    }

    if (!response.ok) {
      throw new ModelProviderError(`Ollama extraction failed with status ${response.status}.`);
    }

    const body = (await response.json()) as { message?: { content?: string } };
    const rawText = body.message?.content;
    if (!rawText) {
      throw new ModelProviderError("Ollama returned an empty structured response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new ModelProviderError("Ollama returned invalid JSON.");
    }

    applyTrustedOllamaMetadata(parsed);

    const normalized = normalizeOperativeCase(parsed);
    const recovered = recoverEvidenceSpans(normalized.case, input.note);
    return {
      case: recovered.case,
      raw: parsed,
      warnings: [...normalized.warnings, ...recovered.warnings],
      durationMs: performance.now() - started,
    };
  },
};
