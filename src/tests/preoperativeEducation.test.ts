import { describe, expect, it } from "vitest";
import {
  canDisplayStanfordAtlas,
  canDownloadStanfordAtlasSvg,
  parseAtlasUsageRights,
} from "@/domain/atlasUsage";
import { generatePreoperativePatientGuide } from "@/domain/preoperativeEducation";
import { selectProcedureAtlas } from "@/domain/procedureAtlas";
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

describe("procedure atlas selection", () => {
  it.each(procedureCatalog)("selects curated sources for $label", ({ id }) => {
    const selection = selectProcedureAtlas(
      createPresetPlan(id, "preoperative_education"),
      "preoperative_education",
    );

    expect(selection).not.toBeNull();
    expect(selection?.panels.finding.asset.pageLink).toMatch(/^https:\/\/otosurgeryatlas\.stanford\.edu\//);
    expect(selection?.panels.procedure.asset.pageLink).toMatch(/^https:\/\/otosurgeryatlas\.stanford\.edu\//);
    expect(selection?.coverageNote.length).toBeGreaterThan(20);
    expect(selection?.review.status).toBe("needs_clinician_signoff");
  });

  it("labels the bone-conduction source as a generic substrate", () => {
    const selection = selectProcedureAtlas(
      createPresetPlan("bone_conduction_implant", "preoperative_education"),
      "preoperative_education",
    );
    expect(selection?.coverage).toBe("generic_substrate");
    expect(selection?.coverageNote).toMatch(/no bone-conduction implant source/i);
  });

  it("does not infer a completed image from an undocumented action", () => {
    expect(selectProcedureAtlas(planForFamily("tympanoplasty"), "preoperative_education")).toBeNull();
  });

  it("does not place mixed-family actions on the first family background", () => {
    const plan = createPresetPlan("tympanoplasty", "preoperative_education");
    plan.procedureFamilies = ["tympanoplasty", "cochlear_implant"];
    plan.layers.push(
      ...createPresetPlan("cochlear_implant", "preoperative_education").layers,
    );

    expect(selectProcedureAtlas(plan, "preoperative_education")).toBeNull();
  });

  it("rejects unsupported action variants instead of falling through", () => {
    const plan = createPresetPlan("ossiculoplasty", "preoperative_education");
    plan.layers = plan.layers.map((layer) =>
      layer.kind === "ossicular_reconstruction"
        ? { ...layer, method: "bone_cement_bridge" as const }
        : layer,
    );

    expect(selectProcedureAtlas(plan, "preoperative_education")).toBeNull();
  });
});

describe("Stanford usage policy", () => {
  it("defaults unknown rights states to unverified", () => {
    expect(parseAtlasUsageRights("unexpected")).toBe("unverified");
    expect(parseAtlasUsageRights(undefined)).toBe("unverified");
  });

  it("requires clinic permission for the preoperative workflow", () => {
    expect(canDisplayStanfordAtlas("teaching_only", "postoperative_summary")).toBe(true);
    expect(canDisplayStanfordAtlas("teaching_only", "preoperative_education")).toBe(false);
    expect(canDisplayStanfordAtlas("clinic_permission", "preoperative_education")).toBe(true);
  });

  it("does not allow atlas SVG download until image bytes are embedded", () => {
    expect(canDownloadStanfordAtlasSvg("clinic_permission", "remote")).toBe(false);
    expect(canDownloadStanfordAtlasSvg("clinic_permission", "local")).toBe(false);
  });
});
