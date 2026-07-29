import { describe, expect, it } from "vitest";
import { recoverEvidenceSpans } from "@/domain/evidence";
import { ollamaOperativeCaseJsonSchema } from "@/domain/jsonSchema";
import { normalizeOperativeCase } from "@/domain/normalize";
import { EvidenceSchema, OperativeCaseSchema } from "@/domain/schema";
import { compactModelExtractionJsonSchema } from "@/extractors/modelExtraction";
import { syntheticCases } from "@/fixtures/syntheticCases";

describe("OperativeCase schema", () => {
  function jsonContainsKey(value: unknown, targetKey: string): boolean {
    if (Array.isArray(value)) {
      return value.some((item) => jsonContainsKey(item, targetKey));
    }
    if (typeof value !== "object" || value === null) {
      return false;
    }
    return Object.entries(value).some(([key, nested]) => key === targetKey || jsonContainsKey(nested, targetKey));
  }

  it("accepts every bundled synthetic fixture", () => {
    for (const fixture of syntheticCases) {
      expect(() => normalizeOperativeCase(fixture.expected)).not.toThrow();
    }
  });

  it("rejects unknown enum values", () => {
    const hero = structuredClone(syntheticCases.find((fixture) => fixture.id === "hero-otomimix-is-joint")!.expected);
    hero.repair.reconstructionType.value = "magic_repair" as never;
    expect(OperativeCaseSchema.safeParse(hero).success).toBe(false);
  });

  it("rejects documented values without evidence", () => {
    const hero = structuredClone(syntheticCases.find((fixture) => fixture.id === "hero-otomimix-is-joint")!.expected);
    hero.anatomy.incus.evidence = [];
    expect(() => normalizeOperativeCase(hero)).toThrow(/no source evidence/i);
  });

  it("rejects malformed evidence offsets", () => {
    expect(
      EvidenceSchema.safeParse({
        sourceText: "The long process of the incus was eroded.",
        startChar: 45,
        confidence: "high",
        extractionMethod: "rules",
      }).success,
    ).toBe(false);
    expect(
      EvidenceSchema.safeParse({
        sourceText: "The long process of the incus was eroded.",
        startChar: 45,
        endChar: 45,
        confidence: "high",
        extractionMethod: "rules",
      }).success,
    ).toBe(false);
  });

  it("recovers missing evidence offsets and warns on repeated source quotes", () => {
    const hero = structuredClone(syntheticCases.find((fixture) => fixture.id === "hero-otomimix-is-joint")!.expected);
    for (const group of [hero.procedure, hero.anatomy, hero.repair]) {
      for (const field of Object.values(group)) {
        field.evidence = [];
      }
    }
    hero.anatomy.incus.evidence = [
      {
        sourceText: "Repeated source quote.",
        confidence: "high",
        extractionMethod: "cloudflare",
      },
    ];

    const recovered = recoverEvidenceSpans(
      hero,
      "Synthetic note. Repeated source quote. Repeated source quote.",
    );

    expect(recovered.case.anatomy.incus.evidence[0]?.startChar).toBe(16);
    expect(recovered.case.anatomy.incus.evidence[0]?.endChar).toBe(38);
    expect(recovered.warnings.join(" ")).toMatch(/appears multiple times/i);
  });

  it("rejects none and not_applicable claims without evidence", () => {
    const normal = structuredClone(syntheticCases.find((fixture) => fixture.id === "normal-ossicular-chain")!.expected);
    normal.repair.reconstructionType.evidence = [];
    normal.repair.reconstructionMaterial.evidence = [];
    expect(() => normalizeOperativeCase(normal)).toThrow(/no source evidence/i);
  });

  it("normalizes conflicting bone cement material and prosthesis type before rendering", () => {
    const hero = structuredClone(syntheticCases.find((fixture) => fixture.id === "hero-otomimix-is-joint")!.expected);
    hero.extractionProvider = "ollama";
    hero.repair.reconstructionType.value = "torp";
    hero.repair.reconstructionType.evidence = hero.repair.reconstructionMaterial.evidence;

    const result = normalizeOperativeCase(hero);

    expect(result.case.repair.reconstructionType.value).toBe("bone_cement_bridge");
    expect(result.case.ambiguities.some((item) => /conflicting prosthesis/i.test(item.message))).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/normalized to bone cement bridge/i);
  });

  it("provides an Ollama-compatible schema without grammar-hostile format or pattern keywords", () => {
    expect(jsonContainsKey(ollamaOperativeCaseJsonSchema, "format")).toBe(false);
    expect(jsonContainsKey(ollamaOperativeCaseJsonSchema, "pattern")).toBe(false);
  });

  it("provides a compact model schema without grammar-hostile format or pattern keywords", () => {
    expect(jsonContainsKey(compactModelExtractionJsonSchema, "format")).toBe(false);
    expect(jsonContainsKey(compactModelExtractionJsonSchema, "pattern")).toBe(false);
  });
});
