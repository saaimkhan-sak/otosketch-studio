import { describe, expect, it } from "vitest";
import { mockExtractor } from "@/extractors/mockExtractor";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("mockExtractor fixture selection", () => {
  it("returns expected output for an exact bundled example", async () => {
    const fixture = getSyntheticCase("hero-otomimix-is-joint");

    const result = await mockExtractor.extract({
      note: fixture.note,
      caseHint: fixture.id,
      provider: "mock",
    });

    expect(result.case).toMatchObject({
      caseId: fixture.id,
      extractionProvider: "mock",
      repair: { reconstructionType: { value: "bone_cement_bridge" } },
    });
  });

  it("uses the custom note rather than a stale selected-case hint", async () => {
    const result = await mockExtractor.extract({
      note: [
        "Synthetic operative note for demonstration only.",
        "Procedure: Right tympanoplasty.",
        "The tympanic membrane was intact.",
        "No ossicular reconstruction was performed.",
      ].join(" "),
      caseHint: "hero-otomimix-is-joint",
      provider: "mock",
    });

    expect(result.case).toMatchObject({
      caseId: "rules-generated",
      extractionProvider: "rules",
      procedure: { laterality: { value: "right" } },
      anatomy: { tympanicMembrane: { value: "intact" } },
      repair: { reconstructionType: { value: "none" } },
    });
    expect(result.case.repair.reconstructionType.value).not.toBe("bone_cement_bridge");
    expect(result.warnings.join(" ")).toMatch(/custom note was extracted with simple rules/i);
  });

  it("matches an exact bundled note even when the selected-case hint is stale", async () => {
    const fixture = getSyntheticCase("porp-reconstruction");

    const result = await mockExtractor.extract({
      note: fixture.note,
      caseHint: "hero-otomimix-is-joint",
      provider: "mock",
    });

    expect(result.case).toMatchObject({
      caseId: fixture.id,
      extractionProvider: "mock",
      repair: { reconstructionType: { value: "porp" } },
    });
  });
});
