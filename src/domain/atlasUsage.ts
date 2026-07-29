import type { EducationMode } from "./educationMode";

export const atlasUsageRightsValues = [
  "unverified",
  "teaching_only",
  "clinic_permission",
] as const;

export type AtlasUsageRights = (typeof atlasUsageRightsValues)[number];

export function parseAtlasUsageRights(value?: string | null): AtlasUsageRights {
  return atlasUsageRightsValues.includes(value as AtlasUsageRights)
    ? (value as AtlasUsageRights)
    : "unverified";
}

export function getAtlasUsageRights() {
  return parseAtlasUsageRights(process.env.NEXT_PUBLIC_STANFORD_ATLAS_USAGE_RIGHTS);
}

export function canDisplayStanfordAtlas(
  rights: AtlasUsageRights,
  mode: EducationMode,
) {
  if (rights === "clinic_permission") return true;
  return rights === "teaching_only" && mode === "postoperative_summary";
}

export function canPrintStanfordAtlas(rights: AtlasUsageRights) {
  return rights === "clinic_permission";
}

export function canDownloadStanfordAtlasSvg(
  rights: AtlasUsageRights,
  imageSource = process.env.NEXT_PUBLIC_ATLAS_IMAGE_SOURCE,
) {
  void rights;
  void imageSource;
  return false;
}

export const stanfordAtlasAttribution =
  "Illustration © Ronald L. Jackler, MD and Christine Gralapp, MA, CMI. Source: Stanford Otologic Surgery Atlas. Used with permission. Stanford does not endorse this application.";
