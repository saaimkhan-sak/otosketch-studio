import {
  getMedicalArtAnchor,
  getMedicalArtAnchorForTarget,
  medicalArtSourceGeometry,
  type MedicalArtAnatomyTarget,
  type MedicalArtAsset,
  type MedicalArtSourcePoint,
} from "./medicalArt";
import {
  deriveMedicalArtTympanicPolygon,
  deriveMedicalArtTympanostomyPoint,
  deriveServierProsthesisPlacement,
  mapTympanicPolygonToMedicalArtSource,
  smoothClosedSourceBounds,
  sourcePolygonCentroid,
  type SourceEllipse,
} from "./medicalArtPlacement";
import type { EducationMode } from "./educationMode";
import { getActiveSurgeryLayers, type SurgeryLayer, type SurgeryPlan } from "./surgeryPlan";

export interface MedicalArtFittedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MedicalArtCalloutRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MedicalArtCalloutTarget {
  point: MedicalArtSourcePoint;
  protectedBounds: MedicalArtCalloutRect;
  basis: string;
  sourcePoint?: MedicalArtSourcePoint;
}

export interface MedicalArtCalloutDescriptor {
  layer: SurgeryLayer;
  targets: MedicalArtCalloutTarget[];
}

export interface NumberedMedicalArtCalloutCandidate {
  descriptor: MedicalArtCalloutDescriptor;
  legendNumber: number;
}

export interface MedicalArtCalloutLeader {
  target: MedicalArtSourcePoint;
  protectedBounds: MedicalArtCalloutRect;
  start: MedicalArtSourcePoint;
  end: MedicalArtSourcePoint;
  basis: string;
  sourcePoint?: MedicalArtSourcePoint;
}

export interface NumberedMedicalArtCallout {
  layer: SurgeryLayer;
  legendNumber: number;
  badgeCenter: MedicalArtSourcePoint;
  leaders: MedicalArtCalloutLeader[];
}

export interface MedicalArtCalloutLayoutConfig {
  railX: number;
  top: number;
  bottom: number;
  badgeRadius: number;
  badgeStrokeWidth: number;
  badgeClearance: number;
  minCenterSpacing: number;
  endpointClearance: number;
  mirrorConstant?: number;
}

const precision = 3;

function round(value: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function projectSourcePoint(
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
  point: MedicalArtSourcePoint,
) {
  return {
    x: round(fitted.x + (point.x / asset.width) * fitted.width),
    y: round(fitted.y + (point.y / asset.height) * fitted.height),
  };
}

function sourcePointForTarget(asset: MedicalArtAsset, target: MedicalArtAnatomyTarget) {
  const anchor = getMedicalArtAnchorForTarget(asset.id, target);
  if (!anchor) return null;
  return {
    x: round((anchor.x / 100) * asset.width),
    y: round((anchor.y / 100) * asset.height),
  };
}

function layerAnchorSourcePoint(asset: MedicalArtAsset, layer: SurgeryLayer) {
  const anchor = getMedicalArtAnchor(asset.id, layer);
  if (!anchor) return null;
  return {
    x: round((anchor.x / 100) * asset.width),
    y: round((anchor.y / 100) * asset.height),
  };
}

function boundsAround(
  point: MedicalArtSourcePoint,
  radiusX: number,
  radiusY = radiusX,
): MedicalArtCalloutRect {
  return {
    left: round(point.x - radiusX),
    top: round(point.y - radiusY),
    right: round(point.x + radiusX),
    bottom: round(point.y + radiusY),
  };
}

function boundsFromPoints(points: MedicalArtSourcePoint[], padding = 0): MedicalArtCalloutRect {
  return {
    left: round(Math.min(...points.map((point) => point.x)) - padding),
    top: round(Math.min(...points.map((point) => point.y)) - padding),
    right: round(Math.max(...points.map((point) => point.x)) + padding),
    bottom: round(Math.max(...points.map((point) => point.y)) + padding),
  };
}

function mergeBounds(bounds: MedicalArtCalloutRect[]): MedicalArtCalloutRect {
  return {
    left: round(Math.min(...bounds.map((item) => item.left))),
    top: round(Math.min(...bounds.map((item) => item.top))),
    right: round(Math.max(...bounds.map((item) => item.right))),
    bottom: round(Math.max(...bounds.map((item) => item.bottom))),
  };
}

function projectSourceBounds(
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
  bounds: MedicalArtCalloutRect,
  screenPadding = 0,
): MedicalArtCalloutRect {
  const first = projectSourcePoint(asset, fitted, {
    x: bounds.left,
    y: bounds.top,
  });
  const second = projectSourcePoint(asset, fitted, {
    x: bounds.right,
    y: bounds.bottom,
  });
  return {
    left: round(first.x - screenPadding),
    top: round(first.y - screenPadding),
    right: round(second.x + screenPadding),
    bottom: round(second.y + screenPadding),
  };
}

function sourceEllipseBounds(ellipse: SourceEllipse) {
  const radians = (ellipse.rotation * Math.PI) / 180;
  const extentX = Math.sqrt(
    (ellipse.radiusX * Math.cos(radians)) ** 2 + (ellipse.radiusY * Math.sin(radians)) ** 2,
  );
  const extentY = Math.sqrt(
    (ellipse.radiusX * Math.sin(radians)) ** 2 + (ellipse.radiusY * Math.cos(radians)) ** 2,
  );
  return boundsAround(ellipse.center, extentX, extentY);
}

function targetFromSource(
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
  sourcePoint: MedicalArtSourcePoint,
  sourceBounds: MedicalArtCalloutRect,
  basis: string,
  padding = 4,
): MedicalArtCalloutTarget {
  return {
    point: projectSourcePoint(asset, fitted, sourcePoint),
    protectedBounds: projectSourceBounds(asset, fitted, sourceBounds, padding),
    basis,
    sourcePoint,
  };
}

function targetFromDisplay(
  point: MedicalArtSourcePoint,
  protectedBounds: MedicalArtCalloutRect,
  basis: string,
): MedicalArtCalloutTarget {
  return { point, protectedBounds, basis };
}

function endpointSourcePoint(
  asset: MedicalArtAsset,
  endpoint:
    | Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>["lateralEndpoint"]
    | Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>["medialEndpoint"],
  method?: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>["method"],
  preferIncusErosionStump = false,
) {
  const targetByEndpoint: Partial<Record<typeof endpoint, MedicalArtAnatomyTarget>> = {
    tympanic_membrane: "tm_prosthesis_contact",
    malleus: "malleus_manubrium",
    incus_long_process: "incus_long_process",
    incus_body: "incus_body",
    incudostapedial_joint: "incudostapedial_joint",
    stapes_capitulum: "stapes_capitulum",
    stapes_superstructure: "stapes_superstructure",
    stapes_footplate: "stapes_footplate",
  };
  const target =
    preferIncusErosionStump && endpoint === "incus_long_process"
      ? "incus_erosion_stump"
      : method === "porp" && endpoint === "stapes_superstructure"
        ? "stapes_capitulum"
        : targetByEndpoint[endpoint];
  if (!target) return null;
  return (
    sourcePointForTarget(asset, target) ??
    (endpoint === "tympanic_membrane"
      ? sourcePointForTarget(asset, "tympanic_membrane_medial")
      : endpoint === "malleus"
        ? sourcePointForTarget(asset, "malleus")
        : null)
  );
}

function resolveTympanicStateTarget(
  layer: Extract<SurgeryLayer, { kind: "tm_state" }>,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (layer.state === "not_documented") return null;
  const sourcePoint = layerAnchorSourcePoint(asset, layer);
  if (!sourcePoint) return null;
  const geometry = medicalArtSourceGeometry[asset.id]?.tympanicMembrane?.repairGraftBounds;
  if (layer.state === "intact" && geometry) {
    return targetFromSource(
      asset,
      fitted,
      sourcePoint,
      {
        left: geometry.x,
        top: geometry.y,
        right: geometry.x + geometry.width,
        bottom: geometry.y + geometry.height,
      },
      "source-tympanic-anatomy",
      3,
    );
  }
  const point = projectSourcePoint(asset, fitted, sourcePoint);
  return targetFromDisplay(
    point,
    boundsAround(point, 45, 58),
    layer.state === "retraction" ? "anchor-relative-retraction" : "source-anatomy-anchor",
  );
}

function resolveTympanicPerforationTarget(
  layer: Extract<SurgeryLayer, { kind: "tm_perforation" }>,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (layer.region === "not_documented" && !layer.geometry) return null;
  const points = deriveMedicalArtTympanicPolygon(asset.id, layer.region, layer.geometry);
  if (points) {
    const pathBounds = smoothClosedSourceBounds(points);
    if (!pathBounds) return null;
    return targetFromSource(
      asset,
      fitted,
      sourcePolygonCentroid(points),
      pathBounds,
      layer.geometry ? "source-documented-tympanic-polygon" : "source-reviewed-tympanic-region",
      5,
    );
  }
  const sourcePoint = layerAnchorSourcePoint(asset, layer);
  if (!sourcePoint) return null;
  const point = projectSourcePoint(asset, fitted, sourcePoint);
  return targetFromDisplay(
    point,
    boundsAround(point, 24, 32),
    "anchor-relative-tympanic-perforation",
  );
}

function resolveTympanicGraftTarget(
  layer: Extract<SurgeryLayer, { kind: "tm_graft" }>,
  plan: SurgeryPlan,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (layer.material === "none" || layer.purpose === "not_documented") {
    return null;
  }

  if (layer.purpose === "prosthesis_protection") {
    const targetLayer = plan.layers.find(
      (candidate): candidate is Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }> =>
        candidate.id === layer.targetLayerId &&
        candidate.kind === "ossicular_reconstruction" &&
        candidate.documentation === "documented",
    );
    if (!targetLayer) return null;
    if (
      asset.id === "servier-inner-ear" &&
      targetLayer.lateralEndpoint === "tympanic_membrane" &&
      (targetLayer.method === "porp" || targetLayer.method === "torp")
    ) {
      const cartilage = deriveServierProsthesisPlacement(targetLayer.method).protectionCartilage;
      return targetFromSource(
        asset,
        fitted,
        cartilage.center,
        sourceEllipseBounds(cartilage),
        "source-calibrated-protection-cartilage",
        4,
      );
    }
    const contact =
      endpointSourcePoint(asset, targetLayer.lateralEndpoint, targetLayer.method) ??
      sourcePointForTarget(asset, "tm_prosthesis_contact") ??
      sourcePointForTarget(asset, "tympanic_membrane_medial");
    if (!contact) return null;
    const point = projectSourcePoint(asset, fitted, contact);
    return targetFromDisplay(
      point,
      boundsAround(point, 36, 32),
      "endpoint-calibrated-protection-graft",
    );
  }

  const geometry = medicalArtSourceGeometry[asset.id]?.tympanicMembrane;
  if (layer.geometry && geometry) {
    const points = mapTympanicPolygonToMedicalArtSource(asset.id, layer.geometry);
    const pathBounds = smoothClosedSourceBounds(points);
    if (!pathBounds) return null;
    return targetFromSource(
      asset,
      fitted,
      sourcePolygonCentroid(points),
      pathBounds,
      "source-documented-covering-graft",
      5,
    );
  }
  const sourcePoint = layerAnchorSourcePoint(asset, layer);
  if (!sourcePoint) return null;
  if (geometry) {
    const bounds = geometry.repairGraftBounds;
    return targetFromSource(
      asset,
      fitted,
      sourcePoint,
      {
        left: bounds.x,
        top: bounds.y,
        right: bounds.x + bounds.width,
        bottom: bounds.y + bounds.height,
      },
      "source-full-tympanic-graft",
      4,
    );
  }
  const point = projectSourcePoint(asset, fitted, sourcePoint);
  return targetFromDisplay(point, boundsAround(point, 42, 74), "anchor-relative-tympanic-graft");
}

function resolveOssicleStateTarget(
  layer: Extract<SurgeryLayer, { kind: "ossicle_state" }>,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (layer.state === "not_documented" || layer.state === "mobile") return null;
  if (asset.components && (layer.state === "eroded" || layer.state === "body_eroded")) {
    return null;
  }
  if (layer.state === "long_process_eroded" && layer.structure !== "incus") {
    return null;
  }
  if (layer.state === "discontinuous" && layer.structure !== "incudostapedial_joint") {
    return null;
  }
  const sourcePoint = layerAnchorSourcePoint(asset, layer);
  if (!sourcePoint) return null;
  const point = projectSourcePoint(asset, fitted, sourcePoint);
  const extents =
    layer.state === "absent"
      ? { x: 38, y: 29 }
      : layer.state === "fixed"
        ? { x: 32, y: 21 }
        : layer.state === "long_process_eroded"
          ? { x: 14, y: 14 }
          : ["eroded", "body_eroded", "discontinuous"].includes(layer.state)
            ? { x: 26, y: 24 }
            : layer.state === "reconstructed"
              ? { x: 31, y: 24 }
              : { x: 22, y: 20 };
  return {
    point,
    protectedBounds: boundsAround(point, extents.x, extents.y),
    basis:
      asset.id === "servier-inner-ear" ? "source-ossicular-landmark" : "asset-ossicular-anchor",
    sourcePoint,
  };
}

function resolveReconstructionTarget(
  layer: Extract<SurgeryLayer, { kind: "ossicular_reconstruction" }>,
  plan: SurgeryPlan,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (
    layer.method === "none" ||
    layer.method === "not_documented" ||
    layer.lateralEndpoint === "not_documented" ||
    layer.medialEndpoint === "not_documented"
  ) {
    return null;
  }
  if (
    asset.id === "servier-inner-ear" &&
    layer.lateralEndpoint === "tympanic_membrane" &&
    (layer.method === "porp" || layer.method === "torp")
  ) {
    const placement = deriveServierProsthesisPlacement(layer.method);
    const point = {
      x: round((placement.shaft.start.x + placement.shaft.end.x) / 2),
      y: round((placement.shaft.start.y + placement.shaft.end.y) / 2),
    };
    const bounds = mergeBounds([
      sourceEllipseBounds(placement.headPlate),
      sourceEllipseBounds(placement.distalContact),
      boundsFromPoints([placement.shaft.start, placement.shaft.end], 4),
    ]);
    return targetFromSource(
      asset,
      fitted,
      point,
      bounds,
      `source-calibrated-${layer.method}-prosthesis`,
      4,
    );
  }
  const preferIncusErosionStump =
    layer.method === "bone_cement_bridge" &&
    getActiveSurgeryLayers(plan).some(
      (candidate) =>
        candidate.kind === "ossicle_state" &&
        candidate.documentation === "documented" &&
        candidate.structure === "incus" &&
        candidate.state === "long_process_eroded" &&
        (candidate.side === layer.side ||
          candidate.side === "bilateral" ||
          layer.side === "bilateral"),
    );
  const lateral = endpointSourcePoint(
    asset,
    layer.lateralEndpoint,
    layer.method,
    preferIncusErosionStump,
  );
  const medial = endpointSourcePoint(
    asset,
    layer.medialEndpoint,
    layer.method,
    preferIncusErosionStump,
  );
  if (!lateral || !medial) return null;
  const sourcePoint = {
    x: round((lateral.x + medial.x) / 2),
    y: round((lateral.y + medial.y) / 2),
  };
  return targetFromSource(
    asset,
    fitted,
    sourcePoint,
    boundsFromPoints([lateral, medial], 24),
    "source-endpoint-reconstruction",
    4,
  );
}

function resolveTympanostomyTarget(
  layer: Extract<SurgeryLayer, { kind: "tympanostomy" }>,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (layer.action === "not_documented" || layer.quadrant === "not_documented") {
    return null;
  }
  if (layer.action === "tube_placed" && layer.tubeType !== "short_term") {
    return null;
  }
  const sourcePoint =
    deriveMedicalArtTympanostomyPoint(asset.id, layer.quadrant) ??
    layerAnchorSourcePoint(asset, layer);
  if (!sourcePoint) return null;
  const point = projectSourcePoint(asset, fitted, sourcePoint);
  return {
    point,
    protectedBounds:
      layer.action === "tube_placed" ? boundsAround(point, 27, 23) : boundsAround(point, 19, 14),
    basis: deriveMedicalArtTympanostomyPoint(asset.id, layer.quadrant)
      ? "source-tympanic-quadrant"
      : "asset-tympanic-quadrant-anchor",
    sourcePoint,
  };
}

function resolveStapesTarget(
  layer: Extract<SurgeryLayer, { kind: "stapes_procedure" }>,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
) {
  if (layer.technique === "not_documented") return null;
  const footplate = sourcePointForTarget(asset, "stapes_footplate");
  if (!footplate) return null;
  if (layer.technique === "exploration_only") {
    return targetFromSource(
      asset,
      fitted,
      footplate,
      boundsAround(footplate, 38, 27),
      "source-stapes-exploration",
      4,
    );
  }
  if (
    (layer.pistonAttachment !== "incus_long_process" && layer.pistonAttachment !== "malleus") ||
    layer.fenestra === "not_documented"
  ) {
    return null;
  }
  const attachment =
    layer.pistonAttachment === "malleus"
      ? (sourcePointForTarget(asset, "malleus_manubrium") ?? sourcePointForTarget(asset, "malleus"))
      : sourcePointForTarget(
          asset,
          asset.id === "servier-inner-ear" ? "incus_piston_attachment" : "incus_long_process",
        );
  if (!attachment) return null;
  const sourcePoint = {
    x: round((attachment.x + footplate.x) / 2),
    y: round((attachment.y + footplate.y) / 2),
  };
  return targetFromSource(
    asset,
    fitted,
    sourcePoint,
    boundsFromPoints([attachment, footplate], 14),
    "source-stapes-piston-endpoints",
    4,
  );
}

function pointTargetFromLayerAnchor(
  layer: SurgeryLayer,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
  radiusX: number,
  radiusY: number,
  basis: string,
) {
  const sourcePoint = layerAnchorSourcePoint(asset, layer);
  if (!sourcePoint) return null;
  const point = projectSourcePoint(asset, fitted, sourcePoint);
  return {
    point,
    protectedBounds: boundsAround(point, radiusX, radiusY),
    basis,
    sourcePoint,
  } satisfies MedicalArtCalloutTarget;
}

export function resolveMedicalArtCalloutDescriptor(
  layer: SurgeryLayer,
  plan: SurgeryPlan,
  asset: MedicalArtAsset,
  fitted: MedicalArtFittedRect,
  presentationMode: EducationMode = "postoperative_summary",
): MedicalArtCalloutDescriptor | null {
  if (layer.documentation !== "documented") return null;
  let targets: MedicalArtCalloutTarget[] = [];

  switch (layer.kind) {
    case "tm_state": {
      const target = resolveTympanicStateTarget(layer, asset, fitted);
      if (target) targets = [target];
      break;
    }
    case "tm_perforation": {
      const target = resolveTympanicPerforationTarget(layer, asset, fitted);
      if (target) targets = [target];
      break;
    }
    case "tm_graft": {
      const target = resolveTympanicGraftTarget(layer, plan, asset, fitted);
      if (target) targets = [target];
      break;
    }
    case "ossicle_state": {
      const target = resolveOssicleStateTarget(layer, asset, fitted);
      if (target) targets = [target];
      break;
    }
    case "ossicular_reconstruction": {
      const target = resolveReconstructionTarget(layer, plan, asset, fitted);
      if (target) targets = [target];
      break;
    }
    case "tympanostomy": {
      const target = resolveTympanostomyTarget(layer, asset, fitted);
      if (target) targets = [target];
      break;
    }
    case "mastoid_technique": {
      if (layer.technique === "canal_wall_up") {
        const target = pointTargetFromLayerAnchor(
          layer,
          asset,
          fitted,
          68,
          59,
          "asset-mastoid-landmark",
        );
        if (target) targets = [target];
      }
      break;
    }
    case "cholesteatoma_extent": {
      const supportedRegions = new Set(["epitympanum", "mastoid"]);
      if (
        layer.regions.length === 0 ||
        layer.regions.some((region) => !supportedRegions.has(region))
      ) {
        break;
      }
      for (const region of layer.regions) {
        const anatomyTarget = region === "epitympanum" ? "epitympanum" : "mastoid";
        const sourcePoint = sourcePointForTarget(asset, anatomyTarget);
        if (!sourcePoint) continue;
        const point = projectSourcePoint(asset, fitted, sourcePoint);
        targets.push({
          point,
          protectedBounds:
            region === "epitympanum" ? boundsAround(point, 39, 35) : boundsAround(point, 49, 43),
          basis: `asset-cholesteatoma-${region}`,
          sourcePoint,
        });
      }
      break;
    }
    case "stapes_procedure": {
      if (layer.technique === "stapedotomy" || layer.technique === "exploration_only") {
        const target = resolveStapesTarget(layer, asset, fitted);
        if (target) targets = [target];
      }
      break;
    }
    case "cochlear_insertion": {
      const completionSupported =
        layer.completion === "full" ||
        (presentationMode === "preoperative_education" && layer.completion === "not_documented");
      if (layer.route !== "round_window" || !completionSupported || layer.array !== "standard") {
        break;
      }
      const roundWindow = sourcePointForTarget(asset, "round_window");
      const cochlea = sourcePointForTarget(asset, "cochlea");
      if (!roundWindow || !cochlea) break;
      const sourcePoint = {
        x: round((roundWindow.x + cochlea.x) / 2),
        y: round((roundWindow.y + cochlea.y) / 2),
      };
      const roundWindowDisplay = projectSourcePoint(asset, fitted, roundWindow);
      const cochleaDisplay = projectSourcePoint(asset, fitted, cochlea);
      targets = [
        {
          point: projectSourcePoint(asset, fitted, sourcePoint),
          protectedBounds: boundsFromPoints([roundWindowDisplay, cochleaDisplay], 48),
          basis: "source-cochlear-round-window-path",
          sourcePoint,
        },
      ];
      break;
    }
    case "bone_conduction_implant": {
      if (layer.coupling === "active_transcutaneous" && layer.stage === "one_stage") {
        const target = pointTargetFromLayerAnchor(
          layer,
          asset,
          fitted,
          43,
          43,
          "asset-postauricular-implant-landmark",
        );
        if (target) targets = [target];
      }
      break;
    }
    case "canalplasty": {
      const resultSupported =
        layer.result === "widened" ||
        (presentationMode === "preoperative_education" && layer.result === "not_documented");
      if (layer.region === "multiple" && resultSupported) {
        const target = pointTargetFromLayerAnchor(
          layer,
          asset,
          fitted,
          82,
          57,
          "asset-ear-canal-landmark",
        );
        if (target) targets = [target];
      }
      break;
    }
    case "eustachian_tube_dilation": {
      const resultSupported =
        layer.result === "completed" ||
        (presentationMode === "preoperative_education" && layer.result === "not_documented");
      if (resultSupported) {
        const target = pointTargetFromLayerAnchor(
          layer,
          asset,
          fitted,
          91,
          58,
          "asset-eustachian-tube-landmark",
        );
        if (target) targets = [target];
      }
      break;
    }
    case "intraoperative_deviation":
    case "verification_status":
      break;
  }

  return targets.length > 0 ? { layer, targets } : null;
}

export function hasMedicalArtSpatialPresentation(
  layer: SurgeryLayer,
  plan: SurgeryPlan,
  asset: MedicalArtAsset,
  presentationMode: EducationMode = "postoperative_summary",
) {
  return Boolean(
    resolveMedicalArtCalloutDescriptor(
      layer,
      plan,
      asset,
      { x: 0, y: 0, width: asset.width, height: asset.height },
      presentationMode,
    ),
  );
}

export function mirrorMedicalArtPoint(point: MedicalArtSourcePoint, mirrorConstant: number) {
  return { x: round(mirrorConstant - point.x), y: point.y };
}

export function mirrorMedicalArtRect(
  bounds: MedicalArtCalloutRect,
  mirrorConstant: number,
): MedicalArtCalloutRect {
  return {
    left: round(mirrorConstant - bounds.right),
    top: bounds.top,
    right: round(mirrorConstant - bounds.left),
    bottom: bounds.bottom,
  };
}

function displayTarget(
  target: MedicalArtCalloutTarget,
  mirrorConstant?: number,
): MedicalArtCalloutTarget {
  if (mirrorConstant === undefined) return target;
  return {
    ...target,
    point: mirrorMedicalArtPoint(target.point, mirrorConstant),
    protectedBounds: mirrorMedicalArtRect(target.protectedBounds, mirrorConstant),
  };
}

function clamped(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function leaderEndOutsideBounds(
  target: MedicalArtSourcePoint,
  badge: MedicalArtSourcePoint,
  bounds: MedicalArtCalloutRect,
  clearance: number,
) {
  const dx = badge.x - target.x;
  const dy = badge.y - target.y;
  const length = Math.hypot(dx, dy) || 1;
  const candidates: number[] = [];
  if (dx > 0) candidates.push((bounds.right - target.x) / dx);
  if (dx < 0) candidates.push((bounds.left - target.x) / dx);
  if (dy > 0) candidates.push((bounds.bottom - target.y) / dy);
  if (dy < 0) candidates.push((bounds.top - target.y) / dy);
  const boundaryScale = Math.min(...candidates.filter((candidate) => candidate >= 0));
  return {
    x: round(target.x + dx * boundaryScale + (dx / length) * clearance),
    y: round(target.y + dy * boundaryScale + (dy / length) * clearance),
  };
}

function leaderStartAtBadge(
  badge: MedicalArtSourcePoint,
  end: MedicalArtSourcePoint,
  outerRadius: number,
) {
  const dx = end.x - badge.x;
  const dy = end.y - badge.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: round(badge.x + (dx / length) * outerRadius),
    y: round(badge.y + (dy / length) * outerRadius),
  };
}

export function layoutNumberedMedicalArtCallouts(
  candidates: NumberedMedicalArtCalloutCandidate[],
  config: MedicalArtCalloutLayoutConfig,
): NumberedMedicalArtCallout[] {
  if (candidates.length === 0) return [];
  const displayed = candidates
    .map((candidate) => {
      const targets = candidate.descriptor.targets.map((target) =>
        displayTarget(target, config.mirrorConstant),
      );
      return {
        ...candidate,
        targets,
        desiredY: targets.reduce((total, target) => total + target.point.y, 0) / targets.length,
      };
    })
    .sort(
      (first, second) =>
        first.desiredY - second.desiredY ||
        first.legendNumber - second.legendNumber ||
        first.descriptor.layer.id.localeCompare(second.descriptor.layer.id),
    );

  const outerRadius = config.badgeRadius + config.badgeStrokeWidth / 2 + config.badgeClearance;
  const minimumY = config.top + outerRadius;
  const requiredBottom = minimumY + (displayed.length - 1) * config.minCenterSpacing;
  const maximumY = config.bottom - outerRadius;
  if (requiredBottom > maximumY) {
    throw new Error(`Callout rail is too short for ${displayed.length} collision-free badges.`);
  }
  const ys: number[] = [];

  for (let index = 0; index < displayed.length; index += 1) {
    const desired = clamped(displayed[index].desiredY, minimumY, maximumY);
    ys[index] = index === 0 ? desired : Math.max(desired, ys[index - 1] + config.minCenterSpacing);
  }

  ys[ys.length - 1] = Math.min(ys[ys.length - 1], maximumY);
  for (let index = ys.length - 2; index >= 0; index -= 1) {
    ys[index] = Math.max(minimumY, Math.min(ys[index], ys[index + 1] - config.minCenterSpacing));
  }
  for (let index = 1; index < ys.length; index += 1) {
    ys[index] = Math.min(maximumY, Math.max(ys[index], ys[index - 1] + config.minCenterSpacing));
  }

  const byLayerId = new Map<string, NumberedMedicalArtCallout>();
  displayed.forEach((candidate, index) => {
    const badgeCenter = { x: config.railX, y: round(ys[index]) };
    const leaders = candidate.targets.map((target) => {
      const end = leaderEndOutsideBounds(
        target.point,
        badgeCenter,
        target.protectedBounds,
        config.endpointClearance,
      );
      return {
        target: target.point,
        protectedBounds: target.protectedBounds,
        start: leaderStartAtBadge(badgeCenter, end, outerRadius),
        end,
        basis: target.basis,
        sourcePoint: target.sourcePoint,
      };
    });
    byLayerId.set(candidate.descriptor.layer.id, {
      layer: candidate.descriptor.layer,
      legendNumber: candidate.legendNumber,
      badgeCenter,
      leaders,
    });
  });

  return candidates.flatMap((candidate) => {
    const callout = byLayerId.get(candidate.descriptor.layer.id);
    return callout ? [callout] : [];
  });
}

export function medicalArtCalloutRectData(bounds: MedicalArtCalloutRect) {
  return [bounds.left, bounds.top, bounds.right, bounds.bottom]
    .map((value) => value.toFixed(3))
    .join(",");
}

export function medicalArtCalloutPointData(point: MedicalArtSourcePoint) {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}
