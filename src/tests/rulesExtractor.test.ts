import { describe, expect, it } from "vitest";
import { rulesExtractor } from "@/extractors/rulesExtractor";
import { getSyntheticCase, syntheticCases } from "@/fixtures/syntheticCases";
import { adversarialCaseNotes } from "@/fixtures/adversarialCases";

async function extract(note: string) {
  return rulesExtractor.extract({ note, provider: "rules" });
}

describe("rulesExtractor", () => {
  it("matches gold fixture fields across the bundled synthetic corpus", async () => {
    for (const fixture of syntheticCases) {
      const result = await extract(fixture.note);
      expect(result.case.procedure.family.value, fixture.id).toBe(fixture.expected.procedure.family.value);
      expect(result.case.procedure.laterality.value, fixture.id).toBe(fixture.expected.procedure.laterality.value);
      expect(result.case.anatomy.tympanicMembrane.value, fixture.id).toBe(
        fixture.expected.anatomy.tympanicMembrane.value,
      );
      expect(result.case.anatomy.malleus.value, fixture.id).toBe(fixture.expected.anatomy.malleus.value);
      expect(result.case.anatomy.incus.value, fixture.id).toBe(fixture.expected.anatomy.incus.value);
      expect(result.case.anatomy.incudostapedialJoint.value, fixture.id).toBe(
        fixture.expected.anatomy.incudostapedialJoint.value,
      );
      expect(result.case.anatomy.stapes.value, fixture.id).toBe(fixture.expected.anatomy.stapes.value);
      expect(result.case.repair.reconstructionType.value, fixture.id).toBe(
        fixture.expected.repair.reconstructionType.value,
      );
      expect(result.case.repair.reconstructionMaterial.value, fixture.id).toBe(
        fixture.expected.repair.reconstructionMaterial.value,
      );
      expect(result.case.repair.graftType.value, fixture.id).toBe(fixture.expected.repair.graftType.value);
    }
  });

  it("extracts the OtoMimix hero case", async () => {
    const note = getSyntheticCase("hero-otomimix-is-joint").note;
    const result = await extract(note);
    expect(result.case.procedure.laterality.value).toBe("left");
    expect(result.case.anatomy.incus.value).toBe("long_process_eroded");
    expect(result.case.anatomy.incudostapedialJoint.value).toBe("discontinuous");
    expect(result.case.repair.reconstructionType.value).toBe("bone_cement_bridge");
    expect(result.case.repair.reconstructionMaterial.value).toBe("otomimix");
  });

  it("recovers character offsets for rule-derived source evidence", async () => {
    const note = getSyntheticCase("hero-otomimix-is-joint").note;
    const result = await extract(note);
    const incusEvidence = result.case.anatomy.incus.evidence[0];
    const reconstructionEvidence = result.case.repair.reconstructionMaterial.evidence[0];

    for (const evidence of [incusEvidence, reconstructionEvidence]) {
      expect(evidence?.startChar).toBeTypeOf("number");
      expect(evidence?.endChar).toBeTypeOf("number");
      expect(note.slice(evidence!.startChar, evidence!.endChar)).toBe(evidence!.sourceText);
    }
  });

  it("does not render negated incus erosion or prosthesis", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "negated-incus-erosion")!.note;
    const result = await extract(note);
    expect(result.case.anatomy.incus.value).not.toBe("long_process_eroded");
    expect(result.case.repair.reconstructionType.value).not.toBe("porp");
    expect(result.case.repair.reconstructionType.value).not.toBe("torp");
  });

  it("warns instead of rendering uncertain incus erosion", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "uncertain-incus-erosion")!.note;
    const result = await extract(note);
    expect(result.case.anatomy.incus.value).toBe("not_documented");
    expect(result.case.ambiguities.some((item) => /Possible incus erosion/i.test(item.message))).toBe(true);
  });

  it("marks contradictory stapes and PORP text for review", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "contradictory-stapes-porp")!.note;
    const result = await extract(note);
    expect(result.case.anatomy.stapes.value).toBe("superstructure_absent");
    expect(result.case.repair.reconstructionType.value).toBe("porp");
    expect(result.case.ambiguities.some((item) => item.severity === "critical")).toBe(true);
  });

  it("keeps missing laterality as not documented", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "missing-laterality")!.note;
    const result = await extract(note);
    expect(result.case.procedure.laterality.value).toBe("not_documented");
    expect(result.case.ambiguities.some((item) => /Laterality/.test(item.message))).toBe(true);
  });

  it("does not invent a reconstruction type from ossiculoplasty alone", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "unsupported-ossiculoplasty-inference")!.note;
    const result = await extract(note);
    expect(result.case.procedure.family.value).toBe("ossiculoplasty");
    expect(result.case.repair.reconstructionType.value).toBe("not_documented");
  });

  it("does not infer no graft from an intact tympanic membrane", async () => {
    const result = await extract(
      "Synthetic operative note. Left tympanoplasty. The tympanic membrane was intact after flap elevation.",
    );
    expect(result.case.anatomy.tympanicMembrane.value).toBe("intact");
    expect(result.case.repair.graftType.value).toBe("not_documented");
  });

  it("extracts supported abbreviation-heavy IS joint and HA cement text", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "abbreviation-heavy")!.note;
    const result = await extract(note);
    expect(result.case.procedure.laterality.value).toBe("right");
    expect(result.case.anatomy.incudostapedialJoint.value).toBe("discontinuous");
    expect(result.case.repair.reconstructionType.value).toBe("bone_cement_bridge");
    expect(result.case.repair.reconstructionMaterial.value).toBe("hydroxyapatite_bone_cement");
    expect(result.case.repair.reconstructionMaterial.evidence[0]?.confidence).toBe("medium");
  });

  it("blocks unsupported procedures", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "unsupported-procedure")!.note;
    const result = await extract(note);
    expect(result.case.procedure.family.value).toBe("unsupported");
    expect(result.case.safety.suitableForRendering).toBe(false);
  });

  it("flags PHI-like input", async () => {
    const note = adversarialCaseNotes.find((item) => item.id === "phi-like-input")!.note;
    const result = await extract(note);
    expect(result.case.safety.containsPossiblePhi).toBe(true);
    expect(result.case.safety.suitableForRendering).toBe(false);
  });
});
