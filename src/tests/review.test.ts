import { describe, expect, it } from "vitest";
import { updateCaseField, markReviewed } from "@/domain/editCase";
import { getApprovalBlockers, getExportBlockers } from "@/domain/review";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("review and export gating", () => {
  it("allows clinician review when no exact atlas template matches", () => {
    const mismatchedCase = updateCaseField(
      getSyntheticCase("porp-reconstruction").expected,
      "repair.reconstructionType",
      "bone_cement_bridge",
    );

    expect(getApprovalBlockers(mismatchedCase)).toEqual([]);
  });

  it("keeps patient export blocked without a clinician-approved visual template", () => {
    const mismatchedCase = markReviewed(
      updateCaseField(
        getSyntheticCase("porp-reconstruction").expected,
        "repair.reconstructionType",
        "bone_cement_bridge",
      ),
    );
    const blockers = getExportBlockers(mismatchedCase).join(" ");

    expect(blockers).toMatch(/clinician-approved visual template/i);
    expect(blockers).toMatch(/no exact atlas overlay template matches/i);
    expect(blockers).not.toMatch(/before patient-facing review/i);
  });

  it("allows review of an unsigned internal composition but still blocks its export", () => {
    const operativeCase = getSyntheticCase("hero-otomimix-is-joint").expected;

    expect(getApprovalBlockers(operativeCase)).toEqual([]);

    const exportBlockers = getExportBlockers(markReviewed(operativeCase)).join(" ");
    expect(exportBlockers).toMatch(/clinician-approved visual template/i);
    expect(exportBlockers).toMatch(/unsigned/i);
  });

  it("preserves non-template review blockers", () => {
    const operativeCase = structuredClone(
      getSyntheticCase("hero-otomimix-is-joint").expected,
    );
    operativeCase.safety.suitableForRendering = false;
    operativeCase.safety.blockRenderingReason = "Safety review required.";
    operativeCase.procedure.laterality.value = "not_documented";
    operativeCase.ambiguities.push({
      message: "Critical finding conflict.",
      severity: "critical",
    });
    operativeCase.unsupportedClaims.push({
      claim: "Unsupported surgical claim.",
      reason: "No reviewed representation.",
    });
    operativeCase.anatomy.incus.evidence = [];

    const blockers = getApprovalBlockers(operativeCase, { resultIsStale: true }).join(" ");

    expect(blockers).toMatch(/regenerate before review/i);
    expect(blockers).toMatch(/safety review required/i);
    expect(blockers).toMatch(/laterality must be reviewed/i);
    expect(blockers).toMatch(/critical finding conflict/i);
    expect(blockers).toMatch(/unsupported claim must be resolved/i);
    expect(blockers).toMatch(/incus.*no supporting source evidence/i);
  });

  it("preserves stale-result and review-status export blockers", () => {
    const operativeCase = getSyntheticCase("hero-otomimix-is-joint").expected;
    const blockers = getExportBlockers(operativeCase, { resultIsStale: true }).join(" ");

    expect(blockers).toMatch(/regenerate before export/i);
    expect(blockers).toMatch(/mark the diagram reviewed/i);
    expect(blockers).toMatch(/clinician-approved visual template/i);
  });
});
