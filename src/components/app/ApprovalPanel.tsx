"use client";

import { Check, RotateCcw } from "lucide-react";
import type { EducationMode } from "@/domain/educationMode";
import type { OperativeCase } from "@/domain/schema";
import type { SurgeryPlan } from "@/domain/surgeryPlan";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";

interface ApprovalPanelProps {
  operativeCase?: OperativeCase | null;
  planReview?: SurgeryPlan["review"];
  mode?: EducationMode;
  reviewerName: string;
  approvalBlockers: string[];
  reviewChecklist: Array<{
    id: string;
    label: string;
    checked: boolean;
  }>;
  onReviewerNameChange: (value: string) => void;
  onReviewChecklistChange: (id: string, checked: boolean) => void;
  onMarkReviewed: () => void;
  onClearReview: () => void;
}

export function ApprovalPanel({
  operativeCase,
  planReview,
  mode = "postoperative_summary",
  reviewerName,
  approvalBlockers,
  reviewChecklist,
  onReviewerNameChange,
  onReviewChecklistChange,
  onMarkReviewed,
  onClearReview,
}: ApprovalPanelProps) {
  const review = planReview ?? operativeCase?.review;
  const reviewed =
    mode === "preoperative_education"
      ? review?.status === "approved_by_clinician"
      : review?.status !== "draft_unreviewed";
  const canApprove = approvalBlockers.length === 0;
  return (
    <section className="surface p-5">
      <h2 className="section-heading">Review state</h2>
      <div className="mt-4 space-y-3">
        <p className="status-pill">
          {reviewed
            ? mode === "preoperative_education"
              ? "Approved for patient discussion"
              : "Reviewed for demo"
            : "Draft - not reviewed"}
        </p>
        {review?.reviewedAtIso ? (
          <p className="text-sm text-slate-600">
            Reviewed at {new Date(review.reviewedAtIso).toLocaleString()}
          </p>
        ) : null}
        {approvalBlockers.length > 0 ? (
          <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Review is blocked until these items are resolved:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {approvalBlockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <fieldset className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-950">Clinician review checklist</legend>
          <div className="mt-2 space-y-2">
            {reviewChecklist.map((item) => (
              <label
                key={item.id}
                className="flex min-h-8 items-start gap-2 text-sm leading-5 text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={reviewed}
                  onChange={(event) => onReviewChecklistChange(item.id, event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            All checklist items must be checked before this draft can be approved.
          </p>
        </fieldset>
        <div className="space-y-2">
          <FieldLabel htmlFor="reviewer-name">Reviewer name</FieldLabel>
          <Input
            id="reviewer-name"
            value={reviewerName}
            disabled={reviewed}
            onChange={(event) => onReviewerNameChange(event.target.value)}
            placeholder={mode === "preoperative_education" ? "Required for clinic handout" : "Optional"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onMarkReviewed} disabled={!canApprove}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {mode === "preoperative_education" ? "Approve for patient discussion" : "Mark reviewed for demo"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClearReview}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear review
          </Button>
        </div>
      </div>
    </section>
  );
}
