import { recoverEvidenceSpans } from "@/domain/evidence";
import { normalizeOperativeCase } from "@/domain/normalize";
import { detectPossiblePhi } from "@/domain/safety";
import { ModelProviderError, PossiblePhiError } from "@/lib/errors";
import type { NoteExtractor } from "./NoteExtractor";

export const cloudflareExtractor: NoteExtractor = {
  provider: "cloudflare",
  async extract(input) {
    const started = performance.now();
    const possiblePhi = detectPossiblePhi(input.note);
    if (possiblePhi.containsPossiblePhi) {
      throw new PossiblePhiError(possiblePhi.warnings.join(" "));
    }

    const url = process.env.CLOUDFLARE_WORKER_EXTRACT_URL;
    if (!url) {
      throw new ModelProviderError("Cloudflare extraction is disabled because CLOUDFLARE_WORKER_EXTRACT_URL is not configured.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: input.note,
        caseHint: input.caseHint,
      }),
    });

    const body = (await response.json().catch(() => null)) as
      | { ok: true; case: unknown; warnings?: string[] }
      | { ok: false; message?: string; error?: string }
      | null;

    if (!response.ok || !body || body.ok === false) {
      throw new ModelProviderError(body && "message" in body && body.message ? body.message : "Cloudflare extraction failed.");
    }

    const normalized = normalizeOperativeCase(body.case);
    const recovered = recoverEvidenceSpans(normalized.case, input.note);
    return {
      case: recovered.case,
      raw: body.case,
      warnings: [...(body.warnings ?? []), ...normalized.warnings, ...recovered.warnings],
      durationMs: performance.now() - started,
    };
  },
};
