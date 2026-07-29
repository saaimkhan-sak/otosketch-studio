import { describe, expect, it } from "vitest";
import { createPresetPlan } from "@/components/app/SurgeryBuilder";
import {
  layoutNumberedMedicalArtCallouts,
  mirrorMedicalArtPoint,
  mirrorMedicalArtRect,
  resolveMedicalArtCalloutDescriptor,
  type MedicalArtCalloutDescriptor,
  type MedicalArtCalloutLayoutConfig,
} from "@/domain/medicalArtCallouts";
import { selectMedicalArtAsset } from "@/domain/medicalArt";
import {
  createDefaultLayer,
  getActiveSurgeryLayers,
  type SurgeryLayer,
  type SurgeryPlan,
  type SurgeryProcedureFamily,
} from "@/domain/surgeryPlan";
import { smoothClosedSourceBounds } from "@/domain/medicalArtPlacement";

const imageFrame = { x: 28, y: 78, width: 588, height: 454 };
const procedureFamilies: SurgeryProcedureFamily[] = [
  "myringotomy_tympanostomy",
  "tympanoplasty",
  "ossiculoplasty",
  "tympanomastoidectomy",
  "stapes_surgery",
  "cochlear_implant",
  "bone_conduction_implant",
  "canalplasty",
  "eustachian_tube_dilation",
];

function fittedMedicalArt(plan: SurgeryPlan) {
  const asset = selectMedicalArtAsset(plan);
  const scale = Math.min(imageFrame.width / asset.width, imageFrame.height / asset.height);
  const width = asset.width * scale;
  const height = asset.height * scale;
  return {
    asset,
    fitted: {
      x: imageFrame.x + (imageFrame.width - width) / 2,
      y: imageFrame.y + (imageFrame.height - height) / 2,
      width,
      height,
    },
  };
}

function descriptorsForPlan(plan: SurgeryPlan) {
  const { asset, fitted } = fittedMedicalArt(plan);
  return getActiveSurgeryLayers(plan).flatMap((layer) => {
    const descriptor = resolveMedicalArtCalloutDescriptor(layer, plan, asset, fitted);
    return descriptor ? [descriptor] : [];
  });
}

function standardLayout(
  descriptors: MedicalArtCalloutDescriptor[],
  overrides: Partial<MedicalArtCalloutLayoutConfig> = {},
) {
  return layoutNumberedMedicalArtCallouts(
    descriptors.map((descriptor, index) => ({
      descriptor,
      legendNumber: index + 1,
    })),
    {
      railX: 631,
      top: 78,
      bottom: 532,
      badgeRadius: 10.5,
      badgeStrokeWidth: 1.5,
      badgeClearance: 1,
      minCenterSpacing: 26,
      endpointClearance: 4,
      ...overrides,
    },
  );
}

function pointInsideRect(
  point: { x: number; y: number },
  bounds: { left: number; top: number; right: number; bottom: number },
) {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

function descriptorAtY(
  template: MedicalArtCalloutDescriptor,
  id: string,
  y: number,
): MedicalArtCalloutDescriptor {
  return {
    ...template,
    layer: { ...template.layer, id },
    targets: [
      {
        point: { x: 240, y },
        protectedBounds: {
          left: 230,
          top: y - 10,
          right: 250,
          bottom: y + 10,
        },
        basis: `rail-extreme-${id}`,
      },
    ],
  };
}

describe("numbered medical-art callouts", () => {
  it("bounds cubic overshoot for sharp clinician-authored tympanic polygons", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ];
    const bounds = smoothClosedSourceBounds(points);
    expect(bounds).not.toBeNull();
    if (!bounds) return;
    expect(bounds.top).toBeLessThan(0);
    expect(bounds.bottom).toBeGreaterThan(10);

    const pointAt = (index: number) => points[(index + points.length) % points.length];
    for (let index = 0; index < points.length; index += 1) {
      const previous = pointAt(index - 1);
      const current = pointAt(index);
      const next = pointAt(index + 1);
      const following = pointAt(index + 2);
      const controlOne = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6,
      };
      const controlTwo = {
        x: next.x - (following.x - current.x) / 6,
        y: next.y - (following.y - current.y) / 6,
      };

      for (let sample = 0; sample <= 100; sample += 1) {
        const t = sample / 100;
        const inverse = 1 - t;
        const point = {
          x:
            inverse ** 3 * current.x +
            3 * inverse ** 2 * t * controlOne.x +
            3 * inverse * t ** 2 * controlTwo.x +
            t ** 3 * next.x,
          y:
            inverse ** 3 * current.y +
            3 * inverse ** 2 * t * controlOne.y +
            3 * inverse * t ** 2 * controlTwo.y +
            t ** 3 * next.y,
        };
        expect(pointInsideRect(point, bounds), `segment ${index}, sample ${sample}`).toBe(true);
      }
    }
  });

  it("creates a finite protected target for every supported preset annotation", () => {
    const expectedCounts: Record<SurgeryProcedureFamily, number> = {
      myringotomy_tympanostomy: 1,
      tympanoplasty: 2,
      ossiculoplasty: 3,
      tympanomastoidectomy: 2,
      stapes_surgery: 2,
      cochlear_implant: 1,
      bone_conduction_implant: 1,
      canalplasty: 1,
      eustachian_tube_dilation: 1,
    };

    for (const family of procedureFamilies) {
      const plan = createPresetPlan(family);
      const descriptors = descriptorsForPlan(plan);
      expect(descriptors, family).toHaveLength(expectedCounts[family]);

      for (const descriptor of descriptors) {
        expect(descriptor.targets.length, descriptor.layer.kind).toBeGreaterThan(0);
        for (const target of descriptor.targets) {
          expect(Number.isFinite(target.point.x), target.basis).toBe(true);
          expect(Number.isFinite(target.point.y), target.basis).toBe(true);
          expect(
            pointInsideRect(target.point, target.protectedBounds),
            `${family}:${descriptor.layer.kind}:${target.basis}`,
          ).toBe(true);
          expect(target.protectedBounds.left).toBeLessThan(target.protectedBounds.right);
          expect(target.protectedBounds.top).toBeLessThan(target.protectedBounds.bottom);
        }
      }
    }
  });

  it("keeps badge ordinals stable while resolving coincident targets without collisions", () => {
    const plan = createPresetPlan("ossiculoplasty");
    const descriptor = descriptorsForPlan(plan).find(({ layer }) => layer.kind === "ossicle_state");
    expect(descriptor).toBeDefined();
    if (!descriptor) return;

    for (const count of [1, 2, 9, 18]) {
      const descriptors = Array.from({ length: count }, (_, index) => ({
        ...descriptor,
        layer: {
          ...descriptor.layer,
          id: `coincident-${count}-${index + 1}`,
        },
      }));
      const railBottom = Math.max(532, 103 + (count - 1) * 26);
      const first = standardLayout(descriptors, { bottom: railBottom });
      const second = standardLayout(descriptors, { bottom: railBottom });

      expect(second).toEqual(first);
      expect(first.map((callout) => callout.legendNumber)).toEqual(
        Array.from({ length: count }, (_, index) => index + 1),
      );
      for (const [index, callout] of first.entries()) {
        expect(callout.badgeCenter.x).toBe(631);
        expect(callout.badgeCenter.y - 10.5 - 1.5 / 2).toBeGreaterThan(78);
        expect(callout.badgeCenter.y + 10.5 + 1.5 / 2).toBeLessThan(railBottom);
        if (index === 0) continue;
        expect(
          Math.abs(callout.badgeCenter.y - first[index - 1].badgeCenter.y),
        ).toBeGreaterThanOrEqual(26);
      }
    }
  });

  it("keeps every badge outside both the image and legend frames", () => {
    const descriptors = procedureFamilies.flatMap((family) =>
      descriptorsForPlan(createPresetPlan(family)),
    );
    const callouts = standardLayout(descriptors);
    const drawnOuterRadius = 10.5 + 1.5 / 2;

    for (const callout of callouts) {
      expect(callout.badgeCenter.x - drawnOuterRadius).toBeGreaterThan(
        imageFrame.x + imageFrame.width,
      );
      expect(callout.badgeCenter.x + drawnOuterRadius).toBeLessThan(646);
    }
  });

  it("refuses to place labels outside an undersized rail", () => {
    const plan = createPresetPlan("ossiculoplasty");
    const descriptor = descriptorsForPlan(plan)[0];
    expect(descriptor).toBeDefined();
    if (!descriptor) return;
    const dense = Array.from({ length: 18 }, (_, index) => ({
      ...descriptor,
      layer: { ...descriptor.layer, id: `short-rail-${index}` },
    }));

    expect(() => standardLayout(dense, { bottom: 532 })).toThrow(
      /too short for 18 collision-free badges/i,
    );
  });

  it.each([
    { name: "top-heavy", desiredYs: [-1_000, -900, -800] },
    { name: "bottom-heavy", desiredYs: [900, 1_000, 1_100] },
    { name: "mixed extremes", desiredYs: [-1_000, 1_000, 1_100] },
  ])("keeps $name clusters within both rail bounds", ({ name, desiredYs }) => {
    const plan = createPresetPlan("ossiculoplasty");
    const template = descriptorsForPlan(plan)[0];
    expect(template).toBeDefined();
    if (!template) return;

    const top = 78;
    const bottom = 200;
    const badgeRadius = 10.5;
    const badgeStrokeWidth = 1.5;
    const badgeClearance = 1;
    const outerRadius = badgeRadius + badgeStrokeWidth / 2 + badgeClearance;
    const minimumY = top + outerRadius;
    const maximumY = bottom - outerRadius;
    const descriptors = desiredYs.map((desiredY, index) =>
      descriptorAtY(template, `${name}-${index + 1}`, desiredY),
    );
    const callouts = standardLayout(descriptors, { top, bottom });
    const orderedCenters = callouts
      .map((callout) => callout.badgeCenter.y)
      .sort((first, second) => first - second);

    expect(orderedCenters[0]).toBeGreaterThanOrEqual(minimumY);
    expect(orderedCenters.at(-1)).toBeLessThanOrEqual(maximumY);
    for (let index = 1; index < orderedCenters.length; index += 1) {
      expect(orderedCenters[index] - orderedCenters[index - 1]).toBeGreaterThanOrEqual(26);
    }
  });

  it("stops each leader outside its protected annotation geometry", () => {
    for (const family of procedureFamilies) {
      const callouts = standardLayout(descriptorsForPlan(createPresetPlan(family)));
      for (const callout of callouts) {
        for (const leader of callout.leaders) {
          expect(pointInsideRect(leader.target, leader.protectedBounds)).toBe(true);
          expect(
            pointInsideRect(leader.end, leader.protectedBounds),
            `${family}:${leader.basis}`,
          ).toBe(false);

          for (let sample = 0; sample <= 100; sample += 1) {
            const t = sample / 100;
            const point = {
              x: leader.end.x + (leader.start.x - leader.end.x) * t,
              y: leader.end.y + (leader.start.y - leader.end.y) * t,
            };
            expect(
              pointInsideRect(point, leader.protectedBounds),
              `${family}:${leader.basis}:segment sample ${sample}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it("mirrors targets and protected bounds exactly while leaving the badge rail unmirrored", () => {
    const mirrorConstant = 644;
    for (const family of procedureFamilies) {
      const descriptors = descriptorsForPlan(createPresetPlan(family));
      const right = standardLayout(descriptors);
      const left = standardLayout(descriptors, { mirrorConstant });

      expect(left).toHaveLength(right.length);
      for (const [index, rightCallout] of right.entries()) {
        const leftCallout = left[index];
        expect(leftCallout.legendNumber).toBe(rightCallout.legendNumber);
        expect(leftCallout.badgeCenter).toEqual(rightCallout.badgeCenter);
        expect(leftCallout.leaders).toHaveLength(rightCallout.leaders.length);

        for (const [leaderIndex, rightLeader] of rightCallout.leaders.entries()) {
          const leftLeader = leftCallout.leaders[leaderIndex];
          expect(leftLeader.target).toEqual(
            mirrorMedicalArtPoint(rightLeader.target, mirrorConstant),
          );
          expect(leftLeader.protectedBounds).toEqual(
            mirrorMedicalArtRect(rightLeader.protectedBounds, mirrorConstant),
          );
          expect(leftLeader.target.x + rightLeader.target.x).toBeCloseTo(mirrorConstant, 3);
          expect(leftLeader.target.y).toBe(rightLeader.target.y);
        }
      }
    }
  });

  it("uses two protected endpoints for a two-region cholesteatoma layer under one ordinal", () => {
    const plan = createPresetPlan("tympanomastoidectomy");
    const descriptor = descriptorsForPlan(plan).find(
      ({ layer }) => layer.kind === "cholesteatoma_extent",
    );
    expect(descriptor?.targets).toHaveLength(2);
    if (!descriptor) return;

    const [callout] = standardLayout([descriptor]);
    expect(callout.legendNumber).toBe(1);
    expect(callout.leaders).toHaveLength(2);
    expect(new Set(callout.leaders.map((leader) => leader.basis))).toEqual(
      new Set(["asset-cholesteatoma-epitympanum", "asset-cholesteatoma-mastoid"]),
    );
  });

  it("does not assign a precise anatomy callout to nonspatial or unsupported semantics", () => {
    const cases: Array<{ plan: SurgeryPlan; layer: SurgeryLayer }> = [];

    for (const family of procedureFamilies) {
      const plan = createPresetPlan(family);
      for (const layer of plan.layers.filter(
        (candidate) => candidate.kind === "verification_status",
      )) {
        cases.push({ plan, layer });
      }
    }

    const stapesPlan = createPresetPlan("stapes_surgery");
    const stapes = stapesPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "stapes_procedure" }> =>
        layer.kind === "stapes_procedure",
    );
    if (stapes) {
      cases.push({
        plan: stapesPlan,
        layer: { ...stapes, pistonAttachment: "not_documented" },
      });
      cases.push({
        plan: stapesPlan,
        layer: { ...stapes, technique: "stapedectomy" },
      });
    }

    const cochlearPlan = createPresetPlan("cochlear_implant");
    const cochlear = cochlearPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "cochlear_insertion" }> =>
        layer.kind === "cochlear_insertion",
    );
    if (cochlear) {
      cases.push({
        plan: cochlearPlan,
        layer: { ...cochlear, completion: "partial" },
      });
    }

    const bonePlan = createPresetPlan("bone_conduction_implant");
    const bone = bonePlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "bone_conduction_implant" }> =>
        layer.kind === "bone_conduction_implant",
    );
    if (bone) {
      cases.push({
        plan: bonePlan,
        layer: { ...bone, coupling: "percutaneous" },
      });
    }

    const canalPlan = createPresetPlan("canalplasty");
    const canal = canalPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "canalplasty" }> =>
        layer.kind === "canalplasty",
    );
    if (canal) {
      cases.push({
        plan: canalPlan,
        layer: { ...canal, result: "aborted" },
      });
    }

    const tubePlan = createPresetPlan("eustachian_tube_dilation");
    const dilation = tubePlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "eustachian_tube_dilation" }> =>
        layer.kind === "eustachian_tube_dilation",
    );
    if (dilation) {
      cases.push({
        plan: tubePlan,
        layer: { ...dilation, result: "aborted" },
      });
    }

    const cholesteatomaPlan = createPresetPlan("tympanomastoidectomy");
    const mastoid = cholesteatomaPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "mastoid_technique" }> =>
        layer.kind === "mastoid_technique",
    );
    if (mastoid) {
      cases.push({
        plan: cholesteatomaPlan,
        layer: { ...mastoid, technique: "canal_wall_down" },
      });
    }
    const cholesteatoma = cholesteatomaPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "cholesteatoma_extent" }> =>
        layer.kind === "cholesteatoma_extent",
    );
    if (cholesteatoma) {
      cases.push({
        plan: cholesteatomaPlan,
        layer: { ...cholesteatoma, regions: ["sinus_tympani"] },
      });
    }

    const noGraftPlan = createPresetPlan("tympanoplasty");
    const graft = noGraftPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "tm_graft" }> => layer.kind === "tm_graft",
    );
    if (graft) {
      cases.push({
        plan: noGraftPlan,
        layer: { ...graft, material: "none" },
      });
    }

    const tympanostomyPlan = createPresetPlan("myringotomy_tympanostomy");
    const tympanostomy = tympanostomyPlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "tympanostomy" }> =>
        layer.kind === "tympanostomy",
    );
    if (tympanostomy) {
      for (const tubeType of ["t_tube", "other", "not_documented", "none"] as const) {
        cases.push({
          plan: tympanostomyPlan,
          layer: { ...tympanostomy, id: `unsupported-${tubeType}`, tubeType },
        });
      }
    }

    const undocumentedState = {
      ...createDefaultLayer("tm_state", "right"),
      documentation: "documented" as const,
      state: "not_documented" as const,
    };
    cases.push({
      plan: createPresetPlan("tympanoplasty"),
      layer: undocumentedState,
    });

    const ossiclePlan = createPresetPlan("ossiculoplasty");
    const incus = ossiclePlan.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "ossicle_state" }> =>
        layer.kind === "ossicle_state",
    );
    if (incus) {
      cases.push({
        plan: ossiclePlan,
        layer: { ...incus, state: "body_eroded" },
      });
      cases.push({
        plan: ossiclePlan,
        layer: { ...incus, id: "unsupported-mobile-state", state: "mobile" },
      });
    }

    for (const { plan, layer } of cases) {
      const { asset, fitted } = fittedMedicalArt(plan);
      expect(
        resolveMedicalArtCalloutDescriptor(layer, plan, asset, fitted),
        `${layer.kind}:${layer.id}`,
      ).toBeNull();
    }
  });

  it("targets the calibrated PORP shaft rather than the old IS-joint anchor", () => {
    const plan = createPresetPlan("ossiculoplasty");
    const descriptor = descriptorsForPlan(plan).find(
      ({ layer }) => layer.kind === "ossicular_reconstruction",
    );
    expect(descriptor?.targets).toHaveLength(1);
    const target = descriptor?.targets[0];
    expect(target?.basis).toBe("source-calibrated-porp-prosthesis");
    expect(target?.sourcePoint).toEqual({ x: 121.111, y: 230.313 });
    expect(target?.sourcePoint).not.toEqual({ x: 177, y: 211 });
  });

  it("routes state-dependent ossicular endpoints to the retained source anatomy", () => {
    const boneCementPlan = createPresetPlan("ossiculoplasty");
    boneCementPlan.layers = boneCementPlan.layers.map((layer) =>
      layer.kind === "ossicular_reconstruction"
        ? {
            ...layer,
            method: "bone_cement_bridge",
            material: "otomimix",
            lateralEndpoint: "incus_long_process",
            medialEndpoint: "stapes_capitulum",
          }
        : layer,
    );
    const boneCement = descriptorsForPlan(boneCementPlan).find(
      ({ layer }) => layer.kind === "ossicular_reconstruction",
    );
    expect(boneCement?.targets[0]).toMatchObject({
      basis: "source-endpoint-reconstruction",
      sourcePoint: { x: 148.5, y: 184 },
    });

    const malleusPistonPlan = createPresetPlan("stapes_surgery");
    malleusPistonPlan.layers = malleusPistonPlan.layers.map((layer) =>
      layer.kind === "stapes_procedure" ? { ...layer, pistonAttachment: "malleus" } : layer,
    );
    const malleusPiston = descriptorsForPlan(malleusPistonPlan).find(
      ({ layer }) => layer.kind === "stapes_procedure",
    );
    expect(malleusPiston?.targets[0]).toMatchObject({
      basis: "source-stapes-piston-endpoints",
      sourcePoint: { x: 148.5, y: 189 },
    });
  });

  it("protects the full reconstructed-state and rotated fallback-graft geometry", () => {
    const reconstructedPlan = createPresetPlan("ossiculoplasty");
    reconstructedPlan.layers = reconstructedPlan.layers.map((layer) =>
      layer.kind === "ossicle_state" ? { ...layer, state: "reconstructed" } : layer,
    );
    const reconstructed = descriptorsForPlan(reconstructedPlan).find(
      ({ layer }) => layer.kind === "ossicle_state",
    );
    const reconstructedBounds = reconstructed?.targets[0].protectedBounds;
    expect((reconstructedBounds?.right ?? 0) - (reconstructedBounds?.left ?? 0)).toBeCloseTo(62, 3);
    expect((reconstructedBounds?.bottom ?? 0) - (reconstructedBounds?.top ?? 0)).toBeCloseTo(48, 3);

    const protectionPlan = createPresetPlan("ossiculoplasty");
    protectionPlan.layers = protectionPlan.layers.map((layer) =>
      layer.kind === "ossicular_reconstruction"
        ? {
            ...layer,
            method: "bone_cement_bridge",
            material: "otomimix",
            lateralEndpoint: "incus_long_process",
            medialEndpoint: "stapes_capitulum",
          }
        : layer,
    );
    const protection = descriptorsForPlan(protectionPlan).find(
      ({ layer }) => layer.kind === "tm_graft",
    );
    const protectionBounds = protection?.targets[0].protectedBounds;
    expect((protectionBounds?.right ?? 0) - (protectionBounds?.left ?? 0)).toBeCloseTo(72, 3);
    expect((protectionBounds?.bottom ?? 0) - (protectionBounds?.top ?? 0)).toBeCloseTo(64, 3);
  });
});
