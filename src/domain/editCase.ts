import type { CaseFieldPath } from "./types";
import type { Evidence, OperativeCase } from "./schema";

function manualEvidence(): Evidence {
  return {
    sourceText: "Manually selected in review interface.",
    confidence: "high",
    extractionMethod: "manual",
  };
}

export function updateCaseField(
  operativeCase: OperativeCase,
  fieldPath: CaseFieldPath,
  value: string,
): OperativeCase {
  const next = structuredClone(operativeCase);
  const edited = {
    value,
    evidence: [manualEvidence()],
    editedByClinician: true,
  };

  switch (fieldPath) {
    case "procedure.laterality":
      next.procedure.laterality = edited as OperativeCase["procedure"]["laterality"];
      break;
    case "procedure.family":
      next.procedure.family = edited as OperativeCase["procedure"]["family"];
      break;
    case "anatomy.tympanicMembrane":
      next.anatomy.tympanicMembrane = edited as OperativeCase["anatomy"]["tympanicMembrane"];
      break;
    case "anatomy.malleus":
      next.anatomy.malleus = edited as OperativeCase["anatomy"]["malleus"];
      break;
    case "anatomy.incus":
      next.anatomy.incus = edited as OperativeCase["anatomy"]["incus"];
      break;
    case "anatomy.incudostapedialJoint":
      next.anatomy.incudostapedialJoint = edited as OperativeCase["anatomy"]["incudostapedialJoint"];
      break;
    case "anatomy.stapes":
      next.anatomy.stapes = edited as OperativeCase["anatomy"]["stapes"];
      break;
    case "repair.reconstructionType":
      next.repair.reconstructionType = edited as OperativeCase["repair"]["reconstructionType"];
      if (value === "none") {
        next.repair.reconstructionMaterial = {
          value: "not_applicable",
          evidence: [manualEvidence()],
          editedByClinician: true,
        };
      }
      break;
    case "repair.reconstructionMaterial":
      next.repair.reconstructionMaterial = edited as OperativeCase["repair"]["reconstructionMaterial"];
      break;
    case "repair.graftType":
      next.repair.graftType = edited as OperativeCase["repair"]["graftType"];
      break;
  }

  next.review = { status: "draft_unreviewed" };
  return next;
}

export function markReviewed(operativeCase: OperativeCase, reviewerName?: string): OperativeCase {
  return {
    ...operativeCase,
    review: {
      status: "reviewed_for_demo",
      reviewerName: reviewerName?.trim() || undefined,
      reviewedAtIso: new Date().toISOString(),
    },
  };
}

export function clearReview(operativeCase: OperativeCase): OperativeCase {
  return {
    ...operativeCase,
    review: {
      status: "draft_unreviewed",
    },
  };
}
