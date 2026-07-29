import { assertNever } from "@/lib/assertNever";
import type { ExtractorProvider, NoteExtractor } from "./NoteExtractor";
import { mockExtractor } from "./mockExtractor";
import { rulesExtractor } from "./rulesExtractor";
import { ollamaExtractor } from "./ollamaExtractor";
import { cloudflareExtractor } from "./cloudflareExtractor";

export function getExtractor(provider: ExtractorProvider): NoteExtractor {
  switch (provider) {
    case "mock":
      return mockExtractor;
    case "rules":
      return rulesExtractor;
    case "ollama":
      return ollamaExtractor;
    case "cloudflare":
      return cloudflareExtractor;
    default:
      return assertNever(provider);
  }
}
