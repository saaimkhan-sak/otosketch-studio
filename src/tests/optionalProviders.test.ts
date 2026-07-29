import { afterEach, describe, expect, it, vi } from "vitest";
import { ollamaExtractor } from "@/extractors/ollamaExtractor";

describe("optional model providers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails safely when Ollama is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );

    await expect(
      ollamaExtractor.extract({
        provider: "ollama",
        note: "Synthetic operative note. Left tympanoplasty.",
      }),
    ).rejects.toThrow(/Ollama is unavailable/i);
  });
});
