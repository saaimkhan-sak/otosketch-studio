import { normalizeOperativeCase } from "@/domain/normalize";
import { detectPossiblePhi } from "@/domain/safety";
import { syntheticCases, syntheticCaseById } from "@/fixtures/syntheticCases";
import type { NoteExtractor } from "./NoteExtractor";
import { rulesExtractor } from "./rulesExtractor";

function cloneCase<T>(value: T): T {
  return structuredClone(value);
}

export const mockExtractor: NoteExtractor = {
  provider: "mock",
  async extract(input) {
    const started = performance.now();
    const normalizedNote = input.note.trim();
    const hintedFixture = input.caseHint ? syntheticCaseById.get(input.caseHint) : undefined;
    const fixture =
      hintedFixture?.note.trim() === normalizedNote
        ? hintedFixture
        : syntheticCases.find((candidate) => candidate.note.trim() === normalizedNote);

    if (!fixture) {
      const rulesResult = await rulesExtractor.extract({
        ...input,
        provider: "rules",
        caseHint: undefined,
      });
      return {
        ...rulesResult,
        warnings: [
          "Demo expected output is available only for exact bundled examples; this custom note was extracted with simple rules.",
          ...rulesResult.warnings,
        ],
        durationMs: performance.now() - started,
      };
    }

    const possiblePhi = detectPossiblePhi(input.note);
    const rawCase = cloneCase(fixture.expected);
    rawCase.extractionProvider = "mock";
    rawCase.createdAtIso = new Date().toISOString();
    rawCase.safety = {
      ...rawCase.safety,
      containsPossiblePhi: possiblePhi.containsPossiblePhi,
      phiWarnings: possiblePhi.warnings,
    };

    const normalized = normalizeOperativeCase(rawCase);
    return {
      case: normalized.case,
      raw: rawCase,
      warnings: normalized.warnings,
      durationMs: performance.now() - started,
    };
  },
};
