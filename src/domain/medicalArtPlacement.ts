import {
  medicalArtSourceGeometry,
  type MedicalArtAssetId,
  type MedicalArtSourceCubic,
  type MedicalArtSourcePoint,
} from "./medicalArt";
import { templatePerforationGeometry } from "./tmGeometry";

export type SourcePoint = MedicalArtSourcePoint;

export interface SourceEllipse {
  center: SourcePoint;
  radiusX: number;
  radiusY: number;
  rotation: number;
}

export interface SourceSegment {
  start: SourcePoint;
  end: SourcePoint;
}

export interface ServierProsthesisPlacement {
  method: "porp" | "torp";
  calibrationId: string;
  tympanicSurfaceContact: SourcePoint;
  headPlate: SourceEllipse;
  protectionCartilage: SourceEllipse;
  shaft: SourceSegment;
  distalContact: SourceEllipse;
  distalTarget: "stapes_capitulum" | "stapes_footplate";
  rendering:
    | "neutral-headplate-shaft-capitulum-seat"
    | "neutral-headplate-shaft-footplate-contact";
}

export interface TympanicPolygonInput {
  basis: "generic_template" | "clinician_authored";
  points: SourcePoint[];
}

const servierGeometry = medicalArtSourceGeometry["servier-inner-ear"];
const servierTympanicMembrane = servierGeometry?.tympanicMembrane;

const headPlate = {
  radiusX: 14,
  radiusY: 4.5,
  normalOffset: 8.5,
};

const protectionCartilage = {
  radiusX: 17,
  radiusY: 10,
  normalOffset: 4.5,
};

function round(value: number, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function addScaled(point: SourcePoint, direction: SourcePoint, distance: number) {
  return {
    x: round(point.x + direction.x * distance),
    y: round(point.y + direction.y * distance),
  };
}

function normalize(vector: SourcePoint) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    throw new Error("Cannot normalize a zero-length placement vector.");
  }
  return { x: vector.x / length, y: vector.y / length };
}

function ellipseBoundaryDistance(ellipse: SourceEllipse, direction: SourcePoint) {
  const radians = (-ellipse.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const localX = direction.x * cosine - direction.y * sine;
  const localY = direction.x * sine + direction.y * cosine;
  return (
    1 /
    Math.sqrt(
      (localX * localX) / (ellipse.radiusX * ellipse.radiusX) +
        (localY * localY) / (ellipse.radiusY * ellipse.radiusY),
    )
  );
}

function requiredServierTympanicCalibration() {
  const calibrationId = servierGeometry?.calibrationId;
  const surfaceContact = servierTympanicMembrane?.surfaceContact;
  const medialNormal = servierTympanicMembrane?.medialNormal;
  const planeAngle = servierTympanicMembrane?.planeAngle;
  if (!calibrationId || !surfaceContact || !medialNormal || planeAngle === undefined) {
    throw new Error("Servier tympanic placement calibration is incomplete.");
  }
  return { calibrationId, surfaceContact, medialNormal, planeAngle };
}

/**
 * Produces all prosthesis geometry in the 584 x 370 source coordinate system.
 * The headplate is medial to the protective cartilage, and the shaft ends are
 * calculated at the exact ellipse boundaries rather than shortened by magic
 * pixel offsets.
 */
export function deriveServierProsthesisPlacement(
  method: "porp" | "torp",
): ServierProsthesisPlacement {
  const { calibrationId, surfaceContact, medialNormal, planeAngle } =
    requiredServierTympanicCalibration();
  const headPlateCenter = addScaled(
    surfaceContact,
    medialNormal,
    headPlate.normalOffset,
  );
  const cartilageCenter = addScaled(
    surfaceContact,
    medialNormal,
    protectionCartilage.normalOffset,
  );
  const distalCenter =
    method === "porp" ? { x: 181, y: 211 } : { x: 236, y: 180 };
  const direction = normalize({
    x: distalCenter.x - headPlateCenter.x,
    y: distalCenter.y - headPlateCenter.y,
  });
  const shaftAngle =
    (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
  const plate: SourceEllipse = {
    center: headPlateCenter,
    radiusX: headPlate.radiusX,
    radiusY: headPlate.radiusY,
    rotation: planeAngle,
  };
  const cartilage: SourceEllipse = {
    center: cartilageCenter,
    radiusX: protectionCartilage.radiusX,
    radiusY: protectionCartilage.radiusY,
    rotation: planeAngle,
  };
  const distalContact: SourceEllipse =
    method === "porp"
      ? {
          center: distalCenter,
          radiusX: 6,
          radiusY: 3.75,
          rotation: round(shaftAngle + 90),
        }
      : {
          center: distalCenter,
          radiusX: 8,
          radiusY: 3.25,
          rotation: 14,
        };
  const headBoundary = ellipseBoundaryDistance(plate, direction);
  const distalBoundary = ellipseBoundaryDistance(distalContact, direction);

  return {
    method,
    calibrationId,
    tympanicSurfaceContact: { ...surfaceContact },
    headPlate: plate,
    protectionCartilage: cartilage,
    shaft: {
      start: addScaled(headPlateCenter, direction, headBoundary),
      end: addScaled(distalCenter, direction, -distalBoundary),
    },
    distalContact,
    distalTarget: method === "porp" ? "stapes_capitulum" : "stapes_footplate",
    rendering:
      method === "porp"
        ? "neutral-headplate-shaft-capitulum-seat"
        : "neutral-headplate-shaft-footplate-contact",
  };
}

export function mapTympanicPolygonToServierSource(
  polygon: TympanicPolygonInput,
): SourcePoint[] {
  return mapTympanicPolygonToMedicalArtSource("servier-inner-ear", polygon);
}

function pointOnCubic(segment: MedicalArtSourceCubic, t: number) {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * segment.start.x +
      3 * inverse ** 2 * t * segment.controlOne.x +
      3 * inverse * t ** 2 * segment.controlTwo.x +
      t ** 3 * segment.end.x,
    y:
      inverse ** 3 * segment.start.y +
      3 * inverse ** 2 * t * segment.controlOne.y +
      3 * inverse * t ** 2 * segment.controlTwo.y +
      t ** 3 * segment.end.y,
  };
}

function pointOnBoundary(
  boundary: MedicalArtSourceCubic[],
  normalizedPosition: number,
) {
  if (boundary.length === 0) {
    throw new Error("Tympanic surface boundary is empty.");
  }
  const clamped = Math.max(0, Math.min(1, normalizedPosition));
  const scaled = clamped * boundary.length;
  const segmentIndex = Math.min(
    boundary.length - 1,
    Math.floor(scaled),
  );
  const localPosition =
    segmentIndex === boundary.length - 1 && clamped === 1
      ? 1
      : scaled - segmentIndex;
  return pointOnCubic(boundary[segmentIndex], localPosition);
}

export function mapTympanicPolygonToMedicalArtSource(
  assetId: MedicalArtAssetId,
  polygon: TympanicPolygonInput,
): SourcePoint[] {
  const tympanicMembrane =
    medicalArtSourceGeometry[assetId]?.tympanicMembrane;
  const frame = tympanicMembrane?.normalizedFrame;
  if (frame) {
    return polygon.points.map((point) => ({
      x: round(frame.x + point.x * frame.width),
      y: round(frame.y + point.y * frame.height),
    }));
  }

  const surface = tympanicMembrane?.normalizedSurface;
  if (!surface) {
    throw new Error(
      `${assetId} tympanic normalized surface is not calibrated.`,
    );
  }
  return polygon.points.map((point) => {
    const left = pointOnBoundary(surface.leftBoundary, point.y);
    const right = pointOnBoundary(surface.rightBoundary, point.y);
    return {
      x: round(left.x + (right.x - left.x) * point.x),
      y: round(left.y + (right.y - left.y) * point.x),
    };
  });
}

export function deriveMedicalArtTympanicPolygon(
  assetId: MedicalArtAssetId,
  region: string,
  documentedGeometry?: TympanicPolygonInput,
) {
  const geometry = documentedGeometry ?? templatePerforationGeometry(region);
  return geometry
    ? mapTympanicPolygonToMedicalArtSource(assetId, geometry)
    : null;
}

export function deriveServierTympanicPolygon(
  region: string,
  documentedGeometry?: TympanicPolygonInput,
) {
  return deriveMedicalArtTympanicPolygon(
    "servier-inner-ear",
    region,
    documentedGeometry,
  );
}

export function smoothClosedSourcePath(points: SourcePoint[]) {
  if (points.length < 3) return "";
  const pointAt = (index: number) =>
    points[(index + points.length) % points.length];
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;

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
    path += ` C ${round(controlOne.x)} ${round(controlOne.y)} ${round(
      controlTwo.x,
    )} ${round(controlTwo.y)} ${round(next.x)} ${round(next.y)}`;
  }
  return `${path} Z`;
}

export function sourcePolygonArea(points: SourcePoint[]) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

export function sourcePolygonCentroid(points: SourcePoint[]) {
  const totals = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  return {
    x: round(totals.x / points.length),
    y: round(totals.y / points.length),
  };
}
