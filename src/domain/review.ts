import { buildFeatureMap } from "./diagramMapping";
import { getAtlasTemplateBlocker } from "./atlasTemplates";
import type { OperativeCase } from "./schema";

export interface ReviewBlockerOptions {
  resultIsStale?: boolean;
}

export function getApprovalBlockers(
  operativeCase: OperativeCase,
  options: ReviewBlockerOptions = {},
) {
  const blockers: string[] = [];
  const features = buildFeatureMap(operativeCase);

  if (options.resultIsStale) {
    blockers.push("The note changed after extraction. Regenerate before review.");
  }

  if (!operativeCase.safety.suitableForRendering) {
    blockers.push(operativeCase.safety.blockRenderingReason ?? "Case is not suitable for rendering.");
  }

  if (operativeCase.procedure.laterality.value === "not_documented") {
    blockers.push("Laterality must be reviewed before marking the diagram reviewed.");
  }

  for (const ambiguity of operativeCase.ambiguities) {
    if (ambiguity.severity === "critical") {
      blockers.push(ambiguity.message);
    }
  }

  for (const unsupportedClaim of operativeCase.unsupportedClaims) {
    blockers.push(`Unsupported claim must be resolved before review: ${unsupportedClaim.claim}`);
  }

  for (const feature of features) {
    if (feature.support === "unsupported") {
      blockers.push(`${feature.label} has no supporting source evidence.`);
    }
  }

  return Array.from(new Set(blockers));
}

export function getExportBlockers(
  operativeCase: OperativeCase,
  options: ReviewBlockerOptions = {},
) {
  const blockers: string[] = [];

  if (options.resultIsStale) {
    blockers.push("The note changed after extraction. Regenerate before export.");
  }

  if (!operativeCase.safety.suitableForRendering) {
    blockers.push(operativeCase.safety.blockRenderingReason ?? "Case is not suitable for export.");
  }

  const templateBlocker = getAtlasTemplateBlocker(operativeCase);
  if (templateBlocker) {
    blockers.push(
      `Clinician-approved visual template required before patient education export: ${templateBlocker.replace(
        "before patient-facing review or export",
        "before patient education export",
      )}`,
    );
  }

  const approvalBlockers = getApprovalBlockers(operativeCase, {
    ...options,
    resultIsStale: false,
  });
  const safetyBlocker = operativeCase.safety.blockRenderingReason ?? "Case is not suitable for rendering.";

  for (const approvalBlocker of approvalBlockers) {
    if (approvalBlocker === safetyBlocker) continue;
    blockers.push(approvalBlocker);
  }

  if (operativeCase.review.status === "draft_unreviewed") {
    blockers.push("Mark the diagram reviewed before patient education export.");
  }

  return Array.from(new Set(blockers));
}
