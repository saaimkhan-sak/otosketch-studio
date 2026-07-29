import { ExtractionValidationError } from "@/lib/errors";
import { OperativeCaseSchema, type OperativeCase, type WithEvidenceValue } from "./schema";

const nonPositiveValues = new Set([
  "not_documented",
  "unsupported",
]);

function requiresEvidence(field: WithEvidenceValue<string>) {
  return !nonPositiveValues.has(field.value);
}

function validateEvidence(fieldName: string, field: WithEvidenceValue<string>, warnings: string[]) {
  if (requiresEvidence(field) && field.evidence.length === 0) {
    warnings.push(`${fieldName} asserts a documented value but has no source evidence.`);
  }
}

export interface NormalizedCaseResult {
  case: OperativeCase;
  warnings: string[];
}

export function normalizeOperativeCase(raw: unknown): NormalizedCaseResult {
  const parsed = OperativeCaseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ExtractionValidationError(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const operativeCase = parsed.data;
  const warnings: string[] = [];
  const validationWarnings: string[] = [];

  if (
    ["otomimix", "hydroxyapatite_bone_cement"].includes(operativeCase.repair.reconstructionMaterial.value) &&
    ["porp", "torp", "cartilage_interposition"].includes(operativeCase.repair.reconstructionType.value)
  ) {
    operativeCase.ambiguities.push({
      message:
        "Reconstruction material evidence documents bone cement, so a conflicting prosthesis reconstruction type was normalized to bone cement bridge.",
      sourceText: operativeCase.repair.reconstructionMaterial.evidence[0]?.sourceText,
      severity: "warning",
    });
    operativeCase.repair.reconstructionType = {
      value: "bone_cement_bridge",
      evidence: operativeCase.repair.reconstructionMaterial.evidence,
      editedByClinician: false,
      warning: "Normalized from conflicting model output.",
    };
    warnings.push("Conflicting reconstruction type/material was normalized to bone cement bridge.");
  }

  validateEvidence("procedure.family", operativeCase.procedure.family, validationWarnings);
  validateEvidence("procedure.laterality", operativeCase.procedure.laterality, validationWarnings);
  validateEvidence("anatomy.tympanicMembrane", operativeCase.anatomy.tympanicMembrane, validationWarnings);
  validateEvidence("anatomy.malleus", operativeCase.anatomy.malleus, validationWarnings);
  validateEvidence("anatomy.incus", operativeCase.anatomy.incus, validationWarnings);
  validateEvidence("anatomy.incudostapedialJoint", operativeCase.anatomy.incudostapedialJoint, validationWarnings);
  validateEvidence("anatomy.stapes", operativeCase.anatomy.stapes, validationWarnings);
  validateEvidence("repair.reconstructionType", operativeCase.repair.reconstructionType, validationWarnings);
  validateEvidence("repair.reconstructionMaterial", operativeCase.repair.reconstructionMaterial, validationWarnings);
  validateEvidence("repair.graftType", operativeCase.repair.graftType, validationWarnings);

  if (validationWarnings.length > 0) {
    throw new ExtractionValidationError(validationWarnings.join("; "));
  }

  if (operativeCase.safety.containsPossiblePhi) {
    return {
      case: {
        ...operativeCase,
        safety: {
          ...operativeCase.safety,
          suitableForRendering: false,
          blockRenderingReason:
            operativeCase.safety.blockRenderingReason ?? "Possible patient information detected.",
        },
      },
      warnings: [...warnings, ...operativeCase.safety.phiWarnings],
    };
  }

  if (operativeCase.procedure.family.value === "unsupported") {
    return {
      case: {
        ...operativeCase,
        safety: {
          ...operativeCase.safety,
          suitableForRendering: false,
          blockRenderingReason: "Procedure is outside tympanoplasty/ossiculoplasty MVP scope.",
        },
      },
      warnings,
    };
  }

  return { case: operativeCase, warnings };
}
