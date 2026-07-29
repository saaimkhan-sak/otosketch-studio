import { NextResponse } from "next/server";
import { getExtractor } from "@/extractors/providerRegistry";
import type { ExtractorProvider } from "@/extractors/NoteExtractor";
import { ModelProviderError, PossiblePhiError, UnsupportedProcedureError } from "@/lib/errors";

const providers = new Set<ExtractorProvider>(["mock", "rules", "ollama", "cloudflare"]);

function providerDisabled(provider: ExtractorProvider) {
  if (provider === "ollama") return process.env.ENABLE_OLLAMA !== "true";
  if (provider === "cloudflare") return process.env.ENABLE_CLOUDFLARE_AI !== "true";
  return false;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { note?: string; provider?: string; caseHint?: string }
    | null;

  if (!body?.note?.trim()) {
    return NextResponse.json(
      { ok: false, errorCode: "EMPTY_NOTE", message: "Synthetic note text is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (body.note.length > 12_000) {
    return NextResponse.json(
      { ok: false, errorCode: "TOO_LONG", message: "Input exceeds the 12,000 character limit." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const provider = providers.has(body.provider as ExtractorProvider)
    ? (body.provider as ExtractorProvider)
    : "mock";

  if (providerDisabled(provider)) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "PROVIDER_DISABLED",
        message: `${provider} extraction is disabled in this environment. Use mock/rules mode or enable it intentionally.`,
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const extractor = getExtractor(provider);
    const result = await extractor.extract({
      note: body.note,
      provider,
      caseHint: body.caseHint,
    });
    return NextResponse.json(
      { ok: true, case: result.case, warnings: result.warnings, durationMs: result.durationMs },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const errorCode =
      error instanceof PossiblePhiError
        ? "POSSIBLE_PHI"
        : error instanceof UnsupportedProcedureError
          ? "UNSUPPORTED"
          : error instanceof ModelProviderError
            ? "MODEL_FAILED"
            : "EXTRACTION_FAILED";
    const status = error instanceof PossiblePhiError ? 422 : error instanceof ModelProviderError ? 502 : 400;
    return NextResponse.json(
      {
        ok: false,
        errorCode,
        message: error instanceof Error ? error.message : "Extraction failed.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
