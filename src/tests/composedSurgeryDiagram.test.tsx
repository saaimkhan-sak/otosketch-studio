import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComposedSurgeryDiagram } from "@/components/diagram/ComposedSurgeryDiagram";
import {
  SurgeryPlanSchema,
  createEmptySurgeryPlan,
  type SurgeryBaseView,
  type SurgeryLayer,
  type SurgeryPlan,
  type SurgeryProcedureFamily,
} from "@/domain/surgeryPlan";

type LayerOf<Kind extends SurgeryLayer["kind"]> = Extract<SurgeryLayer, { kind: Kind }>;

function documented(side: SurgeryLayer["side"] = "right") {
  return {
    side,
    documentation: "documented" as const,
    evidence: [],
    enteredBy: "clinician" as const,
  };
}

function polygon(left: number, top: number, right: number, bottom: number) {
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

function organicGeometry(points: Array<[number, number]>) {
  return {
    basis: "clinician_authored" as const,
    points: points.map(([x, y]) => ({ x, y })),
  };
}

function svgPoints(element: Element | null) {
  return (element?.getAttribute("points") ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
}

function pointInPolygon(
  point: { x: number; y: number },
  polygonPoints: Array<{ x: number; y: number }>,
) {
  let inside = false;
  for (let index = 0, previous = polygonPoints.length - 1; index < polygonPoints.length; previous = index++) {
    const currentPoint = polygonPoints[index];
    const previousPoint = polygonPoints[previous];
    const crossesRay =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

function makePlan({
  baseViews,
  layers,
  laterality = "right",
  procedureFamilies = ["tympanoplasty"],
}: {
  baseViews: SurgeryBaseView[];
  layers: SurgeryLayer[];
  laterality?: SurgeryPlan["laterality"];
  procedureFamilies?: SurgeryProcedureFamily[];
}) {
  return SurgeryPlanSchema.parse({
    ...createEmptySurgeryPlan(),
    laterality,
    procedureFamilies,
    revisionStatus: "primary",
    baseViews,
    layers,
    sourceSafety: { status: "cleared" },
  });
}

function perforation(
  overrides: Partial<LayerOf<"tm_perforation">> = {},
): LayerOf<"tm_perforation"> {
  return {
    ...documented(),
    id: "perforation",
    kind: "tm_perforation",
    role: "finding",
    region: "central",
    geometry: polygon(0.42, 0.42, 0.58, 0.58),
    ...overrides,
  };
}

function repairGraft(overrides: Partial<LayerOf<"tm_graft">> = {}): LayerOf<"tm_graft"> {
  return {
    ...documented(),
    id: "graft",
    kind: "tm_graft",
    role: "action",
    material: "temporalis_fascia",
    technique: "medial",
    purpose: "tympanic_membrane_repair",
    targetLayerId: "perforation",
    geometry: polygon(0.32, 0.32, 0.68, 0.68),
    ...overrides,
  };
}

function reconstruction(
  overrides: Partial<LayerOf<"ossicular_reconstruction">> = {},
): LayerOf<"ossicular_reconstruction"> {
  return {
    ...documented(),
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

function stapesProcedure(
  overrides: Partial<LayerOf<"stapes_procedure">> = {},
): LayerOf<"stapes_procedure"> {
  return {
    ...documented(),
    id: "stapes-procedure",
    kind: "stapes_procedure",
    role: "action",
    technique: "stapedotomy",
    fenestra: "small",
    pistonAttachment: "incus_long_process",
    ...overrides,
  };
}

function boneConductionImplant(
  coupling: LayerOf<"bone_conduction_implant">["coupling"],
): LayerOf<"bone_conduction_implant"> {
  return {
    ...documented(),
    id: `bone-device-${coupling}`,
    kind: "bone_conduction_implant",
    role: "action",
    coupling,
    stage: "one_stage",
  };
}

function eustachianDilation(
  side: SurgeryLayer["side"] = "right",
): LayerOf<"eustachian_tube_dilation"> {
  return {
    ...documented(side),
    id: `eustachian-dilation-${side}`,
    kind: "eustachian_tube_dilation",
    role: "action",
    result: "completed",
  };
}

function tympanostomy(
  overrides: Partial<LayerOf<"tympanostomy">> = {},
): LayerOf<"tympanostomy"> {
  return {
    ...documented(),
    id: "tube",
    kind: "tympanostomy",
    role: "action",
    action: "tube_placed",
    quadrant: "anteroinferior",
    tubeType: "short_term",
    ...overrides,
  };
}

function cochlearInsertion(
  overrides: Partial<LayerOf<"cochlear_insertion">> = {},
): LayerOf<"cochlear_insertion"> {
  return {
    ...documented(),
    id: "cochlear-insertion",
    kind: "cochlear_insertion",
    role: "action",
    route: "round_window",
    completion: "full",
    array: "standard",
    ...overrides,
  };
}

function mastoidTechnique(
  technique: LayerOf<"mastoid_technique">["technique"],
): LayerOf<"mastoid_technique"> {
  return {
    ...documented(),
    id: `mastoid-${technique}`,
    kind: "mastoid_technique",
    role: "action",
    technique,
  };
}

describe("ComposedSurgeryDiagram clinical rendering safety", () => {
  it("does not infer a tube location or marker when the quadrant is not documented", () => {
    const tube = tympanostomy({ quadrant: "not_documented" });
    const plan = makePlan({
      baseViews: ["otoscopic_tm"],
      layers: [tube],
      procedureFamilies: ["myringotomy_tympanostomy"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    expect(container.querySelector(`[data-layer-id="${tube.id}"]`)).not.toBeInTheDocument();
    expect(container.querySelector(`[data-layer-marker="${tube.id}"]`)).not.toBeInTheDocument();
    expect(container.querySelector(".surgery-tube-device")).not.toBeInTheDocument();
    expect(screen.getByText(/Status only/)).toBeInTheDocument();
  });

  it("uses a neutral untyped tube at a documented quadrant without inventing a subtype", () => {
    const tube = tympanostomy({ tubeType: "not_documented" });
    const plan = makePlan({
      baseViews: ["otoscopic_tm"],
      layers: [tube],
      procedureFamilies: ["myringotomy_tympanostomy"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const device = container.querySelector(`[data-layer-id="${tube.id}"]`);

    expect(device).toHaveClass("surgery-tube-device");
    expect(device?.querySelector(".surgery-device-untyped")).toBeInTheDocument();
    expect(device?.querySelector(".surgery-device-opening")).toBeInTheDocument();
    expect(device?.querySelector(".surgery-device-inner-lip")).not.toBeInTheDocument();
    expect(device?.querySelector(".surgery-tube-wing")).not.toBeInTheDocument();

    const marker = container.querySelector(`[data-layer-marker="${tube.id}"]`);
    expect(marker?.querySelector(".surgery-annotation-leader")).toBeInTheDocument();
    const target = marker?.querySelector(".surgery-annotation-target");
    expect(target).toBeInTheDocument();
    expect(marker?.querySelector(".surgery-annotation-badge")).toBeInTheDocument();
    expect(marker).toHaveAttribute("data-marker-target-x");
    expect(marker).toHaveAttribute("data-marker-target-y");
    expect(target).toHaveAttribute("cx", marker?.getAttribute("data-marker-target-x"));
    expect(target).toHaveAttribute("cy", marker?.getAttribute("data-marker-target-y"));
  });

  it("renders a valid split array as exactly two cochleostomies and two insertion paths", () => {
    const insertion = cochlearInsertion({
      id: "split-array",
      route: "mid_turn_cochleostomy",
      array: "split",
    });
    const plan = makePlan({
      baseViews: ["cochlea_implant_path"],
      layers: [insertion],
      procedureFamilies: ["cochlear_implant"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const implant = container.querySelector(`[data-layer-id="${insertion.id}"]`);

    expect(implant?.querySelectorAll(".surgery-cochleostomy-opening")).toHaveLength(2);
    expect(implant?.querySelectorAll(".surgery-electrode-lead.is-split-array")).toHaveLength(2);
    expect(implant?.querySelectorAll(".surgery-electrode-path.is-split-array")).toHaveLength(2);
  });

  it("renders partial split arrays as two visibly incomplete branches", () => {
    const insertion = cochlearInsertion({
      id: "partial-split-array",
      route: "mid_turn_cochleostomy",
      array: "split",
      completion: "partial",
    });
    const plan = makePlan({
      baseViews: ["cochlea_implant_path"],
      layers: [insertion],
      procedureFamilies: ["cochlear_implant"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const implant = container.querySelector(`[data-layer-id="${insertion.id}"]`);

    expect(implant?.querySelectorAll(".surgery-electrode-path.is-split-array.is-partial")).toHaveLength(2);
    expect(implant?.querySelectorAll(".surgery-electrode-contact")).toHaveLength(5);
    expect(implant?.querySelectorAll(".surgery-partial-marker")).toHaveLength(2);
  });

  it.each([
    ["no graft material", { material: "none" as const }],
    ["unknown graft purpose", { purpose: "not_documented" as const }],
    ["missing graft geometry", { geometry: undefined }],
  ])("does not draw an SVG graft for %s", (_label, graftOverrides) => {
    const target = perforation();
    const graft = repairGraft(graftOverrides);
    const plan = makePlan({ baseViews: ["otoscopic_tm"], layers: [target, graft] });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    expect(container.querySelector('[data-layer-id="graft"]')).not.toBeInTheDocument();
    expect(container.querySelector(".surgery-graft-overlay")).not.toBeInTheDocument();
    if ("purpose" in graftOverrides) {
      expect(container.querySelector('[data-layer-id="perforation"]')).not.toBeInTheDocument();
      expect(screen.getByText(/No documented procedure layer to draw/i)).toBeInTheDocument();
    } else {
      expect(container.querySelector('[data-layer-id="perforation"]')).toHaveClass(
        "surgery-perforation",
      );
    }
    expect(container.querySelector(".surgery-repaired-defect-outline")).not.toBeInTheDocument();
  });

  it("draws a valid repair graft over its target and changes the defect to a repaired outline", () => {
    const target = perforation();
    const graft = repairGraft();
    const plan = makePlan({ baseViews: ["otoscopic_tm"], layers: [target, graft] });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    const targetOutline = container.querySelector('[data-layer-id="perforation"]');
    const graftOverlay = container.querySelector('[data-layer-id="graft"]');
    expect(targetOutline).toHaveClass("surgery-repaired-defect-outline");
    expect(targetOutline).not.toHaveClass("surgery-perforation");
    expect(graftOverlay).toHaveClass("surgery-graft-overlay");
    expect(graftOverlay?.tagName.toLowerCase()).toBe("polygon");
  });

  it("preserves an organic perforation contour and draws a larger medial graft beneath every edge", () => {
    const target = perforation({
      geometry: organicGeometry([
        [0.42, 0.37], [0.51, 0.34], [0.59, 0.38], [0.63, 0.47], [0.6, 0.57],
        [0.52, 0.62], [0.43, 0.59], [0.37, 0.52], [0.38, 0.43],
      ]),
    });
    const graft = repairGraft({
      geometry: organicGeometry([
        [0.36, 0.29], [0.52, 0.25], [0.66, 0.31], [0.72, 0.46], [0.68, 0.64],
        [0.53, 0.72], [0.35, 0.67], [0.27, 0.54], [0.29, 0.36],
      ]),
    });
    const plan = makePlan({ baseViews: ["otoscopic_tm"], layers: [target, graft] });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const targetPoints = svgPoints(container.querySelector('[data-layer-id="perforation"]'));
    const graftPoints = svgPoints(container.querySelector('[data-layer-id="graft"]'));

    expect(targetPoints).toHaveLength(9);
    expect(graftPoints).toHaveLength(9);
    expect(targetPoints.every((point) => pointInPolygon(point, graftPoints))).toBe(true);
    expect(container.querySelector(".surgery-graft-window-fill")).toBeInTheDocument();
    expect(container.querySelector(".surgery-graft-underlay-outline")).toBeInTheDocument();
  });

  it("renders a prosthesis-protection graft only as a cap in the middle-ear view", () => {
    const prosthesis = reconstruction();
    const protectiveGraft: LayerOf<"tm_graft"> = repairGraft({
      id: "protective-graft",
      material: "cartilage",
      purpose: "prosthesis_protection",
      targetLayerId: prosthesis.id,
      geometry: undefined,
    });
    const plan = makePlan({
      baseViews: ["transcanal_middle_ear"],
      layers: [prosthesis, protectiveGraft],
      procedureFamilies: ["ossiculoplasty"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    const graftShapes = container.querySelectorAll(
      'svg [data-layer-id="protective-graft"]',
    );
    expect(graftShapes).toHaveLength(1);
    expect(graftShapes[0]).toHaveClass("surgery-protection-cap");
    expect(graftShapes[0].tagName.toLowerCase()).toBe("ellipse");
    expect(container.querySelector(".surgery-graft-overlay")).not.toBeInTheDocument();
  });

  it.each([
    {
      label: "cochlear insertion",
      view: "cochlea_implant_path" as const,
      family: "cochlear_implant" as const,
      layer: {
        ...documented(),
        id: "aborted-cochlear",
        kind: "cochlear_insertion",
        role: "action",
        route: "round_window",
        completion: "aborted",
        array: "standard",
      } satisfies LayerOf<"cochlear_insertion">,
      forbiddenSelectors: [".surgery-receiver-base", ".surgery-electrode-path"],
    },
    {
      label: "canalplasty",
      view: "external_auditory_canal" as const,
      family: "canalplasty" as const,
      layer: {
        ...documented(),
        id: "aborted-canalplasty",
        kind: "canalplasty",
        role: "action",
        region: "circumferential",
        result: "aborted",
      } satisfies LayerOf<"canalplasty">,
      forbiddenSelectors: [".surgery-canal-repaired"],
    },
    {
      label: "Eustachian-tube dilation",
      view: "eustachian_tube" as const,
      family: "eustachian_tube_dilation" as const,
      layer: {
        ...documented(),
        id: "aborted-eustachian",
        kind: "eustachian_tube_dilation",
        role: "action",
        result: "aborted",
      } satisfies LayerOf<"eustachian_tube_dilation">,
      forbiddenSelectors: [".surgery-balloon-catheter", ".surgery-balloon"],
    },
  ])("does not draw a completed repair or device for aborted $label", (testCase) => {
    const plan = makePlan({
      baseViews: [testCase.view],
      layers: [testCase.layer],
      procedureFamilies: [testCase.family],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    expect(
      container.querySelector(`[data-layer-id="${testCase.layer.id}"]`),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(`[data-layer-marker="${testCase.layer.id}"]`),
    ).not.toBeInTheDocument();
    for (const selector of testCase.forbiddenSelectors) {
      expect(container.querySelector(selector)).not.toBeInTheDocument();
    }
  });

  it.each([
    {
      label: "cochlear insertion",
      view: "cochlea_implant_path" as const,
      family: "cochlear_implant" as const,
      layer: {
        ...documented(),
        id: "partial-cochlear",
        kind: "cochlear_insertion",
        role: "action",
        route: "round_window",
        completion: "partial",
        array: "standard",
      } satisfies LayerOf<"cochlear_insertion">,
      expectedSelectors: [
        [".surgery-electrode-path.is-partial", 1],
        [".surgery-partial-marker", 1],
        [".surgery-electrode-contact", 4],
      ] as const,
    },
    {
      label: "canalplasty",
      view: "external_auditory_canal" as const,
      family: "canalplasty" as const,
      layer: {
        ...documented(),
        id: "partial-canalplasty",
        kind: "canalplasty",
        role: "action",
        region: "circumferential",
        result: "partial",
      } satisfies LayerOf<"canalplasty">,
      expectedSelectors: [[".surgery-canal-repaired.is-partial", 2]] as const,
    },
    {
      label: "Eustachian-tube dilation",
      view: "eustachian_tube" as const,
      family: "eustachian_tube_dilation" as const,
      layer: {
        ...documented(),
        id: "partial-eustachian",
        kind: "eustachian_tube_dilation",
        role: "action",
        result: "partial",
      } satisfies LayerOf<"eustachian_tube_dilation">,
      expectedSelectors: [[".surgery-balloon.is-partial", 1]] as const,
    },
  ])("uses explicit partial geometry for partial $label", (testCase) => {
    const plan = makePlan({
      baseViews: [testCase.view],
      layers: [testCase.layer],
      procedureFamilies: [testCase.family],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    expect(container.querySelector(`[data-layer-id="${testCase.layer.id}"]`)).toBeInTheDocument();
    for (const [selector, count] of testCase.expectedSelectors) {
      expect(container.querySelectorAll(selector)).toHaveLength(count);
    }
  });

  it("uses a true gap rather than an intact reference ossicle for a documented absent incus", () => {
    const absentIncus: LayerOf<"ossicle_state"> = {
      ...documented(),
      id: "absent-incus",
      kind: "ossicle_state",
      role: "finding",
      structure: "incus",
      state: "absent",
    };
    const plan = makePlan({
      baseViews: ["transcanal_middle_ear"],
      layers: [absentIncus],
      procedureFamilies: ["ossiculoplasty"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="finding" />);

    expect(container.querySelectorAll(".surgery-absent-gap")).not.toHaveLength(0);
    expect(
      container.querySelector('circle.surgery-ossicle-node[cx="444"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Incus · Absent")).toBeInTheDocument();
  });

  it("keeps verification and intraoperative-deviation layers text-only with no anatomy marker", () => {
    const deviation: LayerOf<"intraoperative_deviation"> = {
      ...documented(),
      id: "deviation",
      kind: "intraoperative_deviation",
      role: "deviation",
      deviation: "unexpected_anatomy",
      management: "Documented synthetic management detail.",
      affectedLayerIds: [],
    };
    const verification: LayerOf<"verification_status"> = {
      ...documented(),
      id: "verification",
      kind: "verification_status",
      role: "verification",
      verification: "tube_patency",
      result: "confirmed",
    };
    const plan = makePlan({
      baseViews: ["otoscopic_tm"],
      layers: [deviation, verification],
      procedureFamilies: ["myringotomy_tympanostomy"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

    for (const id of [deviation.id, verification.id]) {
      expect(container.querySelector(`[data-layer-id="${id}"]`)).not.toBeInTheDocument();
      expect(container.querySelector(`[data-layer-marker="${id}"]`)).not.toBeInTheDocument();
    }
    expect(screen.getAllByText(/Status only/)).toHaveLength(2);
  });

  it.each(["stapedotomy", "stapedectomy"] as const)(
    "removes the native stapes superstructure after completed %s",
    (technique) => {
      const plan = makePlan({
        baseViews: ["transcanal_middle_ear"],
        layers: [
          stapesProcedure({
            technique,
            fenestra: technique === "stapedectomy" ? "large" : "small",
          }),
        ],
        procedureFamilies: ["stapes_surgery"],
      });

      const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);

      expect(container.querySelector(".surgery-stapes-reconstruction")).toBeInTheDocument();
      expect(container.querySelector(".surgery-stapes-anatomy")).not.toBeInTheDocument();
      expect(container.querySelector(".surgery-piston-loop")).toBeInTheDocument();
      expect(container.querySelector(".surgery-piston-tip")).toBeInTheDocument();
      expect(container.querySelector(".surgery-fenestra")).toBeInTheDocument();
    },
  );

  it("layers a stapedectomy tissue seal above the large fenestra", () => {
    const plan = makePlan({
      baseViews: ["transcanal_middle_ear"],
      layers: [stapesProcedure({ technique: "stapedectomy", fenestra: "large" })],
      procedureFamilies: ["stapes_surgery"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const fenestra = container.querySelector(".surgery-fenestra.is-stapedectomy");
    const seal = container.querySelector(".surgery-stapedectomy-seal");
    const siblings = Array.from(fenestra?.parentElement?.children ?? []);

    expect(fenestra).toBeInTheDocument();
    expect(seal).toBeInTheDocument();
    expect(fenestra?.parentElement).toBe(seal?.parentElement);
    expect(siblings.indexOf(fenestra as Element)).toBeLessThan(siblings.indexOf(seal as Element));
  });

  it("uses clinically distinct passive and active transcutaneous implant assemblies", () => {
    const passivePlan = makePlan({
      baseViews: ["postauricular_implant"],
      layers: [boneConductionImplant("passive_transcutaneous")],
      procedureFamilies: ["bone_conduction_implant"],
    });
    const activePlan = makePlan({
      baseViews: ["postauricular_implant"],
      layers: [boneConductionImplant("active_transcutaneous")],
      procedureFamilies: ["bone_conduction_implant"],
    });

    const passive = render(<ComposedSurgeryDiagram plan={passivePlan} phase="procedure" />);
    const passiveDevice = passive.container.querySelector(
      ".surgery-bone-device.is-passive-transcutaneous",
    );
    expect(passiveDevice).toBeInTheDocument();
    expect(passiveDevice?.querySelector(".surgery-magnetic-coupling")).toBeInTheDocument();
    expect(passiveDevice?.querySelector(".surgery-active-actuator")).not.toBeInTheDocument();
    expect(passiveDevice?.querySelector(".surgery-actuator-lead")).not.toBeInTheDocument();
    passive.unmount();

    const active = render(<ComposedSurgeryDiagram plan={activePlan} phase="procedure" />);
    const activeDevice = active.container.querySelector(
      ".surgery-bone-device.is-active-transcutaneous",
    );
    expect(activeDevice).toBeInTheDocument();
    expect(activeDevice?.querySelector(".surgery-implant-coil")).toBeInTheDocument();
    expect(activeDevice?.querySelector(".surgery-actuator-lead")).toBeInTheDocument();
    expect(activeDevice?.querySelector(".surgery-active-actuator")).toBeInTheDocument();
    expect(activeDevice?.querySelector(".surgery-magnetic-coupling")).not.toBeInTheDocument();
  });

  it("keeps the completed Eustachian-tube result balloon-free and confines the balloon to a temporary inset", () => {
    const plan = makePlan({
      baseViews: ["eustachian_tube"],
      layers: [eustachianDilation()],
      procedureFamilies: ["eustachian_tube_dilation"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const result = container.querySelector('[data-layer-id="eustachian-dilation-right"]');
    const inset = result?.querySelector(".surgery-balloon-inset");

    expect(result?.querySelector(".surgery-et-treated-lumen")).toBeInTheDocument();
    expect(inset).toBeInTheDocument();
    expect(inset?.querySelector(".surgery-balloon-catheter")).toBeInTheDocument();
    expect(inset?.querySelector(".surgery-balloon")).toBeInTheDocument();
    expect(Array.from(result?.children ?? []).some((child) => child.classList.contains("surgery-balloon"))).toBe(false);
    expect(
      Array.from(result?.children ?? []).some((child) =>
        child.classList.contains("surgery-balloon-catheter"),
      ),
    ).toBe(false);
  });

  it("keeps left-ear temporary-inset text readable while mirroring the anatomy", () => {
    const plan = makePlan({
      laterality: "left",
      baseViews: ["eustachian_tube"],
      layers: [eustachianDilation("left")],
      procedureFamilies: ["eustachian_tube_dilation"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const mirroredAnatomy = container.querySelector(".surgery-anatomy-is-mirrored");
    const insetLabel = container.querySelector(".surgery-inset-label");
    let cursor = insetLabel?.parentElement ?? null;
    let hasCounterMirror = insetLabel?.getAttribute("transform")?.includes("scale(-1 1)") ?? false;

    while (cursor && cursor !== mirroredAnatomy) {
      hasCounterMirror ||= cursor.getAttribute("transform")?.includes("scale(-1 1)") ?? false;
      cursor = cursor.parentElement;
    }

    expect(mirroredAnatomy).toHaveAttribute("transform", "translate(960 0) scale(-1 1)");
    expect(insetLabel).toHaveTextContent("Temporary balloon during dilation");
    expect(mirroredAnatomy?.contains(insetLabel) ? hasCounterMirror : true).toBe(true);
  });

  it("renders cholesteatoma as irregular pearly path layers rather than generic circles", () => {
    const disease: LayerOf<"cholesteatoma_extent"> = {
      ...documented(),
      id: "cholesteatoma",
      kind: "cholesteatoma_extent",
      role: "finding",
      regions: ["epitympanum", "mastoid"],
    };
    const plan = makePlan({
      baseViews: ["mastoid_middle_ear"],
      layers: [disease],
      procedureFamilies: ["tympanomastoidectomy"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="finding" />);
    const masses = Array.from(container.querySelectorAll(".surgery-cholesteatoma-group"));

    expect(masses).toHaveLength(2);
    for (const mass of masses) {
      const outer = mass.querySelector("path.surgery-disease-mass");
      expect(outer).toBeInTheDocument();
      expect(outer?.getAttribute("d")).toContain("C");
      expect(mass.querySelector("path.surgery-disease-core")).toBeInTheDocument();
      expect(mass.querySelector("path.surgery-disease-whorl")).toBeInTheDocument();
      expect(mass.querySelector("circle")).not.toBeInTheDocument();
    }
  });

  it.each([
    {
      technique: "canal_wall_up" as const,
      nativeWall: true,
      nativeDrum: true,
      expectedSelector: ".surgery-mastoid-action:not(.is-canal-wall-down)",
    },
    {
      technique: "canal_wall_down" as const,
      nativeWall: false,
      nativeDrum: true,
      expectedSelector: ".surgery-mastoid-action.is-canal-wall-down",
    },
    {
      technique: "canal_wall_reconstruction" as const,
      nativeWall: false,
      nativeDrum: true,
      expectedSelector: ".surgery-canal-wall-reconstruction",
    },
    {
      technique: "mastoid_obliteration" as const,
      nativeWall: true,
      nativeDrum: true,
      expectedSelector: ".surgery-obliteration-neutral",
    },
    {
      technique: "subtotal_petrosectomy" as const,
      nativeWall: false,
      nativeDrum: false,
      expectedSelector: ".surgery-mastoid-action.is-subtotal-petrosectomy",
    },
  ])(
    "preserves the documented $technique mastoid topology",
    ({ technique, nativeWall, nativeDrum, expectedSelector }) => {
      const layer = mastoidTechnique(technique);
      const plan = makePlan({
        baseViews: ["mastoid_middle_ear"],
        layers: [layer],
        procedureFamilies: ["tympanomastoidectomy"],
      });

      const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
      const scene = container.querySelector(`[data-layer-id="${layer.id}"]`)?.closest("svg");

      expect(scene?.querySelector(expectedSelector)).toBeInTheDocument();
      expect(Boolean(scene?.querySelector('[data-anatomy-id="posterior-canal-wall"]'))).toBe(
        nativeWall,
      );
      expect(Boolean(scene?.querySelector('[data-anatomy-id="tympanic-membrane"]'))).toBe(
        nativeDrum,
      );
      if (technique === "subtotal_petrosectomy") {
        expect(scene?.querySelector(".surgery-blind-sac-closure")).toBeInTheDocument();
        expect(scene?.querySelector(".surgery-et-closure")).toBeInTheDocument();
        expect(scene?.querySelector('[data-anatomy-id="ossicular-chain"]')).not.toBeInTheDocument();
      }
    },
  );

  it("renders no anatomy when the plan has no selected procedure or base view", () => {
    const plan = createEmptySurgeryPlan();

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="finding" />);

    expect(screen.getByText("Choose a procedure or view to begin.")).toBeInTheDocument();
    expect(screen.getByText("No anatomy is inferred from an empty plan.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(container.querySelector(".surgery-scene")).not.toBeInTheDocument();
  });

  it("splits a bilateral plan into distinct left- and right-ear scenes", () => {
    const leftTube: LayerOf<"tympanostomy"> = {
      ...documented("left"),
      id: "left-tube",
      kind: "tympanostomy",
      role: "action",
      action: "tube_placed",
      quadrant: "anteroinferior",
      tubeType: "short_term",
    };
    const rightTube: LayerOf<"tympanostomy"> = {
      ...documented("right"),
      id: "right-tube",
      kind: "tympanostomy",
      role: "action",
      action: "tube_placed",
      quadrant: "posteroinferior",
      tubeType: "t_tube",
    };
    const plan = makePlan({
      laterality: "bilateral",
      baseViews: ["otoscopic_tm"],
      layers: [leftTube, rightTube],
      procedureFamilies: ["myringotomy_tympanostomy"],
    });

    const { container } = render(<ComposedSurgeryDiagram plan={plan} phase="procedure" />);
    const scenes = container.querySelectorAll(".surgery-scene");

    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toHaveTextContent("Left ear");
    expect(scenes[0].querySelector('[data-layer-id="left-tube"]')).toBeInTheDocument();
    expect(scenes[0].querySelector('[data-layer-id="right-tube"]')).not.toBeInTheDocument();
    expect(scenes[1]).toHaveTextContent("Right ear");
    expect(scenes[1].querySelector('[data-layer-id="right-tube"]')).toBeInTheDocument();
    expect(scenes[1].querySelector('[data-layer-id="left-tube"]')).not.toBeInTheDocument();
  });
});
