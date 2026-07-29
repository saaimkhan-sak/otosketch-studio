import { describe, expect, it } from "vitest";
import { selectMedicalArtAsset } from "@/domain/medicalArt";
import { generatePreoperativePatientGuide } from "@/domain/preoperativeEducation";
import {
  createDefaultLayer,
  createEmptySurgeryPlan,
  procedureCatalog,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import { createPresetPlan } from "@/components/app/SurgeryBuilder";

function planForFamily(family: (typeof procedureCatalog)[number]["id"]): SurgeryPlan {
  const entry = procedureCatalog.find((item) => item.id === family);
  if (!entry) throw new Error(`Missing catalog entry for ${family}`);
  return {
    ...createEmptySurgeryPlan(),
    laterality: "right",
    procedureFamilies: [family],
    revisionStatus: "primary",
    baseViews: [...entry.defaultBaseViews],
    sourceSafety: { status: "cleared" },
  };
}

describe("preoperative patient education", () => {
  it.each(procedureCatalog)("creates cautious copy for $label", ({ id }) => {
    const guide = generatePreoperativePatientGuide(planForFamily(id));

    expect(guide.title).toMatch(/^Your planned /);
    expect(guide.goals.length).toBeGreaterThan(0);
    expect(guide.plannedSteps).toEqual([
      "The exact surgical steps are not yet documented. Your surgeon will confirm the plan before surgery.",
    ]);
    expect(guide.whatToExpect.join(" ")).toMatch(/confirm|depend|vary|schedule|may/i);
    expect(guide.limitations.join(" ")).toMatch(/may adapt/i);
    expect(JSON.stringify(guide)).not.toMatch(/undefined|not_documented/);
  });

  it("builds planned graft language only from a documented action layer", () => {
    const plan = planForFamily("tympanoplasty");
    const graft = {
      ...createDefaultLayer("tm_graft", "right"),
      documentation: "documented" as const,
      enteredBy: "clinician" as const,
      material: "temporalis_fascia" as const,
      technique: "medial" as const,
      purpose: "tympanic_membrane_repair" as const,
    };
    plan.layers = [graft];

    const guide = generatePreoperativePatientGuide(plan);

    expect(guide.plannedSteps).toContain(
      "temporalis fascia graft placement is planned using a medial technique.",
    );
    expect(guide.sourceLayerIds).toEqual([graft.id]);
    expect(guide.plannedSteps.join(" ")).not.toMatch(/was placed|completed successfully/i);
  });
});

describe("professional medical-art selection", () => {
  it.each(procedureCatalog)("selects a licensed source for $label", ({ id }) => {
    const selection = selectMedicalArtAsset(
      createPresetPlan(id, "preoperative_education"),
    );

    expect(selection.sourcePage).toMatch(/^https:\/\//);
    expect(["CC BY 4.0", "Public Domain"]).toContain(selection.license);
    expect(selection.localPath).toMatch(/^\/medical-art\//);
  });

  it("uses the NIH Illustrator vector for cochlear and stapes work", () => {
    for (const family of ["cochlear_implant", "stapes_surgery"] as const) {
      const selection = selectMedicalArtAsset(
        createPresetPlan(family, "preoperative_education"),
      );
      expect(selection.id).toBe("nih-inner-ear");
      expect(selection.illustrationSoftware).toBe("Adobe Illustrator 28.6");
      expect(selection.license).toBe("Public Domain");
    }
  });

  it("uses Servier middle-ear art for ossiculoplasty", () => {
    const selection = selectMedicalArtAsset(
      createPresetPlan("ossiculoplasty", "preoperative_education"),
    );
    expect(selection.id).toBe("servier-inner-ear");
    expect(selection.license).toBe("CC BY 4.0");
  });
});
