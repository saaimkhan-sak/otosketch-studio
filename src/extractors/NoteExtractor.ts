import type { OperativeCase } from "@/domain/schema";

export type ExtractorProvider = "mock" | "rules" | "ollama" | "cloudflare";

export interface ExtractorInput {
  note: string;
  caseHint?: string;
  provider: ExtractorProvider;
}

export interface ExtractorResult {
  case: OperativeCase;
  raw?: unknown;
  warnings: string[];
  durationMs: number;
}

export interface NoteExtractor {
  readonly provider: ExtractorProvider;
  extract(input: ExtractorInput): Promise<ExtractorResult>;
}
