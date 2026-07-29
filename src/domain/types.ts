export type {
  Evidence,
  OperativeCase,
  WithEvidenceValue,
} from "./schema";

export type CaseFieldPath =
  | "procedure.laterality"
  | "procedure.family"
  | "anatomy.tympanicMembrane"
  | "anatomy.malleus"
  | "anatomy.incus"
  | "anatomy.incudostapedialJoint"
  | "anatomy.stapes"
  | "repair.reconstructionType"
  | "repair.reconstructionMaterial"
  | "repair.graftType";

export interface DiagramFeature {
  id: string;
  label: string;
  fieldPath: CaseFieldPath;
  panel: "found" | "repaired";
  support: "supported" | "ambiguous" | "unsupported";
  evidenceQuotes: string[];
}
