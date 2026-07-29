export const lateralityValues = ["left", "right", "bilateral", "not_documented"] as const;
export const procedureFamilyValues = [
  "tympanoplasty",
  "tympanoplasty_with_ossiculoplasty",
  "ossiculoplasty",
  "not_documented",
  "unsupported",
] as const;
export const tympanicMembraneStateValues = [
  "intact",
  "perforation_anterior",
  "perforation_posterior",
  "perforation_central",
  "perforation_subtotal",
  "retraction",
  "not_documented",
] as const;
export const malleusStateValues = ["intact", "eroded", "absent", "fixed", "not_documented"] as const;
export const incusStateValues = [
  "intact",
  "long_process_eroded",
  "body_eroded",
  "absent",
  "fixed",
  "not_documented",
] as const;
export const incudostapedialJointStateValues = [
  "intact",
  "eroded",
  "discontinuous",
  "reconstructed",
  "not_documented",
] as const;
export const stapesStateValues = [
  "superstructure_intact",
  "superstructure_absent",
  "fixed",
  "mobile",
  "not_documented",
] as const;
export const reconstructionTypeValues = [
  "none",
  "bone_cement_bridge",
  "porp",
  "torp",
  "cartilage_interposition",
  "not_documented",
  "unsupported",
] as const;
export const reconstructionMaterialValues = [
  "otomimix",
  "hydroxyapatite_bone_cement",
  "titanium",
  "cartilage",
  "not_documented",
  "not_applicable",
] as const;
export const graftTypeValues = [
  "none",
  "temporalis_fascia",
  "cartilage",
  "perichondrium",
  "not_documented",
] as const;
export const confidenceValues = ["high", "medium", "low"] as const;
export const extractionMethodValues = ["mock", "rules", "ollama", "cloudflare", "manual"] as const;

export const anatomyFieldLabels = {
  tympanicMembrane: "Tympanic membrane",
  malleus: "Malleus",
  incus: "Incus",
  incudostapedialJoint: "Incus-stapes joint",
  stapes: "Stapes",
} as const;

export const fieldValueLabels: Record<string, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  not_documented: "Not documented",
  unsupported: "Unsupported",
  tympanoplasty: "Tympanoplasty",
  tympanoplasty_with_ossiculoplasty: "Tympanoplasty with ossiculoplasty",
  ossiculoplasty: "Ossiculoplasty",
  intact: "Intact",
  perforation_anterior: "Anterior perforation",
  perforation_posterior: "Posterior perforation",
  perforation_central: "Central perforation",
  perforation_subtotal: "Subtotal perforation",
  retraction: "Retraction",
  eroded: "Eroded",
  absent: "Absent",
  fixed: "Fixed",
  long_process_eroded: "Long process eroded",
  body_eroded: "Body eroded",
  discontinuous: "Discontinuous",
  reconstructed: "Reconstructed",
  superstructure_intact: "Superstructure intact",
  superstructure_absent: "Superstructure absent",
  mobile: "Mobile",
  none: "None",
  bone_cement_bridge: "Bone cement bridge",
  porp: "PORP",
  torp: "TORP",
  cartilage_interposition: "Cartilage interposition",
  otomimix: "OtoMimix",
  hydroxyapatite_bone_cement: "Hydroxyapatite bone cement",
  titanium: "Titanium",
  cartilage: "Cartilage",
  not_applicable: "Not applicable",
  temporalis_fascia: "Temporalis fascia",
  perichondrium: "Perichondrium",
};

export function labelValue(value: string) {
  return fieldValueLabels[value] ?? value;
}
