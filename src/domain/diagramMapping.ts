import { generateDiagramAltText } from "./patientText";
import type { DiagramFeature } from "./types";
import type { OperativeCase, WithEvidenceValue } from "./schema";
import { labelValue } from "./ontology";

export interface DiagramState {
  laterality: "left" | "right" | "bilateral" | "not_documented";
  panel: "found" | "repaired";
  title: string;
  altText: string;
  tympanicMembraneState: OperativeCase["anatomy"]["tympanicMembrane"]["value"];
  malleusState: OperativeCase["anatomy"]["malleus"]["value"];
  incusState: OperativeCase["anatomy"]["incus"]["value"];
  incudostapedialJointState: OperativeCase["anatomy"]["incudostapedialJoint"]["value"];
  stapesState: OperativeCase["anatomy"]["stapes"]["value"];
  reconstructionType: OperativeCase["repair"]["reconstructionType"]["value"];
  reconstructionMaterial: OperativeCase["repair"]["reconstructionMaterial"]["value"];
  graftType: OperativeCase["repair"]["graftType"]["value"];
  warnings: string[];
}

function evidenceQuotes(field: WithEvidenceValue<string>) {
  return field.evidence.map((item) => item.sourceText);
}

function supportFor(field: WithEvidenceValue<string>, caseHasAmbiguity: boolean): DiagramFeature["support"] {
  if (field.evidence.length === 0) return "unsupported";
  if (caseHasAmbiguity || field.warning) return "ambiguous";
  return "supported";
}

export function buildDiagramState(
  operativeCase: OperativeCase,
  panel: DiagramState["panel"],
): DiagramState {
  return {
    laterality: operativeCase.procedure.laterality.value,
    panel,
    title: panel === "found" ? "What was documented" : "Documented repair",
    altText: generateDiagramAltText(operativeCase),
    tympanicMembraneState: operativeCase.anatomy.tympanicMembrane.value,
    malleusState: operativeCase.anatomy.malleus.value,
    incusState: operativeCase.anatomy.incus.value,
    incudostapedialJointState: operativeCase.anatomy.incudostapedialJoint.value,
    stapesState: operativeCase.anatomy.stapes.value,
    reconstructionType: operativeCase.repair.reconstructionType.value,
    reconstructionMaterial: operativeCase.repair.reconstructionMaterial.value,
    graftType: operativeCase.repair.graftType.value,
    warnings: [
      ...operativeCase.ambiguities.map((item) => item.message),
      ...operativeCase.unsupportedClaims.map((item) => item.claim),
      ...(operativeCase.safety.blockRenderingReason ? [operativeCase.safety.blockRenderingReason] : []),
    ],
  };
}

export function buildFeatureMap(operativeCase: OperativeCase): DiagramFeature[] {
  const hasAmbiguity = operativeCase.ambiguities.length > 0 || operativeCase.unsupportedClaims.length > 0;
  const features: DiagramFeature[] = [];

  const addFeature = (
    id: string,
    label: string,
    fieldPath: DiagramFeature["fieldPath"],
    panel: DiagramFeature["panel"],
    field: WithEvidenceValue<string>,
  ) => {
    features.push({
      id,
      label,
      fieldPath,
      panel,
      support: supportFor(field, hasAmbiguity),
      evidenceQuotes: evidenceQuotes(field),
    });
  };

  addFeature(
    "feature-laterality",
    `Laterality: ${labelValue(operativeCase.procedure.laterality.value)}`,
    "procedure.laterality",
    "found",
    operativeCase.procedure.laterality,
  );

  if (
    operativeCase.procedure.family.value !== "not_documented" &&
    operativeCase.procedure.family.value !== "unsupported"
  ) {
    addFeature(
      "feature-procedure",
      `Procedure: ${labelValue(operativeCase.procedure.family.value)}`,
      "procedure.family",
      "found",
      operativeCase.procedure.family,
    );
  }

  const tm = operativeCase.anatomy.tympanicMembrane;
  if (tm.value !== "not_documented") {
    addFeature(
      "feature-tm",
      `Tympanic membrane: ${labelValue(tm.value)}`,
      "anatomy.tympanicMembrane",
      "found",
      tm,
    );
  }

  const malleus = operativeCase.anatomy.malleus;
  if (malleus.value !== "not_documented") {
    addFeature(
      "feature-malleus",
      `Malleus: ${labelValue(malleus.value)}`,
      "anatomy.malleus",
      "found",
      malleus,
    );
  }

  const incus = operativeCase.anatomy.incus;
  if (incus.value !== "not_documented") {
    addFeature("feature-incus", `Incus: ${labelValue(incus.value)}`, "anatomy.incus", "found", incus);
  }

  const joint = operativeCase.anatomy.incudostapedialJoint;
  if (joint.value !== "not_documented") {
    addFeature(
      "feature-is-joint",
      `Incus-stapes joint: ${labelValue(joint.value)}`,
      "anatomy.incudostapedialJoint",
      "found",
      joint,
    );
  }

  const stapes = operativeCase.anatomy.stapes;
  if (stapes.value !== "not_documented") {
    addFeature(
      "feature-stapes",
      `Stapes: ${labelValue(stapes.value)}`,
      "anatomy.stapes",
      "found",
      stapes,
    );
  }

  const reconstruction = operativeCase.repair.reconstructionType;
  if (reconstruction.value !== "not_documented" && reconstruction.value !== "none") {
    addFeature(
      "feature-reconstruction",
      `Reconstruction: ${labelValue(reconstruction.value)}`,
      "repair.reconstructionType",
      "repaired",
      reconstruction,
    );
  }

  const graft = operativeCase.repair.graftType;
  if (graft.value !== "not_documented" && graft.value !== "none") {
    addFeature("feature-graft", `Graft: ${labelValue(graft.value)}`, "repair.graftType", "repaired", graft);
  }

  return features;
}
