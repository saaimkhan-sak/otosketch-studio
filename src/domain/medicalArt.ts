import type { SurgeryLayer, SurgeryPlan } from "./surgeryPlan";

export type MedicalArtAssetId =
  | "nih-inner-ear"
  | "servier-ear-cutaway"
  | "servier-inner-ear";

export type MedicalArtComponentId =
  | "auditory_nerve"
  | "cochlea"
  | "stapes"
  | "incus"
  | "malleus"
  | "tympanic_membrane";

export interface MedicalArtComponent {
  id: MedicalArtComponentId;
  localPath: string;
  sourceImage: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sha256: string;
}

export interface MedicalArtAsset {
  id: MedicalArtAssetId;
  title: string;
  description: string;
  localPath: string;
  sourcePage: string;
  sourceImage: string;
  width: number;
  height: number;
  license: "CC BY 4.0" | "Public Domain";
  licenseUrl: string;
  attribution: string;
  illustrationSoftware: string;
  components?: MedicalArtComponent[];
}

export const medicalArtAssets: Record<MedicalArtAssetId, MedicalArtAsset> = {
  "nih-inner-ear": {
    id: "nih-inner-ear",
    title: "Inner-ear surgical anatomy",
    description:
      "Professional vector cross-section of the vestibular system, cochlea, ossicles, and temporal bone.",
    localPath: "/medical-art/nih/inner-ear.svg",
    sourcePage: "https://bioart.niaid.nih.gov/bioart/256",
    sourceImage: "https://bioart.niaid.nih.gov/api/bioarts/256/files/631212",
    width: 1386,
    height: 1385,
    license: "Public Domain",
    licenseUrl: "https://bioart.niaid.nih.gov/faqs#usage-restrictions-bioart",
    attribution:
      "Ryan Kissinger, NIAID Visual & Medical Arts · Courtesy of NIAID · BIOART-000256",
    illustrationSoftware: "Adobe Illustrator 28.6",
  },
  "servier-ear-cutaway": {
    id: "servier-ear-cutaway",
    title: "Ear and temporal-bone cutaway",
    description:
      "Generic reference anatomy for the ear canal, tympanic membrane, mastoid, and Eustachian tube.",
    localPath: "/medical-art/servier/ear-cutaway.png",
    sourcePage: "https://smart.servier.com/smart_image/smart-ear/",
    sourceImage: "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_vide.png",
    width: 1256,
    height: 1083,
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Servier Medical Art by Servier",
    illustrationSoftware: "Servier Medical Art",
  },
  "servier-inner-ear": {
    id: "servier-inner-ear",
    title: "Middle and inner ear",
    description:
      "Generic reference anatomy for the tympanic membrane, ossicles, cochlea, and vestibular system.",
    localPath: "/medical-art/servier/inner-ear.png",
    sourcePage: "https://smart.servier.com/smart_image/inner-ear/",
    sourceImage: "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne.png",
    width: 584,
    height: 370,
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Servier Medical Art by Servier",
    illustrationSoftware: "Servier Medical Art",
    components: [
      {
        id: "cochlea",
        localPath: "/medical-art/servier/inner-ear-components/cochlea.png",
        sourceImage:
          "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_5.png",
        x: 116,
        y: 0,
        width: 259,
        height: 265,
        sha256: "9c2ca8282901f284677808d559450fe3cd772f2f0ddfb4507d8c3338b4a9d71b",
      },
      {
        id: "auditory_nerve",
        localPath: "/medical-art/servier/inner-ear-components/auditory-nerve.png",
        sourceImage:
          "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_6.png",
        x: 227,
        y: 55,
        width: 356,
        height: 131,
        sha256: "1197eeb2e2d9b739c6424812c1c9fb4efb579e971e36c758aaa9417ca96d9b15",
      },
      {
        id: "tympanic_membrane",
        localPath: "/medical-art/servier/inner-ear-components/eardrum.png",
        sourceImage:
          "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_1.png",
        x: 0,
        y: 170,
        width: 133,
        height: 200,
        sha256: "609ee45cfae7d450263e32112cf4965b900265c23c2b7cdb0fb4afb4908dc64b",
      },
      {
        id: "stapes",
        localPath: "/medical-art/servier/inner-ear-components/stapes.png",
        sourceImage:
          "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_4.png",
        x: 168,
        y: 160,
        width: 93,
        height: 64,
        sha256: "5cf310a74f5ea95607d320083c98061f25de67530b41eee6f8a8695ef993e8bb",
      },
      {
        id: "incus",
        localPath: "/medical-art/servier/inner-ear-components/incus.png",
        sourceImage:
          "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_3.png",
        x: 47,
        y: 74,
        width: 131,
        height: 147,
        sha256: "70fe5b944dd167bb87141fccbe6f94bf2c92a06b8f1c67c172c42d2aa7d985a8",
      },
      {
        id: "malleus",
        localPath: "/medical-art/servier/inner-ear-components/malleus.png",
        sourceImage:
          "https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_2.png",
        x: 28,
        y: 84,
        width: 59,
        height: 147,
        sha256: "36adabac939fc8c024c58e995a9e949342c3626514b0ce02e93e9a6ed252445a",
      },
    ],
  },
};

const nihFocusedFamilies = new Set(["cochlear_implant"]);
const servierOssicularFamilies = new Set(["ossiculoplasty", "stapes_surgery"]);

export function selectMedicalArtAsset(plan: SurgeryPlan): MedicalArtAsset {
  if (
    plan.procedureFamilies !== "not_documented" &&
    plan.procedureFamilies.some((family) => nihFocusedFamilies.has(family))
  ) {
    return medicalArtAssets["nih-inner-ear"];
  }
  const hasDocumentedOssicularLayer = plan.layers.some(
    (layer) =>
      layer.documentation === "documented" &&
      ["ossicle_state", "ossicular_reconstruction", "stapes_procedure"].includes(layer.kind),
  );
  if (
    hasDocumentedOssicularLayer ||
    (plan.procedureFamilies !== "not_documented" &&
      plan.procedureFamilies.some((family) => servierOssicularFamilies.has(family)))
  ) {
    return medicalArtAssets["servier-inner-ear"];
  }
  return medicalArtAssets["servier-ear-cutaway"];
}

export type MedicalArtAnatomyTarget =
  | "tympanic_membrane"
  | "tympanic_membrane_medial"
  | "tm_prosthesis_contact"
  | "tm_anteroinferior"
  | "malleus"
  | "malleus_manubrium"
  | "incus_body"
  | "incus_long_process"
  | "incus_erosion_stump"
  | "incus_piston_attachment"
  | "incudostapedial_joint"
  | "stapes_capitulum"
  | "stapes_superstructure"
  | "stapes_footplate"
  | "middle_ear"
  | "round_window"
  | "cochlea"
  | "mastoid"
  | "epitympanum"
  | "postauricular"
  | "ear_canal"
  | "eustachian_tube";

export type MedicalArtAnchor = { x: number; y: number };
export type MedicalArtSourcePoint = { x: number; y: number };

export interface MedicalArtSourceCubic {
  start: MedicalArtSourcePoint;
  controlOne: MedicalArtSourcePoint;
  controlTwo: MedicalArtSourcePoint;
  end: MedicalArtSourcePoint;
}

export interface MedicalArtSourceGeometry {
  calibrationId: string;
  tympanicMembrane?: {
    repairGraftPath: string;
    repairHighlightPath: string;
    planeAngle: number;
    normalizedFrame?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    normalizedSurface?: {
      leftBoundary: MedicalArtSourceCubic[];
      rightBoundary: MedicalArtSourceCubic[];
    };
    surfaceContact?: MedicalArtSourcePoint;
    medialNormal?: MedicalArtSourcePoint;
  };
  ossicles?: {
    incusLongProcessRetainedClipPath: string;
    stapesFootplateRetainedClipPath: string;
  };
}

/**
 * Pixel coordinates measured on the checked-in, unmodified source artwork.
 * Procedure-device placement uses this table as its single source of truth.
 * Percentage anchors below are derived from these pixels so they remain
 * stable if the SVG canvas changes while the licensed image does not.
 */
export const medicalArtPixelAnchors: Partial<
  Record<MedicalArtAssetId, Partial<Record<MedicalArtAnatomyTarget, MedicalArtSourcePoint>>>
> = {
  "servier-inner-ear": {
    tympanic_membrane: { x: 51, y: 267 },
    tympanic_membrane_medial: { x: 49, y: 255 },
    tm_prosthesis_contact: { x: 53, y: 254 },
    tm_anteroinferior: { x: 72, y: 302 },
    malleus: { x: 53, y: 124 },
    malleus_manubrium: { x: 61, y: 198 },
    incus_body: { x: 78, y: 105 },
    incus_long_process: { x: 149, y: 193 },
    incus_erosion_stump: { x: 116, y: 157 },
    incus_piston_attachment: { x: 167, y: 209 },
    incudostapedial_joint: { x: 177, y: 211 },
    stapes_capitulum: { x: 181, y: 211 },
    stapes_superstructure: { x: 207, y: 191 },
    stapes_footplate: { x: 236, y: 180 },
    middle_ear: { x: 132, y: 195 },
    round_window: { x: 286, y: 211 },
    cochlea: { x: 353, y: 224 },
  },
};

/**
 * Source-pixel paths follow the actual outlines in the licensed illustrations.
 * They are rendered through the fitted-image transform rather than being
 * stretched from a generic anatomy template.
 */
export const medicalArtSourceGeometry: Partial<
  Record<MedicalArtAssetId, MedicalArtSourceGeometry>
> = {
  "servier-ear-cutaway": {
    calibrationId: "servier-ear-cutaway-tm-2026-07",
    tympanicMembrane: {
      repairGraftPath:
        "M 734 505 C 756 517 780 544 796 566 C 813 589 831 635 838 682 C 817 669 792 646 771 618 C 752 591 738 551 734 505 Z",
      repairHighlightPath:
        "M 747 520 C 768 540 786 563 801 588 C 814 611 825 641 831 665",
      planeAngle: 61,
      normalizedSurface: {
        leftBoundary: [
          {
            start: { x: 734, y: 505 },
            controlOne: { x: 738, y: 551 },
            controlTwo: { x: 752, y: 591 },
            end: { x: 771, y: 618 },
          },
          {
            start: { x: 771, y: 618 },
            controlOne: { x: 792, y: 646 },
            controlTwo: { x: 817, y: 669 },
            end: { x: 838, y: 682 },
          },
        ],
        rightBoundary: [
          {
            start: { x: 734, y: 505 },
            controlOne: { x: 756, y: 517 },
            controlTwo: { x: 780, y: 544 },
            end: { x: 796, y: 566 },
          },
          {
            start: { x: 796, y: 566 },
            controlOne: { x: 813, y: 589 },
            controlTwo: { x: 831, y: 635 },
            end: { x: 838, y: 682 },
          },
        ],
      },
    },
  },
  "servier-inner-ear": {
    calibrationId: "servier-inner-ear-layered-2026-07",
    tympanicMembrane: {
      repairGraftPath:
        "M 5 179 C 20 188 39 213 52 240 C 68 270 88 322 106 355 C 93 351 74 334 54 307 C 31 276 12 231 5 179 Z",
      repairHighlightPath:
        "M 15 192 C 31 217 47 246 61 276 C 75 306 90 334 99 347",
      planeAngle: 61,
      normalizedFrame: { x: 0, y: 170, width: 133, height: 200 },
      surfaceContact: { x: 53, y: 254 },
      medialNormal: { x: 0.87462, y: -0.48481 },
    },
    ossicles: {
      incusLongProcessRetainedClipPath:
        "M 47 74 H 178 V 97 L 54 221 H 47 Z",
      stapesFootplateRetainedClipPath:
        "M 212 164 C 227 159 246 165 258 179 C 263 185 261 192 256 195 C 246 197 232 191 221 185 C 217 180 214 172 212 164 Z",
    },
  },
};

function pixelAnchor(
  assetId: MedicalArtAssetId,
  target: MedicalArtAnatomyTarget,
): MedicalArtAnchor | undefined {
  const point = medicalArtPixelAnchors[assetId]?.[target];
  if (!point) return undefined;
  const asset = medicalArtAssets[assetId];
  return {
    x: (point.x / asset.width) * 100,
    y: (point.y / asset.height) * 100,
  };
}

/**
 * Source-specific calibration points measured against the unmodified licensed
 * artwork. Coordinates are percentages of each source image, not percentages
 * of a generic canvas. Keeping the anatomy target names explicit prevents a
 * missing structure from silently falling back to an unrelated location.
 */
export const medicalArtAnchors: Record<
  MedicalArtAssetId,
  Partial<Record<MedicalArtAnatomyTarget, MedicalArtAnchor>>
> = {
  "nih-inner-ear": {
    tympanic_membrane: { x: 30.5, y: 65.5 },
    tympanic_membrane_medial: { x: 34.1, y: 56.2 },
    tm_anteroinferior: { x: 32.6, y: 69.1 },
    malleus: { x: 32.1, y: 45.6 },
    incus_body: { x: 38.4, y: 47.3 },
    incus_long_process: { x: 41.2, y: 50.8 },
    incudostapedial_joint: { x: 44.2, y: 50.1 },
    stapes_superstructure: { x: 46.1, y: 48.5 },
    stapes_footplate: { x: 48.1, y: 49.5 },
    middle_ear: { x: 38.5, y: 48.1 },
    cochlea: { x: 70.1, y: 49.7 },
    round_window: { x: 61.8, y: 57.4 },
    mastoid: { x: 21.4, y: 29.2 },
    postauricular: { x: 14.8, y: 24.6 },
    ear_canal: { x: 15.8, y: 67.4 },
    eustachian_tube: { x: 58.4, y: 82.5 },
  },
  "servier-ear-cutaway": {
    tympanic_membrane: { x: 63.0, y: 54.2 },
    tympanic_membrane_medial: { x: 64.8, y: 52.2 },
    tm_anteroinferior: { x: 64.0, y: 57.5 },
    middle_ear: { x: 69.5, y: 48.5 },
    mastoid: { x: 77.4, y: 35.5 },
    epitympanum: { x: 71.7, y: 39.5 },
    cochlea: { x: 81.1, y: 45.3 },
    postauricular: { x: 28.9, y: 20.4 },
    ear_canal: { x: 44.8, y: 52.0 },
    eustachian_tube: { x: 84.0, y: 74.0 },
  },
  "servier-inner-ear": {
    tympanic_membrane: pixelAnchor("servier-inner-ear", "tympanic_membrane"),
    tympanic_membrane_medial: pixelAnchor("servier-inner-ear", "tympanic_membrane_medial"),
    tm_prosthesis_contact: pixelAnchor("servier-inner-ear", "tm_prosthesis_contact"),
    tm_anteroinferior: pixelAnchor("servier-inner-ear", "tm_anteroinferior"),
    malleus: pixelAnchor("servier-inner-ear", "malleus"),
    malleus_manubrium: pixelAnchor("servier-inner-ear", "malleus_manubrium"),
    incus_body: pixelAnchor("servier-inner-ear", "incus_body"),
    incus_long_process: pixelAnchor("servier-inner-ear", "incus_long_process"),
    incus_erosion_stump: pixelAnchor("servier-inner-ear", "incus_erosion_stump"),
    incus_piston_attachment: pixelAnchor(
      "servier-inner-ear",
      "incus_piston_attachment",
    ),
    incudostapedial_joint: pixelAnchor("servier-inner-ear", "incudostapedial_joint"),
    stapes_capitulum: pixelAnchor("servier-inner-ear", "stapes_capitulum"),
    stapes_superstructure: pixelAnchor("servier-inner-ear", "stapes_superstructure"),
    stapes_footplate: pixelAnchor("servier-inner-ear", "stapes_footplate"),
    middle_ear: pixelAnchor("servier-inner-ear", "middle_ear"),
    round_window: pixelAnchor("servier-inner-ear", "round_window"),
    cochlea: pixelAnchor("servier-inner-ear", "cochlea"),
    mastoid: { x: 19.2, y: 37.1 },
    postauricular: { x: 9.2, y: 31.2 },
    ear_canal: { x: 7.8, y: 67.3 },
    eustachian_tube: { x: 18.5, y: 78.2 },
  },
};

export function getMedicalArtAnchorForTarget(
  assetId: MedicalArtAssetId,
  target: MedicalArtAnatomyTarget,
): MedicalArtAnchor | null {
  return medicalArtAnchors[assetId][target] ?? null;
}

export function getMedicalArtAnchor(
  assetId: MedicalArtAssetId,
  layer: SurgeryLayer,
): MedicalArtAnchor | null {
  const anchor = (target: MedicalArtAnatomyTarget) =>
    getMedicalArtAnchorForTarget(assetId, target);

  switch (layer.kind) {
    case "tm_state":
    case "tm_perforation":
    case "tm_graft":
      return anchor("tympanic_membrane");
    case "tympanostomy":
      return anchor("tm_anteroinferior") ?? anchor("tympanic_membrane");
    case "ossicle_state":
      if (layer.structure === "malleus") return anchor("malleus");
      if (layer.structure === "incus") {
        if (layer.state === "long_process_eroded") return anchor("incus_erosion_stump");
        return anchor("incus_body");
      }
      if (layer.structure === "incudostapedial_joint") {
        return anchor("incudostapedial_joint");
      }
      if (layer.structure === "stapes_footplate") return anchor("stapes_footplate");
      return anchor("stapes_superstructure");
    case "ossicular_reconstruction":
      return anchor("incudostapedial_joint");
    case "stapes_procedure":
      return anchor("stapes_footplate");
    case "mastoid_technique":
      return anchor("mastoid");
    case "cholesteatoma_extent":
      return layer.regions.includes("epitympanum")
        ? anchor("epitympanum")
        : anchor("mastoid");
    case "cochlear_insertion":
      return anchor("round_window");
    case "bone_conduction_implant":
      return anchor("postauricular");
    case "canalplasty":
      return anchor("ear_canal");
    case "eustachian_tube_dilation":
      return anchor("eustachian_tube");
    case "intraoperative_deviation":
    case "verification_status":
      return null;
  }
}
