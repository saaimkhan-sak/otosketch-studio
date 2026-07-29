import { describe, expect, it } from "vitest";
import {
  SurgeryLayerSchema,
  SurgeryPlanSchema,
  approvedBaseViewsForLayerKind,
  createDefaultLayer,
  createEmptySurgeryPlan,
  deriveRenderableBaseViews,
  deriveSurgeryPlanFromCase,
  getActiveSurgeryLayers,
  layerCatalog,
  normalizeSurgeryPlan,
  procedureCatalog,
  type SurgeryLayer,
  type SurgeryPlan,
  validateSurgeryPlan,
} from "@/domain/surgeryPlan";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

function reviewedPlan(
  family: Exclude<SurgeryPlan["procedureFamilies"], "not_documented">[number],
  layers: SurgeryLayer[],
): SurgeryPlan {
  return {
    ...createEmptySurgeryPlan(),
    laterality: "right",
    procedureFamilies: [family],
    sourceSafety: { status: "cleared" },
    review: { status: "approved_by_clinician" },
    layers,
  };
}

function issueCodes(plan: SurgeryPlan) {
  return validateSurgeryPlan(plan).issues.map((issue) => issue.code);
}

type LayerOf<Kind extends SurgeryLayer["kind"]> = Extract<SurgeryLayer, { kind: Kind }>;

function clinicianLayer() {
  return {
    side: "right" as const,
    documentation: "documented" as const,
    evidence: [],
    enteredBy: "clinician" as const,
  };
}

function square(left: number, top: number, right: number, bottom: number) {
  return {
    basis: "clinician_authored" as const,
    points: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
  };
}

function documentedPerforation(
  overrides: Partial<LayerOf<"tm_perforation">> = {},
): LayerOf<"tm_perforation"> {
  return {
    ...clinicianLayer(),
    id: "perforation",
    kind: "tm_perforation",
    role: "finding",
    region: "central",
    geometry: square(0.4, 0.4, 0.6, 0.6),
    ...overrides,
  };
}

function documentedGraft(overrides: Partial<LayerOf<"tm_graft">> = {}): LayerOf<"tm_graft"> {
  return {
    ...clinicianLayer(),
    id: "graft",
    kind: "tm_graft",
    role: "action",
    material: "temporalis_fascia",
    technique: "medial",
    purpose: "tympanic_membrane_repair",
    targetLayerId: "perforation",
    geometry: square(0.3, 0.3, 0.7, 0.7),
    ...overrides,
  };
}

function documentedReconstruction(
  overrides: Partial<LayerOf<"ossicular_reconstruction">> = {},
): LayerOf<"ossicular_reconstruction"> {
  return {
    ...clinicianLayer(),
    id: "reconstruction",
    kind: "ossicular_reconstruction",
    role: "action",
    method: "porp",
    material: "titanium",
    lateralEndpoint: "tympanic_membrane",
    medialEndpoint: "stapes_superstructure",
    ...overrides,
  };
}

describe("composable surgery plans", () => {
  it("publishes every core procedure and a safe default for every finite layer kind", () => {
    expect(procedureCatalog.map((entry) => entry.id)).toEqual([
      "myringotomy_tympanostomy",
      "tympanoplasty",
      "ossiculoplasty",
      "tympanomastoidectomy",
      "stapes_surgery",
      "cochlear_implant",
      "bone_conduction_implant",
      "canalplasty",
      "eustachian_tube_dilation",
    ]);
    for (const entry of layerCatalog) {
      expect(SurgeryLayerSchema.safeParse(createDefaultLayer(entry.kind, "left")).success).toBe(
        true,
      );
    }
  });

  it("blocks a graft that does not cover its target perforation", () => {
    const perforation: LayerOf<"tm_perforation"> = {
      ...clinicianLayer(),
      id: "perforation",
      kind: "tm_perforation",
      role: "finding",
      region: "central",
      geometry: {
        basis: "clinician_authored",
        points: [
          { x: 0.4, y: 0.4 },
          { x: 0.6, y: 0.4 },
          { x: 0.6, y: 0.6 },
          { x: 0.4, y: 0.6 },
        ],
      },
    };
    const graft: LayerOf<"tm_graft"> = {
      ...clinicianLayer(),
      id: "graft",
      kind: "tm_graft",
      role: "action",
      material: "temporalis_fascia",
      technique: "medial",
      purpose: "tympanic_membrane_repair",
      targetLayerId: "perforation",
      geometry: {
        basis: "clinician_authored",
        points: [
          { x: 0.52, y: 0.48 },
          { x: 0.72, y: 0.48 },
          { x: 0.72, y: 0.68 },
          { x: 0.52, y: 0.68 },
        ],
      },
    };
    const invalid = reviewedPlan("tympanoplasty", [perforation, graft]);

    expect(issueCodes(invalid)).toContain("graft_does_not_cover_perforation");
    expect(validateSurgeryPlan(invalid).canRender).toBe(false);

    const coveringGraft: LayerOf<"tm_graft"> = {
      ...graft,
      geometry: {
        basis: "clinician_authored",
        points: [
          { x: 0.3, y: 0.3 },
          { x: 0.7, y: 0.3 },
          { x: 0.7, y: 0.7 },
          { x: 0.3, y: 0.7 },
        ],
      },
    };
    expect(issueCodes(reviewedPlan("tympanoplasty", [perforation, coveringGraft]))).not.toContain(
      "graft_does_not_cover_perforation",
    );
  });

  it("requires a true positive graft margin rather than accepting an identical boundary", () => {
    const perforation = documentedPerforation();
    const identicalBoundary = documentedGraft({ geometry: perforation.geometry });
    expect(issueCodes(reviewedPlan("tympanoplasty", [perforation, identicalBoundary]))).toContain(
      "graft_does_not_cover_perforation",
    );

    const subToleranceMargin = documentedGraft({
      geometry: square(0.39999999, 0.39999999, 0.60000001, 0.60000001),
    });
    expect(issueCodes(reviewedPlan("tympanoplasty", [perforation, subToleranceMargin]))).toContain(
      "graft_does_not_cover_perforation",
    );

    expect(
      issueCodes(reviewedPlan("tympanoplasty", [perforation, documentedGraft()])),
    ).not.toContain("graft_does_not_cover_perforation");
  });

  it("rejects zero-area and self-intersecting graft coverage polygons", () => {
    const perforation = documentedPerforation();
    const zeroArea = documentedGraft({
      geometry: {
        basis: "clinician_authored",
        points: [
          { x: 0.3, y: 0.3 },
          { x: 0.5, y: 0.5 },
          { x: 0.7, y: 0.7 },
        ],
      },
    });
    expect(issueCodes(reviewedPlan("tympanoplasty", [perforation, zeroArea]))).toContain(
      "graft_geometry_invalid",
    );

    const selfIntersecting = documentedGraft({
      geometry: {
        basis: "clinician_authored",
        points: [
          { x: 0.3, y: 0.3 },
          { x: 0.7, y: 0.7 },
          { x: 0.7, y: 0.3 },
          { x: 0.3, y: 0.7 },
        ],
      },
    });
    expect(issueCodes(reviewedPlan("tympanoplasty", [perforation, selfIntersecting]))).toContain(
      "graft_geometry_invalid",
    );
  });

  it("validates graft material, purpose, explicit target kind, and target existence", () => {
    const perforation = documentedPerforation();
    expect(
      issueCodes(
        reviewedPlan("tympanoplasty", [
          perforation,
          documentedGraft({
            material: "none",
            purpose: "tympanic_membrane_repair",
          }),
        ]),
      ),
    ).toContain("graft_absent_with_repair_details");

    const unknownDetails = validateSurgeryPlan(
      reviewedPlan("tympanoplasty", [
        perforation,
        documentedGraft({ material: "not_documented", purpose: "not_documented" }),
      ]),
    );
    expect(unknownDetails.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining(["graft_material_not_documented", "graft_purpose_not_documented"]),
    );
    expect(unknownDetails.requiresClinicianReview).toBe(true);

    expect(
      issueCodes(
        reviewedPlan("tympanoplasty", [perforation, documentedGraft({ targetLayerId: undefined })]),
      ),
    ).toContain("graft_target_missing");
    expect(
      issueCodes(
        reviewedPlan("tympanoplasty", [
          perforation,
          documentedGraft({ targetLayerId: "not-present" }),
        ]),
      ),
    ).toContain("graft_target_missing");
    expect(
      issueCodes(
        reviewedPlan("tympanoplasty", [
          documentedReconstruction(),
          documentedGraft({ targetLayerId: "reconstruction" }),
        ]),
      ),
    ).toContain("graft_target_kind_mismatch");
  });

  it("blocks cross-side graft targets and treats unknown target laterality as review-only", () => {
    const crossSidePlan = {
      ...reviewedPlan("tympanoplasty", [
        documentedPerforation({ side: "left" }),
        documentedGraft({ side: "right" }),
      ]),
      laterality: "bilateral" as const,
    };
    expect(issueCodes(crossSidePlan)).toContain("graft_target_side_mismatch");

    const unknownSidePlan = {
      ...reviewedPlan("tympanoplasty", [
        documentedPerforation({ side: "right" }),
        documentedGraft({ side: "not_documented" }),
      ]),
      laterality: "bilateral" as const,
    };
    const validation = validateSurgeryPlan(unknownSidePlan);
    expect(validation.issues.map((item) => item.code)).toContain(
      "graft_target_side_not_documented",
    );
    expect(validation.canRender).toBe(true);
    expect(validation.requiresClinicianReview).toBe(true);
  });

  it("requires a prosthesis-protection graft to target a same-side active reconstruction", () => {
    const reconstruction = documentedReconstruction();
    const protection = documentedGraft({
      material: "cartilage",
      purpose: "prosthesis_protection",
      targetLayerId: reconstruction.id,
      geometry: undefined,
    });
    const validCodes = issueCodes(reviewedPlan("ossiculoplasty", [reconstruction, protection]));
    expect(validCodes).not.toContain("graft_target_kind_mismatch");
    expect(validCodes).not.toContain("graft_target_side_mismatch");

    expect(
      issueCodes(
        reviewedPlan("ossiculoplasty", [
          documentedPerforation(),
          { ...protection, targetLayerId: "perforation" },
        ]),
      ),
    ).toContain("graft_target_kind_mismatch");

    const crossSide = {
      ...reviewedPlan("ossiculoplasty", [documentedReconstruction({ side: "left" }), protection]),
      laterality: "bilateral" as const,
    };
    expect(issueCodes(crossSide)).toContain("graft_target_side_mismatch");

    expect(
      issueCodes(
        reviewedPlan("ossiculoplasty", [
          documentedReconstruction({ method: "none", material: "not_applicable" }),
          protection,
        ]),
      ),
    ).toContain("prosthesis_protection_without_reconstruction");
  });

  it("blocks explicit layer/plan side mismatches and reviews unknown laterality", () => {
    const mismatch = reviewedPlan("tympanoplasty", [documentedPerforation({ side: "left" })]);
    expect(issueCodes(mismatch)).toContain("layer_plan_side_mismatch");

    const unknownLayer = reviewedPlan("tympanoplasty", [
      documentedPerforation({ side: "not_documented" }),
    ]);
    const unknownLayerValidation = validateSurgeryPlan(unknownLayer);
    expect(unknownLayerValidation.issues.map((item) => item.code)).toContain(
      "layer_laterality_not_documented",
    );
    expect(unknownLayerValidation.canRender).toBe(true);

    const unknownPlan = {
      ...reviewedPlan("tympanoplasty", [documentedPerforation()]),
      laterality: "not_documented" as const,
    };
    expect(issueCodes(unknownPlan)).toContain("layer_plan_laterality_not_documented");
  });

  it("requires PORP and TORP to terminate on their clinically compatible endpoints", () => {
    const porp: LayerOf<"ossicular_reconstruction"> = {
      ...clinicianLayer(),
      id: "porp",
      kind: "ossicular_reconstruction",
      role: "action",
      method: "porp",
      material: "titanium",
      lateralEndpoint: "tympanic_membrane",
      medialEndpoint: "stapes_superstructure",
    };
    expect(issueCodes(reviewedPlan("ossiculoplasty", [porp]))).not.toContain(
      "porp_invalid_endpoints",
    );
    expect(
      issueCodes(reviewedPlan("ossiculoplasty", [{ ...porp, medialEndpoint: "stapes_footplate" }])),
    ).toContain("porp_invalid_endpoints");

    const torp: LayerOf<"ossicular_reconstruction"> = {
      ...porp,
      id: "torp",
      method: "torp",
      medialEndpoint: "stapes_footplate",
    };
    expect(issueCodes(reviewedPlan("ossiculoplasty", [torp]))).not.toContain(
      "torp_invalid_endpoints",
    );
    expect(
      issueCodes(
        reviewedPlan("ossiculoplasty", [{ ...torp, medialEndpoint: "stapes_superstructure" }]),
      ),
    ).toContain("torp_invalid_endpoints");
  });

  it("blocks canal-wall-up and canal-wall-down as one completed mastoid state", () => {
    const canalWallUp: LayerOf<"mastoid_technique"> = {
      ...clinicianLayer(),
      id: "cwu",
      kind: "mastoid_technique",
      role: "action",
      technique: "canal_wall_up",
    };
    const canalWallDown: LayerOf<"mastoid_technique"> = {
      ...canalWallUp,
      id: "cwd",
      technique: "canal_wall_down",
    };

    expect(
      issueCodes(reviewedPlan("tympanomastoidectomy", [canalWallUp, canalWallDown])),
    ).toContain("mastoid_canal_wall_conflict");
  });

  it("blocks stapedotomy and stapedectomy as simultaneous completed techniques", () => {
    const stapedotomy: LayerOf<"stapes_procedure"> = {
      ...clinicianLayer(),
      id: "stapedotomy",
      kind: "stapes_procedure",
      role: "action",
      technique: "stapedotomy",
      fenestra: "small",
      pistonAttachment: "incus_long_process",
    };
    const stapedectomy: LayerOf<"stapes_procedure"> = {
      ...stapedotomy,
      id: "stapedectomy",
      technique: "stapedectomy",
      fenestra: "large",
    };

    expect(issueCodes(reviewedPlan("stapes_surgery", [stapedotomy, stapedectomy]))).toContain(
      "stapes_procedure_conflict",
    );
  });

  it("blocks contradictory tympanostomy action and device selections", () => {
    const tube: LayerOf<"tympanostomy"> = {
      ...clinicianLayer(),
      id: "tube",
      kind: "tympanostomy",
      role: "action",
      action: "tube_placed",
      quadrant: "anteroinferior",
      tubeType: "short_term",
    };
    expect(issueCodes(reviewedPlan("myringotomy_tympanostomy", [tube]))).not.toEqual(
      expect.arrayContaining([
        "tympanostomy_placed_without_tube",
        "tympanostomy_nonplacement_with_tube_type",
      ]),
    );
    expect(
      issueCodes(reviewedPlan("myringotomy_tympanostomy", [{ ...tube, tubeType: "none" }])),
    ).toContain("tympanostomy_placed_without_tube");

    for (const action of ["myringotomy_only", "tube_not_placed"] as const) {
      for (const tubeType of ["short_term", "t_tube", "other"] as const) {
        expect(
          issueCodes(reviewedPlan("myringotomy_tympanostomy", [{ ...tube, action, tubeType }])),
          `${action}:${tubeType}`,
        ).toContain("tympanostomy_nonplacement_with_tube_type");
      }
    }

    for (const tubeType of ["t_tube", "other", "not_documented"] as const) {
      expect(
        issueCodes(reviewedPlan("myringotomy_tympanostomy", [{ ...tube, tubeType }])),
        `placed:${tubeType}`,
      ).not.toContain("tympanostomy_placed_without_tube");
    }
  });

  it("blocks competing completed cochlear routes but permits an aborted route followed by another", () => {
    const roundWindow: LayerOf<"cochlear_insertion"> = {
      ...clinicianLayer(),
      id: "round-window",
      kind: "cochlear_insertion",
      role: "action",
      route: "round_window",
      completion: "full",
      array: "standard",
    };
    const cochleostomy: LayerOf<"cochlear_insertion"> = {
      ...roundWindow,
      id: "cochleostomy",
      route: "cochleostomy",
    };

    expect(issueCodes(reviewedPlan("cochlear_implant", [roundWindow, cochleostomy]))).toContain(
      "cochlear_insertion_route_conflict",
    );
    expect(
      issueCodes(
        reviewedPlan("cochlear_implant", [{ ...roundWindow, completion: "aborted" }, cochleostomy]),
      ),
    ).not.toContain("cochlear_insertion_route_conflict");
  });

  it.each(["round_window", "extended_round_window", "cochleostomy"] as const)(
    "blocks a split cochlear array with the single-entry %s route",
    (route) => {
      const splitArray: LayerOf<"cochlear_insertion"> = {
        ...clinicianLayer(),
        id: `split-${route}`,
        kind: "cochlear_insertion",
        role: "action",
        route,
        completion: "full",
        array: "split",
      };

      const validation = validateSurgeryPlan(reviewedPlan("cochlear_implant", [splitArray]));
      const routeIssue = validation.issues.find(
        (item) => item.code === "cochlear_split_array_route_conflict",
      );

      expect(routeIssue).toMatchObject({
        level: "blocking",
        layerIds: [splitArray.id],
      });
      expect(validation.canRender).toBe(false);
    },
  );

  it("accepts a split cochlear array with a documented mid-turn dual-entry route", () => {
    const splitArray: LayerOf<"cochlear_insertion"> = {
      ...clinicianLayer(),
      id: "valid-split-mid-turn",
      kind: "cochlear_insertion",
      role: "action",
      route: "mid_turn_cochleostomy",
      completion: "full",
      array: "split",
    };

    const validation = validateSurgeryPlan(reviewedPlan("cochlear_implant", [splitArray]));

    expect(validation.issues.map((item) => item.code)).not.toContain(
      "cochlear_split_array_route_conflict",
    );
  });

  it("blocks percutaneous and transcutaneous coupling for the same implant", () => {
    const percutaneous: LayerOf<"bone_conduction_implant"> = {
      ...clinicianLayer(),
      id: "percutaneous",
      kind: "bone_conduction_implant",
      role: "action",
      coupling: "percutaneous",
      stage: "one_stage",
    };
    const transcutaneous: LayerOf<"bone_conduction_implant"> = {
      ...percutaneous,
      id: "transcutaneous",
      coupling: "active_transcutaneous",
    };

    expect(
      issueCodes(reviewedPlan("bone_conduction_implant", [percutaneous, transcutaneous])),
    ).toContain("bone_conduction_coupling_conflict");
  });

  it("defaults new deviation references while parsing legacy plan payloads", () => {
    const parsed = SurgeryPlanSchema.parse({
      ...createEmptySurgeryPlan(),
      laterality: "right",
      procedureFamilies: ["stapes_surgery"],
      layers: [
        {
          ...clinicianLayer(),
          id: "legacy-change",
          kind: "intraoperative_deviation",
          role: "deviation",
          deviation: "unexpected_anatomy",
        },
      ],
    });
    const deviation = parsed.layers[0];
    expect(deviation).toMatchObject({
      kind: "intraoperative_deviation",
      affectedLayerIds: [],
    });
  });

  it("removes a valid superseded action from final-state conflict validation", () => {
    const canalWallUp: LayerOf<"mastoid_technique"> = {
      ...clinicianLayer(),
      id: "cwu",
      kind: "mastoid_technique",
      role: "action",
      technique: "canal_wall_up",
    };
    const canalWallDown: LayerOf<"mastoid_technique"> = {
      ...canalWallUp,
      id: "cwd",
      technique: "canal_wall_down",
    };
    const changed: LayerOf<"intraoperative_deviation"> = {
      ...clinicianLayer(),
      id: "changed-technique",
      kind: "intraoperative_deviation",
      role: "deviation",
      deviation: "procedure_changed",
      affectedLayerIds: [canalWallUp.id],
      supersedingLayerId: canalWallDown.id,
    };
    const plan = reviewedPlan("tympanomastoidectomy", [canalWallUp, canalWallDown, changed]);

    expect(getActiveSurgeryLayers(plan).map((layer) => layer.id)).toEqual([
      "cwd",
      "changed-technique",
    ]);
    expect(issueCodes(plan)).not.toContain("mastoid_canal_wall_conflict");
  });

  it("removes an explicitly aborted action while preserving its history layer", () => {
    const stapedotomy: LayerOf<"stapes_procedure"> = {
      ...clinicianLayer(),
      id: "stapedotomy",
      kind: "stapes_procedure",
      role: "action",
      technique: "stapedotomy",
      fenestra: "small",
      pistonAttachment: "incus_long_process",
    };
    const stapedectomy: LayerOf<"stapes_procedure"> = {
      ...stapedotomy,
      id: "stapedectomy",
      technique: "stapedectomy",
      fenestra: "large",
    };
    const aborted: LayerOf<"intraoperative_deviation"> = {
      ...clinicianLayer(),
      id: "aborted-stapedotomy",
      kind: "intraoperative_deviation",
      role: "deviation",
      deviation: "aborted",
      affectedLayerIds: [stapedotomy.id],
    };
    const plan = reviewedPlan("stapes_surgery", [stapedotomy, stapedectomy, aborted]);

    expect(getActiveSurgeryLayers(plan)).toContainEqual(aborted);
    expect(getActiveSurgeryLayers(plan)).not.toContainEqual(stapedotomy);
    expect(issueCodes(plan)).not.toContain("stapes_procedure_conflict");
  });

  it("does not let unknown-sided deviations silently deactivate explicit actions", () => {
    const stapedotomy: LayerOf<"stapes_procedure"> = {
      ...clinicianLayer(),
      id: "stapedotomy",
      kind: "stapes_procedure",
      role: "action",
      technique: "stapedotomy",
      fenestra: "small",
      pistonAttachment: "incus_long_process",
    };
    const stapedectomy: LayerOf<"stapes_procedure"> = {
      ...stapedotomy,
      id: "stapedectomy",
      technique: "stapedectomy",
      fenestra: "large",
    };
    const uncertainAbort: LayerOf<"intraoperative_deviation"> = {
      ...clinicianLayer(),
      id: "uncertain-abort",
      side: "not_documented",
      kind: "intraoperative_deviation",
      role: "deviation",
      deviation: "aborted",
      affectedLayerIds: [stapedotomy.id],
    };
    const plan = {
      ...reviewedPlan("stapes_surgery", [stapedotomy, stapedectomy, uncertainAbort]),
      laterality: "bilateral" as const,
    };

    expect(getActiveSurgeryLayers(plan)).toContainEqual(stapedotomy);
    expect(issueCodes(plan)).toEqual(
      expect.arrayContaining([
        "deviation_affected_layer_side_not_documented",
        "stapes_procedure_conflict",
      ]),
    );
  });

  it("validates missing, non-action, cross-side, and circular deviation references", () => {
    const finding = documentedPerforation();
    const action = documentedReconstruction({ id: "replacement", side: "left" });
    const invalid: LayerOf<"intraoperative_deviation"> = {
      ...clinicianLayer(),
      id: "invalid-change",
      kind: "intraoperative_deviation",
      role: "deviation",
      deviation: "procedure_changed",
      affectedLayerIds: ["missing", finding.id, "replacement", "replacement"],
      supersedingLayerId: "replacement",
    };
    const plan = {
      ...reviewedPlan("ossiculoplasty", [finding, action, invalid]),
      laterality: "bilateral" as const,
    };
    expect(issueCodes(plan)).toEqual(
      expect.arrayContaining([
        "deviation_duplicate_affected_layer_reference",
        "deviation_affected_layer_missing",
        "deviation_affected_layer_invalid_role",
        "deviation_affected_layer_side_mismatch",
        "deviation_superseding_layer_also_affected",
        "deviation_superseding_layer_side_mismatch",
      ]),
    );
  });

  it("derives approved views and normalization repairs an orphan visual layer", () => {
    const implant: LayerOf<"bone_conduction_implant"> = {
      ...clinicianLayer(),
      id: "implant",
      kind: "bone_conduction_implant",
      role: "action",
      coupling: "active_transcutaneous",
      stage: "one_stage",
    };
    const orphanPlan = reviewedPlan("ossiculoplasty", [implant]);

    expect(approvedBaseViewsForLayerKind("bone_conduction_implant")).toEqual([
      "postauricular_implant",
    ]);
    expect(issueCodes(orphanPlan)).toContain("layer_view_incompatible");
    expect(deriveRenderableBaseViews(orphanPlan)).toEqual([
      "transcanal_middle_ear",
      "postauricular_implant",
    ]);

    const normalized = normalizeSurgeryPlan(orphanPlan);
    expect(normalized.plan?.baseViews).toEqual(["transcanal_middle_ear", "postauricular_implant"]);
    expect(normalized.issues.map((item) => item.code)).not.toContain("layer_view_incompatible");
  });

  it("does not infer an anatomy view from status-only layers", () => {
    const status: LayerOf<"verification_status"> = {
      ...clinicianLayer(),
      id: "status",
      kind: "verification_status",
      role: "verification",
      verification: "leak_control",
      result: "confirmed",
    };
    const plan = {
      ...reviewedPlan("tympanoplasty", [status]),
      procedureFamilies: "not_documented" as const,
    };
    expect(deriveRenderableBaseViews(plan)).toEqual([]);
  });

  it("derives legacy cases without inventing missing details", () => {
    const normalPlan = deriveSurgeryPlanFromCase(
      getSyntheticCase("normal-ossicular-chain").expected,
    );
    expect(normalPlan).toMatchObject({
      laterality: "right",
      procedureFamilies: ["tympanoplasty"],
      baseViews: ["otoscopic_tm"],
    });
    expect(normalPlan.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "legacy-tm-perforation",
          kind: "tm_perforation",
          region: "central",
          documentation: "documented",
        }),
        expect.objectContaining({
          id: "legacy-graft",
          kind: "tm_graft",
          purpose: "tympanic_membrane_repair",
          targetLayerId: "legacy-tm-perforation",
        }),
      ]),
    );
    expect(issueCodes(normalPlan)).not.toContain("graft_does_not_cover_perforation");

    const missingRepairPlan = deriveSurgeryPlanFromCase(
      getSyntheticCase("incus-long-process-erosion").expected,
    );
    expect(missingRepairPlan.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "legacy-malleus",
          kind: "ossicle_state",
          documentation: "not_documented",
          state: "not_documented",
        }),
        expect.objectContaining({
          id: "legacy-ossicular-reconstruction",
          documentation: "not_documented",
          method: "not_documented",
          lateralEndpoint: "not_documented",
          medialEndpoint: "not_documented",
        }),
      ]),
    );
  });

  it("normalizes placeholder layers away only after the same semantic slot is documented", () => {
    const placeholder = createDefaultLayer("ossicle_state", "right");
    const documented: LayerOf<"ossicle_state"> = {
      ...placeholder,
      id: "documented-incus",
      documentation: "documented",
      enteredBy: "clinician",
      structure: "incus",
      state: "long_process_eroded",
    };
    const result = normalizeSurgeryPlan(reviewedPlan("ossiculoplasty", [placeholder, documented]));

    expect(result.plan?.layers).toEqual([documented]);
  });
});
