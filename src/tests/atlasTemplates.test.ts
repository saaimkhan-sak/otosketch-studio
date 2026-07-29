import { describe, expect, it } from "vitest";
import {
  atlasDiagramTemplates,
  getAtlasTemplateBlocker,
  selectAtlasDiagramTemplate,
} from "@/domain/atlasTemplates";
import { updateCaseField } from "@/domain/editCase";
import { getSyntheticCase } from "@/fixtures/syntheticCases";
import atlasIndex from "../../public/atlas-assets/stanford/index.json";

describe("atlas diagram template selection", () => {
  it("selects the tympanoplasty atlas template only for safe no-repair tympanoplasty cases", () => {
    const selection = selectAtlasDiagramTemplate(
      getSyntheticCase("normal-ossicular-chain").expected,
    );

    expect(selection).toMatchObject({
      status: "ready",
      template: {
        id: "atlas-tympanoplasty-handout",
        atlasAsset: { id: 1169 },
        panelAssets: { found: { id: 1169 }, repaired: { id: 1177 } },
      },
    });
    expect(
      selection.status === "ready" ? selection.callouts.map((callout) => callout.id) : [],
    ).toContain("feature-no-repair");
  });

  it("blocks repair rendering when narrow negative wording does not establish a global no-repair state", () => {
    const incusErosion = selectAtlasDiagramTemplate(
      getSyntheticCase("incus-long-process-erosion").expected,
    );
    const isDiscontinuity = selectAtlasDiagramTemplate(
      getSyntheticCase("is-joint-discontinuity").expected,
    );

    expect(incusErosion).toMatchObject({
      status: "blocked",
      reason: expect.stringMatching(/not documented/i),
    });
    expect(isDiscontinuity).toMatchObject({
      status: "blocked",
      reason: expect.stringMatching(/not documented/i),
    });
  });

  it("uses reviewed PORP and TORP atlas templates for prosthesis cases", () => {
    expect(
      selectAtlasDiagramTemplate(getSyntheticCase("porp-reconstruction").expected),
    ).toMatchObject({
      status: "ready",
      template: { id: "atlas-porp-reference", atlasAsset: { id: 1736 } },
    });
    expect(
      selectAtlasDiagramTemplate(getSyntheticCase("torp-reconstruction").expected),
    ).toMatchObject({
      status: "ready",
      template: { id: "atlas-torp-reference", atlasAsset: { id: 1737 } },
    });
  });

  it("keeps the ossiculoplasty patient handout in the atlas template registry", () => {
    expect(atlasDiagramTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "atlas-ossiculoplasty-handout",
          atlasAsset: expect.objectContaining({ id: 2122 }),
        }),
      ]),
    );
  });

  it("keeps reviewed template asset metadata aligned with the scraped atlas index", () => {
    const indexedAssets = new Map(atlasIndex.assets.map((asset) => [asset.id, asset]));
    const templateAssets = atlasDiagramTemplates.flatMap((template) => [
      template.atlasAsset,
      ...Object.values(template.panelAssets ?? {}),
    ]);
    const uniqueTemplateAssets = Array.from(
      new Map(templateAssets.map((asset) => [asset.id, asset])).values(),
    );

    for (const templateAsset of uniqueTemplateAssets) {
      const indexedAsset = indexedAssets.get(templateAsset.id);
      expect(indexedAsset, `Missing atlas index entry for asset ${templateAsset.id}`).toBeDefined();
      expect(templateAsset.sourceUrl).toBe(indexedAsset?.sourceUrl);
      expect(templateAsset.localPath).toBe(indexedAsset?.localPath);
    }
  });

  it("documents rationale, limitations, calibration, and review status for every template", () => {
    for (const template of atlasDiagramTemplates) {
      expect(
        template.selectionRationale.length,
        `${template.id} selection rationale`,
      ).toBeGreaterThan(0);
      expect(template.limitations.length, `${template.id} limitations`).toBeGreaterThan(0);
      expect(template.review.statusLabel, `${template.id} review label`).toMatch(
        /review|sign-off/i,
      );
      expect(template.review.reviewedBy, `${template.id} reviewer`).toBeTruthy();
      expect(template.review.reviewedAtIso, `${template.id} review date`).toMatch(/2026-06-30/);
      expect(template.calibration.coordinateSystem).toBe("source_image_pixels");
      expect(template.calibration.note).toMatch(/pixel coordinates/i);
      expect(template.panelCoverage.found).toBeDefined();
      expect(template.panelCoverage.repaired).toBeDefined();
      expect(template.panelCoverage.found.referenceOnlyAnatomy.length).toBeGreaterThan(0);
      expect(template.panelCoverage.repaired.referenceOnlyAnatomy.length).toBeGreaterThan(0);
    }
  });

  it("renders the documented OtoMimix bridge with a deterministic atlas overlay", () => {
    const selection = selectAtlasDiagramTemplate(
      getSyntheticCase("hero-otomimix-is-joint").expected,
    );

    expect(selection).toMatchObject({
      status: "ready",
      template: {
        id: "atlas-otomimix-bone-cement-bridge",
        atlasAsset: { id: 1723 },
        overlays: [
          expect.objectContaining({ id: "overlay-otomimix-bridge", kind: "bone_cement_bridge" }),
        ],
      },
    });
    expect(
      selection.status === "ready" ? selection.callouts.map((callout) => callout.id) : [],
    ).toContain("feature-reconstruction");
    expect(getAtlasTemplateBlocker(getSyntheticCase("hero-otomimix-is-joint").expected)).toMatch(
      /unsigned/i,
    );
  });

  it("labels laterality without claiming that the generic atlas image is lateralized", () => {
    const selection = selectAtlasDiagramTemplate(getSyntheticCase("porp-reconstruction").expected);
    expect(selection.status === "ready" ? selection.lateralityLabel : "").toBe(
      "LEFT EAR · GENERIC REFERENCE (NOT LATERALIZED)",
    );
  });

  it("uses a source-depicted central perforation and a non-anchored mobility status", () => {
    const selection = selectAtlasDiagramTemplate(
      getSyntheticCase("normal-ossicular-chain").expected,
    );
    if (selection.status !== "ready") throw new Error("Normal fixture should have a template.");
    expect(selection.callouts.find((callout) => callout.id === "feature-tm")).toMatchObject({
      representation: "source_reference",
      detail: expect.stringMatching(/source shows a central perforation/i),
    });
    expect(selection.callouts.find((callout) => callout.id === "feature-stapes")).toMatchObject({
      kind: "status",
      anchor: undefined,
    });
    expect(getAtlasTemplateBlocker(getSyntheticCase("normal-ossicular-chain").expected)).toMatch(
      /otologist approval/i,
    );
  });

  it("renders the documented tympanoplasty graft as an explicit schematic overlay", () => {
    const selection = selectAtlasDiagramTemplate(
      getSyntheticCase("normal-ossicular-chain").expected,
    );
    if (selection.status !== "ready") throw new Error("Normal fixture should have a template.");

    expect(selection.template.overlays).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "overlay-tympanoplasty-graft-region",
          kind: "tm_graft_patch",
          featureId: "feature-graft",
        }),
      ]),
    );
    expect(selection.callouts.find((callout) => callout.id === "feature-graft")).toMatchObject({
      representation: "schematic_overlay",
      detail: expect.stringMatching(/source graft covers the defect and overlaps its margins/i),
    });

    expect(selection.template.panelAssets).toMatchObject({
      found: { id: 1169 },
      repaired: { id: 1177 },
    });
    expect(selection.template.atlasAsset.id).not.toBe(2121);
  });

  it("classifies every visible claim by how it is represented", () => {
    for (const caseId of [
      "normal-ossicular-chain",
      "hero-otomimix-is-joint",
      "porp-reconstruction",
      "torp-reconstruction",
    ]) {
      const selection = selectAtlasDiagramTemplate(getSyntheticCase(caseId).expected);
      if (selection.status !== "ready") throw new Error(`${caseId} should have a template.`);
      for (const callout of selection.callouts) {
        expect(callout.representation, `${caseId}: ${callout.id}`).toMatch(
          /source_reference|schematic_overlay|marker_only|status_only/,
        );
        expect(callout.detail, `${caseId}: ${callout.id}`).toMatch(
          /reference|schematic|static image|generic|intentionally does not draw/i,
        );
      }
    }
  });

  it("blocks bone cement bridge when the exact OtoMimix bridge pattern is not documented", () => {
    const mismatchedCase = updateCaseField(
      getSyntheticCase("porp-reconstruction").expected,
      "repair.reconstructionType",
      "bone_cement_bridge",
    );

    expect(selectAtlasDiagramTemplate(mismatchedCase)).toMatchObject({
      status: "blocked",
      reason: expect.stringMatching(/bone-cement/i),
    });
  });
});
