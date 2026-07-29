import type { SurgeryLayer, SurgeryPlan } from "./surgeryPlan";

export type MedicalArtAssetId =
  | "nih-inner-ear"
  | "servier-ear-cutaway"
  | "servier-inner-ear";

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
  | "tm_anteroinferior"
  | "malleus"
  | "incus_body"
  | "incus_long_process"
  | "incudostapedial_joint"
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
    tympanic_membrane: { x: 8.8, y: 72.2 },
    tympanic_membrane_medial: { x: 20.4, y: 58.3 },
    tm_anteroinferior: { x: 10.8, y: 77.4 },
    malleus: { x: 18.7, y: 45.5 },
    incus_body: { x: 30.2, y: 52.1 },
    incus_long_process: { x: 34.8, y: 56.2 },
    incudostapedial_joint: { x: 37.8, y: 55.4 },
    stapes_superstructure: { x: 40.6, y: 51.2 },
    stapes_footplate: { x: 44.2, y: 50.4 },
    middle_ear: { x: 33.0, y: 53.5 },
    round_window: { x: 49.0, y: 57.0 },
    cochlea: { x: 60.4, y: 60.6 },
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
        if (layer.state === "long_process_eroded") return anchor("incus_long_process");
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
