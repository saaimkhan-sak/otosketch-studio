import { describe, expect, it } from "vitest";
import { getMedicalArtAnchor, medicalArtAssets, selectMedicalArtAsset } from "@/domain/medicalArt";
import { createPresetPlan } from "@/components/app/SurgeryBuilder";

describe("open medical art registry", () => {
  it("uses focused professional art for ossicular and cochlear work", () => {
    expect(
      selectMedicalArtAsset(createPresetPlan("ossiculoplasty", "preoperative_education")).id,
    ).toBe("servier-inner-ear");
    expect(
      selectMedicalArtAsset(createPresetPlan("cochlear_implant", "preoperative_education")).id,
    ).toBe("nih-inner-ear");
    expect(
      selectMedicalArtAsset(createPresetPlan("stapes_surgery", "preoperative_education")).id,
    ).toBe("nih-inner-ear");
    expect(medicalArtAssets["nih-inner-ear"].illustrationSoftware).toBe(
      "Adobe Illustrator 28.6",
    );
    expect(medicalArtAssets["nih-inner-ear"].license).toBe("Public Domain");
  });

  it("uses the full ear cutaway for canal and pressure procedures", () => {
    expect(
      selectMedicalArtAsset(createPresetPlan("canalplasty", "preoperative_education")).id,
    ).toBe("servier-ear-cutaway");
    expect(
      selectMedicalArtAsset(createPresetPlan("eustachian_tube_dilation", "preoperative_education"))
        .id,
    ).toBe("servier-ear-cutaway");
  });

  it("publishes attribution and deterministic anchors for documented layers", () => {
    const plan = createPresetPlan("tympanoplasty", "preoperative_education");
    const layer = plan.layers.find((candidate) => candidate.kind === "tm_perforation");
    expect(layer).toBeDefined();
    expect(medicalArtAssets["servier-ear-cutaway"].license).toBe("CC BY 4.0");
    expect(medicalArtAssets["servier-ear-cutaway"].attribution).toMatch(/Servier/);
    expect(layer ? getMedicalArtAnchor("servier-ear-cutaway", layer) : null).toEqual({
      x: 63.2,
      y: 52.7,
    });
  });
});
