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

const nihFocusedFamilies = new Set(["stapes_surgery", "cochlear_implant"]);

export function selectMedicalArtAsset(plan: SurgeryPlan): MedicalArtAsset {
  if (
    plan.procedureFamilies !== "not_documented" &&
    plan.procedureFamilies.some((family) => nihFocusedFamilies.has(family))
  ) {
    return medicalArtAssets["nih-inner-ear"];
  }
  if (
    plan.procedureFamilies !== "not_documented" &&
    plan.procedureFamilies.includes("ossiculoplasty")
  ) {
    return medicalArtAssets["servier-inner-ear"];
  }
  return medicalArtAssets["servier-ear-cutaway"];
}

type MedicalArtAnchor = { x: number; y: number };

const anchors: Record<MedicalArtAssetId, Record<string, MedicalArtAnchor>> = {
  "nih-inner-ear": {
    tympanic_membrane: { x: 30.5, y: 65.5 },
    malleus: { x: 30.4, y: 39.5 },
    incus: { x: 37.2, y: 43.1 },
    stapes: { x: 45.1, y: 45.2 },
    middle_ear: { x: 38.5, y: 48.1 },
    cochlea: { x: 70.1, y: 49.7 },
    mastoid: { x: 21.4, y: 29.2 },
    postauricular: { x: 14.8, y: 24.6 },
    ear_canal: { x: 15.8, y: 67.4 },
    eustachian_tube: { x: 58.4, y: 82.5 },
  },
  "servier-ear-cutaway": {
    tympanic_membrane: { x: 63.2, y: 52.7 },
    middle_ear: { x: 69.5, y: 48.5 },
    mastoid: { x: 75.2, y: 35.2 },
    cochlea: { x: 81.1, y: 45.3 },
    postauricular: { x: 28.3, y: 23.7 },
    ear_canal: { x: 44.5, y: 50.4 },
    eustachian_tube: { x: 81.7, y: 73.2 },
  },
  "servier-inner-ear": {
    tympanic_membrane: { x: 8.8, y: 72.2 },
    malleus: { x: 15.1, y: 43.1 },
    incus: { x: 31.5, y: 42.4 },
    stapes: { x: 39.4, y: 51.1 },
    middle_ear: { x: 31.5, y: 47.2 },
    cochlea: { x: 60.4, y: 60.6 },
    mastoid: { x: 19.2, y: 37.1 },
    postauricular: { x: 9.2, y: 31.2 },
    ear_canal: { x: 7.8, y: 67.3 },
    eustachian_tube: { x: 18.5, y: 78.2 },
  },
};

export function getMedicalArtAnchor(
  assetId: MedicalArtAssetId,
  layer: SurgeryLayer,
): MedicalArtAnchor | null {
  const assetAnchors = anchors[assetId];
  switch (layer.kind) {
    case "tm_state":
    case "tm_perforation":
    case "tm_graft":
    case "tympanostomy":
      return assetAnchors.tympanic_membrane;
    case "ossicle_state":
      if (layer.structure === "malleus") return assetAnchors.malleus ?? assetAnchors.middle_ear;
      if (layer.structure === "incus" || layer.structure === "incudostapedial_joint") {
        return assetAnchors.incus ?? assetAnchors.middle_ear;
      }
      return assetAnchors.stapes ?? assetAnchors.middle_ear;
    case "ossicular_reconstruction":
    case "stapes_procedure":
      return assetAnchors.stapes ?? assetAnchors.middle_ear;
    case "mastoid_technique":
    case "cholesteatoma_extent":
      return assetAnchors.mastoid;
    case "cochlear_insertion":
      return assetAnchors.cochlea;
    case "bone_conduction_implant":
      return assetAnchors.postauricular;
    case "canalplasty":
      return assetAnchors.ear_canal;
    case "eustachian_tube_dilation":
      return assetAnchors.eustachian_tube;
    case "intraoperative_deviation":
    case "verification_status":
      return null;
  }
}
