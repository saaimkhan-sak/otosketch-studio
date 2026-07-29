export type TympanicRegion = "anterior" | "posterior" | "central" | "subtotal" | "not_documented";

export interface NormalizedTympanicPolygon {
  basis: "generic_template";
  points: Array<{ x: number; y: number }>;
}

const reviewedContours: Record<Exclude<TympanicRegion, "not_documented">, NormalizedTympanicPolygon["points"]> = {
  anterior: [
    { x: 0.59, y: 0.34 }, { x: 0.68, y: 0.35 }, { x: 0.75, y: 0.4 },
    { x: 0.77, y: 0.49 }, { x: 0.73, y: 0.58 }, { x: 0.65, y: 0.63 },
    { x: 0.57, y: 0.59 }, { x: 0.54, y: 0.51 }, { x: 0.55, y: 0.42 },
  ],
  posterior: [
    { x: 0.32, y: 0.34 }, { x: 0.41, y: 0.36 }, { x: 0.46, y: 0.43 },
    { x: 0.45, y: 0.52 }, { x: 0.4, y: 0.6 }, { x: 0.31, y: 0.62 },
    { x: 0.24, y: 0.56 }, { x: 0.22, y: 0.47 }, { x: 0.25, y: 0.39 },
  ],
  central: [
    { x: 0.42, y: 0.37 }, { x: 0.51, y: 0.34 }, { x: 0.59, y: 0.38 },
    { x: 0.63, y: 0.47 }, { x: 0.6, y: 0.57 }, { x: 0.52, y: 0.62 },
    { x: 0.43, y: 0.59 }, { x: 0.37, y: 0.52 }, { x: 0.38, y: 0.43 },
  ],
  subtotal: [
    { x: 0.31, y: 0.19 }, { x: 0.48, y: 0.15 }, { x: 0.66, y: 0.2 },
    { x: 0.78, y: 0.33 }, { x: 0.81, y: 0.51 }, { x: 0.74, y: 0.69 },
    { x: 0.58, y: 0.8 }, { x: 0.39, y: 0.79 }, { x: 0.23, y: 0.68 },
    { x: 0.17, y: 0.5 }, { x: 0.21, y: 0.32 },
  ],
};

export function templatePerforationGeometry(
  region: string,
): NormalizedTympanicPolygon | undefined {
  if (region === "not_documented" || !(region in reviewedContours)) return undefined;
  const documentedRegion = region as Exclude<TympanicRegion, "not_documented">;
  return {
    basis: "generic_template",
    points: reviewedContours[documentedRegion].map((point) => ({ ...point })),
  };
}

type TympanicPolygonInput = {
  basis: "generic_template" | "clinician_authored";
  points: Array<{ x: number; y: number }>;
};

export function coveringGraftGeometry(perforation: TympanicPolygonInput): NormalizedTympanicPolygon;
export function coveringGraftGeometry(perforation: undefined): undefined;
export function coveringGraftGeometry(
  perforation: TympanicPolygonInput | undefined,
): NormalizedTympanicPolygon | undefined;
export function coveringGraftGeometry(
  perforation: TympanicPolygonInput | undefined,
): NormalizedTympanicPolygon | undefined {
  if (!perforation) return undefined;
  const center = perforation.points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / perforation.points.length,
      y: sum.y + point.y / perforation.points.length,
    }),
    { x: 0, y: 0 },
  );
  const margin = perforation.points.length > 9 ? 0.075 : 0.1;

  return {
    basis: "generic_template",
    points: perforation.points.map((point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const length = Math.hypot(dx, dy) || 1;
      return {
        x: Math.max(0.08, Math.min(0.92, point.x + (dx / length) * margin)),
        y: Math.max(0.08, Math.min(0.92, point.y + (dy / length) * margin)),
      };
    }),
  };
}
