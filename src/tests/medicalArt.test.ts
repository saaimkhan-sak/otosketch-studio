import { describe, expect, it } from "vitest";
import {
  getMedicalArtAnchor,
  getMedicalArtAnchorForTarget,
  medicalArtAnchors,
  medicalArtAssets,
  medicalArtPixelAnchors,
  medicalArtSourceGeometry,
  selectMedicalArtAsset,
} from "@/domain/medicalArt";
import {
  createDefaultLayer,
  deriveSurgeryPlanFromCase,
  getActiveSurgeryLayers,
  type SurgeryLayer,
} from "@/domain/surgeryPlan";
import { getSyntheticCase, syntheticCases } from "@/fixtures/syntheticCases";
import { createPresetPlan } from "@/components/app/SurgeryBuilder";

const commonProcedureIds = [
  "myringotomy_tympanostomy",
  "tympanoplasty",
  "ossiculoplasty",
  "tympanomastoidectomy",
  "stapes_surgery",
  "cochlear_implant",
  "bone_conduction_implant",
  "canalplasty",
  "eustachian_tube_dilation",
] as const;

function expectsAnatomyPlacement(layer: SurgeryLayer) {
  return !["verification_status", "intraoperative_deviation"].includes(layer.kind);
}

describe("open medical art registry", () => {
  it("uses focused professional art for ossicular, stapes, and cochlear work", () => {
    expect(
      selectMedicalArtAsset(createPresetPlan("ossiculoplasty", "preoperative_education")).id,
    ).toBe("servier-inner-ear");
    expect(
      selectMedicalArtAsset(createPresetPlan("cochlear_implant", "preoperative_education")).id,
    ).toBe("nih-inner-ear");
    expect(
      selectMedicalArtAsset(createPresetPlan("stapes_surgery", "preoperative_education")).id,
    ).toBe("servier-inner-ear");
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

  it("uses dedicated ossicular anatomy whenever an extracted case documents an ossicle", () => {
    const extractedPlan = deriveSurgeryPlanFromCase(
      getSyntheticCase("incus-long-process-erosion").expected,
    );

    expect(selectMedicalArtAsset(extractedPlan).id).toBe("servier-inner-ear");
  });

  it("publishes attribution and deterministic anchors for documented layers", () => {
    const plan = createPresetPlan("tympanoplasty", "preoperative_education");
    const layer = plan.layers.find((candidate) => candidate.kind === "tm_perforation");
    expect(layer).toBeDefined();
    expect(medicalArtAssets["servier-ear-cutaway"].license).toBe("CC BY 4.0");
    expect(medicalArtAssets["servier-ear-cutaway"].attribution).toMatch(/Servier/);
    expect(layer ? getMedicalArtAnchor("servier-ear-cutaway", layer) : null).toEqual({
      x: 63,
      y: 54.2,
    });
  });

  it("calibrates the incus long process to the ossicular chain rather than the labyrinth", () => {
    const layer = {
      ...createDefaultLayer("ossicle_state", "right"),
      documentation: "documented" as const,
      structure: "incus" as const,
      state: "long_process_eroded" as const,
    };

    expect(getMedicalArtAnchor("servier-inner-ear", layer)).toEqual({
      x: (149 / 584) * 100,
      y: (193 / 370) * 100,
    });
    expect(getMedicalArtAnchor("servier-inner-ear", layer)?.y).toBeGreaterThan(50);
  });

  it("separates the PORP capitulum seat from the stapes arch and footplate", () => {
    const pixels = medicalArtPixelAnchors["servier-inner-ear"];
    expect(pixels?.tm_prosthesis_contact).toEqual({ x: 53, y: 254 });
    expect(pixels?.stapes_capitulum).toEqual({ x: 181, y: 211 });
    expect(pixels?.stapes_superstructure).toEqual({ x: 207, y: 191 });
    expect(pixels?.stapes_footplate).toEqual({ x: 230, y: 183 });

    const capitulum = getMedicalArtAnchorForTarget(
      "servier-inner-ear",
      "stapes_capitulum",
    );
    const footplate = getMedicalArtAnchorForTarget(
      "servier-inner-ear",
      "stapes_footplate",
    );
    expect(capitulum?.x).toBeLessThan(footplate?.x ?? 0);
    expect((pixels?.stapes_footplate?.x ?? 0) - (pixels?.stapes_capitulum?.x ?? 0)).toBe(49);

    const contact = pixels?.tm_prosthesis_contact;
    const porpSeat = pixels?.stapes_capitulum;
    const torpSeat = pixels?.stapes_footplate;
    expect(contact).toBeDefined();
    expect(porpSeat).toBeDefined();
    expect(torpSeat).toBeDefined();
    if (contact && porpSeat && torpSeat) {
      expect(Math.hypot(porpSeat.x - contact.x, porpSeat.y - contact.y)).toBeCloseTo(
        135.03,
        1,
      );
      expect(
        (Math.atan2(porpSeat.y - contact.y, porpSeat.x - contact.x) * 180) / Math.PI,
      ).toBeCloseTo(-18.56, 1);
      expect(Math.hypot(torpSeat.x - contact.x, torpSeat.y - contact.y)).toBeCloseTo(
        190.71,
        1,
      );
      expect(
        (Math.atan2(torpSeat.y - contact.y, torpSeat.x - contact.x) * 180) / Math.PI,
      ).toBeCloseTo(-21.86, 1);
    }
  });

  it("keeps graft and erosion shapes calibrated to their licensed source pixels", () => {
    const innerEarGeometry = medicalArtSourceGeometry["servier-inner-ear"];
    const cutawayGeometry = medicalArtSourceGeometry["servier-ear-cutaway"];

    expect(innerEarGeometry?.calibrationId).toBe(
      "servier-inner-ear-ossicles-2026-07",
    );
    expect(innerEarGeometry?.tympanicMembrane?.repairGraftPath).toContain("M 5 179");
    expect(innerEarGeometry?.ossicles?.incusLongProcessMaskPath).toContain("M 112 145");
    expect(innerEarGeometry?.ossicles?.stapesSuperstructureMaskPaths).toHaveLength(2);
    expect(cutawayGeometry?.tympanicMembrane?.repairGraftPath).toContain("M 734 505");
  });

  it("never invents anatomy coordinates for non-anatomic status layers", () => {
    const verification = {
      ...createDefaultLayer("verification_status", "right"),
      documentation: "documented" as const,
      verification: "ossicular_mobility" as const,
      result: "confirmed" as const,
    };

    for (const assetId of Object.keys(medicalArtAssets) as Array<
      keyof typeof medicalArtAssets
    >) {
      expect(getMedicalArtAnchor(assetId, verification)).toBeNull();
    }
  });

  it("keeps every audited source coordinate inside its source illustration", () => {
    for (const assetAnchors of Object.values(medicalArtAnchors)) {
      for (const anchor of Object.values(assetAnchors)) {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThanOrEqual(100);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it("has an explicit source-specific anchor for every documented visual layer", () => {
    const plans = [
      ...commonProcedureIds.map((procedure) =>
        createPresetPlan(procedure, "preoperative_education"),
      ),
      ...syntheticCases.map((fixture) => deriveSurgeryPlanFromCase(fixture.expected)),
    ];

    for (const plan of plans) {
      const asset = selectMedicalArtAsset(plan);
      for (const layer of getActiveSurgeryLayers(plan).filter(
        (candidate) =>
          candidate.documentation === "documented" && expectsAnatomyPlacement(candidate),
      )) {
        expect(
          getMedicalArtAnchor(asset.id, layer),
          `${asset.id} is missing an anchor for ${layer.kind}:${layer.id}`,
        ).not.toBeNull();
      }
    }
  });
});
