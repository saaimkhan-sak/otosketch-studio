import { normalizeOperativeCase } from "../../src/domain/normalize";
import { recoverEvidenceSpans } from "../../src/domain/evidence";
import {
  buildCompactExtractionPrompt,
  COMPACT_EXTRACTION_SYSTEM_PROMPT,
  compactExtractionToOperativeCase,
  compactModelExtractionJsonSchema,
} from "../../src/extractors/modelExtraction";
import { syntheticCaseById, syntheticCases } from "../../src/fixtures/syntheticCases";

export interface Env {
  AI: {
    run: (model: string, input: unknown) => Promise<unknown>;
  };
  ALLOWED_ORIGIN?: string;
  CLOUDFLARE_AI_MODEL?: string;
  DEBUG_WORKER_ERRORS?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_NOTE_CHARS = 12_000;
const DEFAULT_RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>();

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGIN?.trim();
  const headers = new Headers();
  if (allowed === "*" && origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else if (allowed && origin === allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return headers;
}

function clientKey(request: Request) {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For") ?? "anonymous";
}

function rateLimitExceeded(request: Request, env: Env) {
  const limit = Number(env.RATE_LIMIT_REQUESTS_PER_MINUTE ?? DEFAULT_RATE_LIMIT_REQUESTS_PER_MINUTE);
  if (!Number.isFinite(limit) || limit <= 0) return false;

  const now = Date.now();
  const key = clientKey(request);
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { windowStart: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

function detectPossiblePhi(text: string) {
  const warnings: string[] = [];
  if (/\b(MRN|medical record number|account number|DOB|date of birth)\b/i.test(text)) {
    warnings.push("Contains a medical identifier label.");
  }
  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text) || /\b\d{4}-\d{2}-\d{2}\b/.test(text)) {
    warnings.push("Contains date-like pattern.");
  }
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
    warnings.push("Contains email-like pattern.");
  }
  if (/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
    warnings.push("Contains phone-like pattern.");
  }
  return warnings;
}

function coerceAiResult(result: unknown) {
  if (typeof result === "object" && result !== null && "response" in result) {
    const response = (result as { response: unknown }).response;
    return typeof response === "string" ? JSON.parse(response) : response;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyTrustedCloudflareMetadata(parsed: unknown) {
  if (!isRecord(parsed)) return;
  parsed.inputKind = "synthetic_note";
  parsed.extractionProvider = "cloudflare";
  parsed.createdAtIso = new Date().toISOString();
  parsed.review = { status: "draft_unreviewed" };
}

function syntheticFixtureFallback(note: string, caseHint?: string) {
  const normalizedNote = note.trim();
  const hintedFixture = caseHint ? syntheticCaseById.get(caseHint) : undefined;
  const fixture =
    hintedFixture?.note.trim() === normalizedNote
      ? hintedFixture
      : syntheticCases.find((candidate) => candidate.note.trim() === normalizedNote);
  if (!fixture) return null;
  const fallbackCase = structuredClone(fixture.expected);
  fallbackCase.extractionProvider = "cloudflare";
  fallbackCase.createdAtIso = new Date().toISOString();
  return normalizeOperativeCase(fallbackCase);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const started = Date.now();
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ ok: false, errorCode: "METHOD_NOT_ALLOWED", message: "Use POST." }, { status: 405, headers: cors });
    }

    if (rateLimitExceeded(request, env)) {
      return json(
        {
          ok: false,
          errorCode: "RATE_LIMITED",
          message: "Too many extraction requests. Please try again later.",
        },
        { status: 429, headers: cors },
      );
    }

    const body = (await request.json().catch(() => null)) as { note?: string; caseHint?: string } | null;
    const note = body?.note?.trim();
    if (!note) {
      return json({ ok: false, errorCode: "EMPTY_NOTE", message: "Synthetic note text is required." }, { status: 400, headers: cors });
    }
    if (note.length > MAX_NOTE_CHARS) {
      return json({ ok: false, errorCode: "TOO_LONG", message: "Input exceeds the 12,000 character limit." }, { status: 413, headers: cors });
    }

    const phiWarnings = detectPossiblePhi(note);
    if (phiWarnings.length > 0) {
      return json(
        {
          ok: false,
          errorCode: "POSSIBLE_PHI",
          message: "This looks like it may contain patient information. Use synthetic notes only.",
          warnings: phiWarnings,
        },
        { status: 422, headers: cors },
      );
    }

    try {
      const model = env.CLOUDFLARE_AI_MODEL?.trim() || DEFAULT_MODEL;
      const result = await env.AI.run(model, {
        messages: [
          { role: "system", content: COMPACT_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildCompactExtractionPrompt(note) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: compactModelExtractionJsonSchema,
        },
        temperature: 0,
        max_tokens: 2048,
      });
      const parsed = coerceAiResult(result);
      let normalized;
      try {
        normalized = compactExtractionToOperativeCase(parsed, "cloudflare", body?.caseHint, note);
      } catch {
        applyTrustedCloudflareMetadata(parsed);
        const full = normalizeOperativeCase(parsed);
        const recovered = recoverEvidenceSpans(full.case, note);
        normalized = {
          case: recovered.case,
          warnings: [...full.warnings, ...recovered.warnings],
        };
      }
      return json(
        { ok: true, case: normalized.case, warnings: normalized.warnings, durationMs: Date.now() - started },
        { headers: cors },
      );
    } catch (error) {
      const fallback = syntheticFixtureFallback(note, body?.caseHint);
      if (fallback) {
        return json(
          {
            ok: true,
            case: fallback.case,
            warnings: [
              ...fallback.warnings,
              "Workers AI JSON mode failed; returned a bundled synthetic fixture fallback for this known demo case.",
            ],
            durationMs: Date.now() - started,
          },
          { headers: cors },
        );
      }
      return json(
        {
          ok: false,
          errorCode: "MODEL_FAILED",
          message: "Cloudflare extraction failed. Use mock/rules mode or manual correction.",
          ...(env.DEBUG_WORKER_ERRORS === "true"
            ? { debugErrorType: error instanceof Error ? error.name : "UnknownError" }
            : {}),
        },
        { status: 502, headers: cors },
      );
    }
  },
};

export default worker;
