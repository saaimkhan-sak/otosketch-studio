import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  getMedicalArtAnchorForTarget,
  medicalArtAssets,
  medicalArtPixelAnchors,
  medicalArtSourceGeometry,
  type MedicalArtAnatomyTarget,
  type MedicalArtAssetId,
  type MedicalArtComponent,
  type MedicalArtSourcePoint,
} from "@/domain/medicalArt";
import {
  deriveMedicalArtTympanicPolygon,
  deriveMedicalArtTympanostomyPoint,
  deriveServierProsthesisPlacement,
  deriveServierTympanicPolygon,
  smoothClosedSourcePath,
  sourcePolygonArea,
  sourcePolygonCentroid,
  type SourceEllipse,
} from "@/domain/medicalArtPlacement";
import { coveringGraftGeometry, templatePerforationGeometry } from "@/domain/tmGeometry";
import cutawayFixture from "./fixtures/medical-art/servier-ear-cutaway-placement.v1.json";
import fixture from "./fixtures/medical-art/servier-inner-ear-placement.v1.json";
import anchorFixture from "./fixtures/medical-art/source-anchor-registry.v1.json";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceAsset = medicalArtAssets["servier-inner-ear"];
const sourceComponents = sourceAsset.components ?? [];

type FixtureComponentId = keyof typeof fixture.components;
type FixtureLandmark = {
  center: MedicalArtSourcePoint;
  tolerance: number;
};
type LoadedAlpha = {
  data: Buffer;
  channels: number;
  width: number;
  height: number;
  offset: MedicalArtSourcePoint;
};

function componentPath(component: MedicalArtComponent) {
  return path.resolve(projectRoot, "public", component.localPath.slice(1));
}

function sourcePath(localPath: string) {
  return path.resolve(projectRoot, "public", localPath.slice(1));
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function distance(left: MedicalArtSourcePoint, right: MedicalArtSourcePoint) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function isWithinLandmark(actual: MedicalArtSourcePoint, landmark: FixtureLandmark) {
  return distance(actual, landmark.center) <= landmark.tolerance;
}

function ellipseEquation(ellipse: SourceEllipse, point: MedicalArtSourcePoint) {
  const radians = (-ellipse.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - ellipse.center.x;
  const deltaY = point.y - ellipse.center.y;
  const localX = deltaX * cosine - deltaY * sine;
  const localY = deltaX * sine + deltaY * cosine;
  return (
    (localX * localX) / (ellipse.radiusX * ellipse.radiusX) +
    (localY * localY) / (ellipse.radiusY * ellipse.radiusY)
  );
}

function ellipseBoundaryPoint(ellipse: SourceEllipse, radians: number) {
  const localX = ellipse.radiusX * Math.cos(radians);
  const localY = ellipse.radiusY * Math.sin(radians);
  const rotation = (ellipse.rotation * Math.PI) / 180;
  return {
    x: ellipse.center.x + localX * Math.cos(rotation) - localY * Math.sin(rotation),
    y: ellipse.center.y + localX * Math.sin(rotation) + localY * Math.cos(rotation),
  };
}

async function loadAlpha(componentId: FixtureComponentId): Promise<LoadedAlpha> {
  const component = sourceComponents.find((candidate) => candidate.id === componentId);
  if (!component) {
    throw new Error(`Missing registered Servier component: ${componentId}`);
  }
  const { data, info } = await sharp(componentPath(component))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    channels: info.channels,
    width: info.width,
    height: info.height,
    offset: { x: component.x, y: component.y },
  };
}

function countAlphaOverlap(left: LoadedAlpha, right: LoadedAlpha, threshold: number) {
  const firstX = Math.max(left.offset.x, right.offset.x);
  const firstY = Math.max(left.offset.y, right.offset.y);
  const lastX = Math.min(left.offset.x + left.width, right.offset.x + right.width);
  const lastY = Math.min(left.offset.y + left.height, right.offset.y + right.height);
  let count = 0;

  for (let sourceY = firstY; sourceY < lastY; sourceY += 1) {
    for (let sourceX = firstX; sourceX < lastX; sourceX += 1) {
      const leftIndex =
        ((sourceY - left.offset.y) * left.width + (sourceX - left.offset.x)) * left.channels + 3;
      const rightIndex =
        ((sourceY - right.offset.y) * right.width + (sourceX - right.offset.x)) * right.channels +
        3;
      if (left.data[leftIndex] >= threshold && right.data[rightIndex] >= threshold) {
        count += 1;
      }
    }
  }

  return count;
}

function alphaAtSourcePoint(image: LoadedAlpha, point: MedicalArtSourcePoint) {
  const localX = Math.round(point.x - image.offset.x);
  const localY = Math.round(point.y - image.offset.y);
  if (localX < 0 || localY < 0 || localX >= image.width || localY >= image.height) {
    return 0;
  }
  return image.data[(localY * image.width + localX) * image.channels + 3];
}

async function rasterizedPathAlpha(pathData: string, width = 584, height = 370) {
  const { data, info } = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${pathData}" fill="#fff"/></svg>`,
    ),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    channels: info.channels,
    width: info.width,
    height: info.height,
    offset: { x: 0, y: 0 },
  } satisfies LoadedAlpha;
}

function alphaBounds(image: LoadedAlpha, threshold: number) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let occupiedPixels = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * image.channels + 3] < threshold) {
        continue;
      }
      occupiedPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, occupiedPixels };
}

describe("Servier native-source placement gold standard", () => {
  it("binds every registered anatomy target to an exact checked-in source pixel", async () => {
    expect(anchorFixture.review.status).toBe("reference-calibrated-pending-ent-signoff");

    for (const [assetId, expectedAsset] of Object.entries(anchorFixture.assets)) {
      const typedAssetId = assetId as MedicalArtAssetId;
      const asset = medicalArtAssets[typedAssetId];
      expect(asset.width, assetId).toBe(expectedAsset.width);
      expect(asset.height, assetId).toBe(expectedAsset.height);
      expect(sha256(await readFile(sourcePath(asset.localPath))), `${assetId} source hash`).toBe(
        expectedAsset.sha256,
      );
      expect(medicalArtPixelAnchors[typedAssetId], assetId).toEqual(expectedAsset.anchors);

      for (const [target, expectedPoint] of Object.entries(expectedAsset.anchors)) {
        const typedTarget = target as MedicalArtAnatomyTarget;
        expect(expectedPoint.x, `${assetId}:${target}:x`).toBeGreaterThanOrEqual(0);
        expect(expectedPoint.x, `${assetId}:${target}:x`).toBeLessThanOrEqual(asset.width);
        expect(expectedPoint.y, `${assetId}:${target}:y`).toBeGreaterThanOrEqual(0);
        expect(expectedPoint.y, `${assetId}:${target}:y`).toBeLessThanOrEqual(asset.height);

        const percentage = getMedicalArtAnchorForTarget(typedAssetId, typedTarget);
        expect(percentage, `${assetId}:${target}:anchor`).not.toBeNull();
        expect(
          ((percentage?.x ?? Infinity) / 100) * asset.width,
          `${assetId}:${target}:round-trip-x`,
        ).toBeCloseTo(expectedPoint.x, 8);
        expect(
          ((percentage?.y ?? Infinity) / 100) * asset.height,
          `${assetId}:${target}:round-trip-y`,
        ).toBeCloseTo(expectedPoint.y, 8);
      }
    }
  });

  it("rejects a one-source-pixel mutation anywhere in the anchor registry", () => {
    for (const [assetId, expectedAsset] of Object.entries(anchorFixture.assets)) {
      const typedAssetId = assetId as MedicalArtAssetId;
      for (const [target, point] of Object.entries(expectedAsset.anchors)) {
        const registered =
          medicalArtPixelAnchors[typedAssetId]?.[target as MedicalArtAnatomyTarget];
        expect(registered, `${assetId}:${target}`).toEqual(point);
        expect(
          { ...registered, x: (registered?.x ?? 0) + 1 },
          `${assetId}:${target} +1 x mutation`,
        ).not.toEqual(point);
        expect(
          { ...registered, y: (registered?.y ?? 0) - 1 },
          `${assetId}:${target} -1 y mutation`,
        ).not.toEqual(point);
      }
    }
  });

  it("binds the calibration to the licensed source canvas and exact official files", async () => {
    expect(sourceAsset.id).toBe(fixture.source.assetId);
    expect(sourceAsset.sourcePage).toBe(fixture.source.sourcePage);
    expect(sourceAsset.license).toBe(fixture.source.license);
    expect(sourceAsset.width).toBe(fixture.coordinateSystem.width);
    expect(sourceAsset.height).toBe(fixture.coordinateSystem.height);
    expect(sha256(await readFile(sourcePath(sourceAsset.localPath)))).toBe(
      fixture.source.compositeSha256,
    );

    expect(sourceComponents).toHaveLength(Object.keys(fixture.components).length);
    for (const [componentId, expected] of Object.entries(fixture.components) as Array<
      [FixtureComponentId, (typeof fixture.components)[FixtureComponentId]]
    >) {
      const component = sourceComponents.find((candidate) => candidate.id === componentId);
      expect(component, componentId).toBeDefined();
      if (!component) continue;

      expect(
        {
          offset: { x: component.x, y: component.y },
          size: { width: component.width, height: component.height },
          sha256: component.sha256,
        },
        componentId,
      ).toEqual(expected);

      const bytes = await readFile(componentPath(component));
      expect(sha256(bytes), `${componentId} file hash`).toBe(expected.sha256);
      const metadata = await sharp(bytes).metadata();
      expect(
        { width: metadata.width, height: metadata.height },
        `${componentId} native dimensions`,
      ).toEqual(expected.size);
    }
  });

  it("reproduces the audited official-layer alpha overlaps at threshold 128", async () => {
    const [incus, malleus, stapes, cochlea] = await Promise.all([
      loadAlpha("incus"),
      loadAlpha("malleus"),
      loadAlpha("stapes"),
      loadAlpha("cochlea"),
    ]);

    expect(incus.channels).toBe(4);
    expect(malleus.channels).toBe(4);
    expect(stapes.channels).toBe(4);
    expect(cochlea.channels).toBe(4);
    expect(countAlphaOverlap(incus, malleus, 128)).toBe(
      fixture.officialAlphaOverlapCountsAt128.incus_malleus,
    );
    expect(countAlphaOverlap(stapes, cochlea, 128)).toBe(
      fixture.officialAlphaOverlapCountsAt128.stapes_cochlea,
    );
    expect(countAlphaOverlap(stapes, incus, 128)).toBe(
      fixture.officialAlphaOverlapCountsAt128.stapes_incus,
    );
  });

  it("clips only the audited incus process and stapes superstructure pixels", async () => {
    const ossicles = medicalArtSourceGeometry["servier-inner-ear"]?.ossicles;
    const incusPath = ossicles?.incusLongProcessRetainedClipPath;
    const footplatePath = ossicles?.stapesFootplateRetainedClipPath;
    expect(incusPath).toBeDefined();
    expect(footplatePath).toBeDefined();
    if (!incusPath || !footplatePath) return;

    const stateChecks = [
      {
        fixture: fixture.anatomyStateMasks.incusLongProcessEroded,
        component: await loadAlpha("incus"),
        clip: await rasterizedPathAlpha(incusPath),
      },
      {
        fixture: fixture.anatomyStateMasks.stapesFootplateOnly,
        component: await loadAlpha("stapes"),
        clip: await rasterizedPathAlpha(footplatePath),
      },
    ];

    for (const state of stateChecks) {
      for (const point of state.fixture.retainedReferencePoints) {
        expect(
          alphaAtSourcePoint(state.component, point),
          `${state.fixture.component} source alpha at retained ${point.x},${point.y}`,
        ).toBeGreaterThanOrEqual(128);
        expect(
          alphaAtSourcePoint(state.clip, point),
          `${state.fixture.component} clip retains ${point.x},${point.y}`,
        ).toBeGreaterThanOrEqual(128);
      }
      for (const point of state.fixture.removedReferencePoints) {
        expect(
          alphaAtSourcePoint(state.component, point),
          `${state.fixture.component} source alpha at removed ${point.x},${point.y}`,
        ).toBeGreaterThanOrEqual(128);
        expect(
          alphaAtSourcePoint(state.clip, point),
          `${state.fixture.component} clip removes ${point.x},${point.y}`,
        ).toBe(0);
      }
    }
  });

  it("keeps PORP and TORP contacts inside the independently audited landmark tolerances", () => {
    const porp = deriveServierProsthesisPlacement("porp");
    const torp = deriveServierProsthesisPlacement("torp");

    expect(
      isWithinLandmark(porp.tympanicSurfaceContact, fixture.landmarks.tympanicSurfaceContact),
    ).toBe(true);
    expect(
      isWithinLandmark(torp.tympanicSurfaceContact, fixture.landmarks.tympanicSurfaceContact),
    ).toBe(true);
    expect(isWithinLandmark(porp.distalContact.center, fixture.landmarks.capitulum)).toBe(true);
    expect(isWithinLandmark(torp.distalContact.center, fixture.landmarks.footplate)).toBe(true);
    expect(porp.distalTarget).toBe("stapes_capitulum");
    expect(torp.distalTarget).toBe("stapes_footplate");

    const anchors = medicalArtPixelAnchors["servier-inner-ear"];
    expect(
      isWithinLandmark(
        anchors?.incus_erosion_stump ?? { x: Infinity, y: Infinity },
        fixture.landmarks.incusErosionStump,
      ),
    ).toBe(true);
    expect(
      isWithinLandmark(
        anchors?.incus_piston_attachment ?? { x: Infinity, y: Infinity },
        fixture.landmarks.incusPistonAttachment,
      ),
    ).toBe(true);
  });

  it("derives the tympanic stack from the audited plane and normal offsets", () => {
    const geometry = medicalArtSourceGeometry["servier-inner-ear"]?.tympanicMembrane;
    const placement = deriveServierProsthesisPlacement("porp");
    const normal = fixture.tympanicStack.medialNormal;
    const projectedOffset = (point: MedicalArtSourcePoint) =>
      (point.x - placement.tympanicSurfaceContact.x) * normal.x +
      (point.y - placement.tympanicSurfaceContact.y) * normal.y;

    expect(geometry?.planeAngle).toBe(fixture.tympanicStack.planeAngle);
    expect(geometry?.medialNormal).toEqual(normal);
    expect(projectedOffset(placement.protectionCartilage.center)).toBeGreaterThanOrEqual(
      fixture.tympanicStack.cartilageNormalOffset.min,
    );
    expect(projectedOffset(placement.protectionCartilage.center)).toBeLessThanOrEqual(
      fixture.tympanicStack.cartilageNormalOffset.max,
    );
    expect(projectedOffset(placement.headPlate.center)).toBeGreaterThanOrEqual(
      fixture.tympanicStack.headplateNormalOffset.min,
    );
    expect(projectedOffset(placement.headPlate.center)).toBeLessThanOrEqual(
      fixture.tympanicStack.headplateNormalOffset.max,
    );
  });

  it("joins each prosthesis shaft to the exact headplate and distal ellipse boundaries", () => {
    for (const method of ["porp", "torp"] as const) {
      const placement = deriveServierProsthesisPlacement(method);
      expect(
        ellipseEquation(placement.headPlate, placement.shaft.start),
        `${method} headplate join`,
      ).toBeCloseTo(1, 3);
      expect(
        ellipseEquation(placement.distalContact, placement.shaft.end),
        `${method} distal join`,
      ).toBeCloseTo(1, 3);
    }
  });

  it("keeps the entire headplate inside its protective cartilage layer", () => {
    expect(fixture.tympanicStack.cartilageMustCoverHeadplate).toBe(true);

    for (const method of ["porp", "torp"] as const) {
      const placement = deriveServierProsthesisPlacement(method);
      for (let sample = 0; sample < 720; sample += 1) {
        const point = ellipseBoundaryPoint(placement.headPlate, (sample / 720) * Math.PI * 2);
        expect(
          ellipseEquation(placement.protectionCartilage, point),
          `${method} headplate boundary sample ${sample}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses neutral generic contacts without inventing a manufacturer-specific cup or shoe", () => {
    const porp = deriveServierProsthesisPlacement("porp");
    const torp = deriveServierProsthesisPlacement("torp");

    expect(porp.rendering).toBe("neutral-headplate-shaft-capitulum-seat");
    expect(torp.rendering).toBe("neutral-headplate-shaft-footplate-contact");
    expect(JSON.stringify([porp, torp])).not.toMatch(/\b(?:cup|shoe)\b/i);
  });

  it("keeps central, posterior, and subtotal tympanic regions geometrically distinct", () => {
    const central = deriveServierTympanicPolygon("central");
    const posterior = deriveServierTympanicPolygon("posterior");
    const subtotal = deriveServierTympanicPolygon("subtotal");

    expect(central).not.toBeNull();
    expect(posterior).not.toBeNull();
    expect(subtotal).not.toBeNull();
    if (!central || !posterior || !subtotal) return;

    const centralCentroid = sourcePolygonCentroid(central);
    const posteriorCentroid = sourcePolygonCentroid(posterior);
    expect(central).not.toEqual(posterior);
    const transverseSeparationFloor =
      (medicalArtSourceGeometry["servier-inner-ear"]?.tympanicMembrane?.repairGraftBounds.width ??
        0) * 0.02;
    expect(centralCentroid.x).toBeGreaterThan(posteriorCentroid.x);
    expect(distance(centralCentroid, posteriorCentroid)).toBeGreaterThan(transverseSeparationFloor);
    expect(sourcePolygonArea(subtotal)).toBeGreaterThan(sourcePolygonArea(central) * 4);
  });

  it("keeps every rendered inner-ear perforation and graft inside the source tympanic surface", async () => {
    const asset = medicalArtAssets["servier-inner-ear"];
    const tympanicMembrane = medicalArtSourceGeometry[asset.id]?.tympanicMembrane;
    expect(tympanicMembrane?.normalizedSurface).toBeDefined();
    expect(tympanicMembrane?.repairGraftPath).toBeDefined();
    if (!tympanicMembrane?.repairGraftPath) return;

    const support = await rasterizedPathAlpha(
      tympanicMembrane.repairGraftPath,
      asset.width,
      asset.height,
    );
    for (const region of ["anterior", "posterior", "central", "subtotal"] as const) {
      const perforation = deriveMedicalArtTympanicPolygon(asset.id, region);
      const template = templatePerforationGeometry(region);
      const graft = deriveMedicalArtTympanicPolygon(
        asset.id,
        region,
        coveringGraftGeometry(template),
      );
      expect(perforation, `${region}:perforation`).not.toBeNull();
      expect(graft, `${region}:graft`).not.toBeNull();
      if (!perforation || !graft) continue;

      for (const [shapeName, points] of [
        ["perforation", perforation],
        ["graft", graft],
      ] as const) {
        const rendered = await rasterizedPathAlpha(
          smoothClosedSourcePath(points),
          asset.width,
          asset.height,
        );
        for (let y = 0; y < asset.height; y += 1) {
          for (let x = 0; x < asset.width; x += 1) {
            const index = (y * asset.width + x) * rendered.channels + 3;
            if (rendered.data[index] < 128) continue;
            expect(
              support.data[index],
              `${region}:${shapeName}:source pixel ${x},${y}`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("maps every cutaway perforation and covering graft inside the audited tympanic surface", async () => {
    const asset = medicalArtAssets["servier-ear-cutaway"];
    const tympanicMembrane = medicalArtSourceGeometry["servier-ear-cutaway"]?.tympanicMembrane;
    expect(asset.id).toBe(cutawayFixture.source.assetId);
    expect(asset.sourcePage).toBe(cutawayFixture.source.sourcePage);
    expect(asset.license).toBe(cutawayFixture.source.license);
    expect(asset.width).toBe(cutawayFixture.coordinateSystem.width);
    expect(asset.height).toBe(cutawayFixture.coordinateSystem.height);
    expect(sha256(await readFile(sourcePath(asset.localPath)))).toBe(cutawayFixture.source.sha256);
    expect(tympanicMembrane?.normalizedSurface).toBeDefined();
    expect(tympanicMembrane?.repairGraftPath).toBeDefined();
    if (!tympanicMembrane?.repairGraftPath) return;

    const support = await rasterizedPathAlpha(
      tympanicMembrane.repairGraftPath,
      asset.width,
      asset.height,
    );
    expect(alphaBounds(support, cutawayFixture.tympanicSupport.alphaThreshold)).toEqual({
      ...cutawayFixture.tympanicSupport.bounds,
      occupiedPixels: cutawayFixture.tympanicSupport.occupiedPixels,
    });

    for (const [region, expected] of Object.entries(cutawayFixture.regions)) {
      const template = templatePerforationGeometry(region);
      expect(template, `${region} template`).toBeDefined();
      if (!template) continue;
      const graftTemplate = coveringGraftGeometry(template);
      const perforation = deriveMedicalArtTympanicPolygon("servier-ear-cutaway", region, template);
      const graft = deriveMedicalArtTympanicPolygon("servier-ear-cutaway", region, graftTemplate);
      expect(perforation).not.toBeNull();
      expect(graft).not.toBeNull();
      if (!perforation || !graft) continue;

      expect(
        distance(sourcePolygonCentroid(perforation), expected.centroid),
        `${region} centroid`,
      ).toBeLessThanOrEqual(cutawayFixture.tolerances.centroidPixels);
      expect(sourcePolygonArea(perforation), `${region} perforation area`).toBeCloseTo(
        expected.area,
        0,
      );
      expect(sourcePolygonArea(graft), `${region} graft area`).toBeCloseTo(expected.graftArea, 0);
      expect(
        sourcePolygonArea(graft) / sourcePolygonArea(perforation),
        `${region} graft coverage ratio`,
      ).toBeGreaterThanOrEqual(cutawayFixture.tolerances.minimumGraftAreaRatio);

      for (const [shapeName, polygon] of [
        ["perforation", perforation],
        ["graft", graft],
      ] as const) {
        for (let index = 0; index < polygon.length; index += 1) {
          const start = polygon[index];
          const end = polygon[(index + 1) % polygon.length];
          for (let sample = 0; sample <= 20; sample += 1) {
            const t = sample / 20;
            const point = {
              x: start.x + (end.x - start.x) * t,
              y: start.y + (end.y - start.y) * t,
            };
            expect(
              alphaAtSourcePoint(support, point),
              `${region} ${shapeName} boundary ${index}:${sample}`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }

    const anterior = deriveMedicalArtTympanicPolygon("servier-ear-cutaway", "anterior");
    const posterior = deriveMedicalArtTympanicPolygon("servier-ear-cutaway", "posterior");
    expect(anterior).not.toBeNull();
    expect(posterior).not.toBeNull();
    if (!anterior || !posterior) return;
    expect(sourcePolygonCentroid(posterior).y).toBeGreaterThan(sourcePolygonCentroid(anterior).y);
  });

  it("maps all four tube quadrants to distinct points on each calibrated tympanic surface", async () => {
    const quadrants = ["anteroinferior", "inferior", "posteroinferior", "posterosuperior"] as const;

    for (const assetId of ["servier-ear-cutaway", "servier-inner-ear"] as const) {
      const geometry = medicalArtSourceGeometry[assetId]?.tympanicMembrane;
      expect(geometry, assetId).toBeDefined();
      if (!geometry) continue;
      const asset = medicalArtAssets[assetId];
      const support = await rasterizedPathAlpha(
        geometry.repairGraftPath,
        asset.width,
        asset.height,
      );
      const points = quadrants.map((quadrant) => {
        const point = deriveMedicalArtTympanostomyPoint(assetId, quadrant);
        expect(point, `${assetId}:${quadrant}`).not.toBeNull();
        if (!point) return { x: Infinity, y: Infinity };
        expect(
          alphaAtSourcePoint(support, point),
          `${assetId}:${quadrant}:surface alpha`,
        ).toBeGreaterThan(0);
        return point;
      });

      expect(new Set(points.map((point) => `${point.x},${point.y}`)).size, assetId).toBe(
        quadrants.length,
      );
      expect(points[0].x, `${assetId}:anterior/posterior axis`).toBeGreaterThan(points[2].x);
      expect(points[3].y, `${assetId}:superior/inferior axis`).toBeLessThan(points[2].y);
    }
  });

  it("rejects a deliberate two-source-pixel distal-center regression", () => {
    const porp = deriveServierProsthesisPlacement("porp");
    expect(isWithinLandmark(porp.distalContact.center, fixture.landmarks.capitulum)).toBe(true);
    expect(
      isWithinLandmark(
        {
          x: porp.distalContact.center.x + 2,
          y: porp.distalContact.center.y,
        },
        fixture.landmarks.capitulum,
      ),
    ).toBe(false);
  });
});
