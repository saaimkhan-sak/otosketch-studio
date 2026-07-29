import { describe, expect, it } from "vitest";
import { generatePatientExplanation } from "@/domain/patientText";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("patient text", () => {
  it("explains the hero case without prognosis", () => {
    const text = generatePatientExplanation(
      getSyntheticCase("hero-otomimix-is-joint").expected,
    ).join(" ");
    expect(text).toMatch(/hearing bones/i);
    expect(text).toMatch(/bone cement/i);
    expect(text).not.toMatch(/will improve hearing/i);
  });

  it("does not claim a repair when none was documented", () => {
    const text = generatePatientExplanation(
      getSyntheticCase("incus-long-process-erosion").expected,
    ).join(" ");
    expect(text).not.toMatch(/bridging/i);
    expect(text).not.toMatch(/prosthesis/i);
  });

  it("describes fascia as eardrum repair material", () => {
    const text = generatePatientExplanation(
      getSyntheticCase("normal-ossicular-chain").expected,
    ).join(" ");
    expect(text).toMatch(
      /highlighted atlas region.*fascia covers the eardrum perforation and overlaps its margins.*generic reference/i,
    );
  });

  it("describes prosthesis cartilage as a protective layer rather than an eardrum graft", () => {
    const text = generatePatientExplanation(getSyntheticCase("porp-reconstruction").expected).join(
      " ",
    );
    expect(text).toMatch(/protective cartilage layer over the prosthesis/i);
    expect(text).not.toMatch(/eardrum graft/i);
  });
});
