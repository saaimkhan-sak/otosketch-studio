"use client";

import { Download, Printer } from "lucide-react";
import type { EducationMode } from "@/domain/educationMode";
import { generatePatientExplanation, generatePatientTitle } from "@/domain/patientText";
import { generatePreoperativePatientGuide } from "@/domain/preoperativeEducation";
import type { OperativeCase } from "@/domain/schema";
import {
  deriveSurgeryPlanFromCase,
  normalizeSurgeryPlan,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import { Button } from "@/components/ui/Button";
import { Legend } from "@/components/diagram/Legend";
import { MedicalIllustrationDiagram } from "@/components/diagram/MedicalIllustrationDiagram";
import { serializeDiagramPanelsWithEmbeddedImages } from "@/lib/svgExport";
import { PatientProcedureGuide } from "./PatientProcedureGuide";

interface ExportPanelProps {
  operativeCase?: OperativeCase | null;
  surgeryPlan?: SurgeryPlan;
  mode?: EducationMode;
  exportBlockers?: string[];
}

export function ExportPanel({
  operativeCase,
  surgeryPlan,
  mode = "postoperative_summary",
  exportBlockers = [],
}: ExportPanelProps) {
  if (!operativeCase && !surgeryPlan) return null;

  const sourcePlan =
    surgeryPlan ?? (operativeCase ? deriveSurgeryPlanFromCase(operativeCase) : undefined);
  if (!sourcePlan) return null;
  const normalizedPlan = normalizeSurgeryPlan(sourcePlan);
  const plan = normalizedPlan.plan ?? sourcePlan;
  const generatedAtLabel =
    (mode === "preoperative_education"
      ? plan.review.reviewedAtIso
      : operativeCase?.createdAtIso
    )?.slice(0, 10) ?? "not recorded";
  const reviewerLabel =
    mode === "preoperative_education"
      ? plan.review.reviewerName
      : operativeCase?.review.reviewerName;
  const draft =
    mode === "preoperative_education"
      ? plan.review.status !== "approved_by_clinician"
      : operativeCase?.review.status === "draft_unreviewed";
  const exportBlocked = exportBlockers.length > 0;
  const readyForFamilyPreview = !exportBlocked && normalizedPlan.canRender;
  const postoperativeExplanation =
    mode === "postoperative_summary" && readyForFamilyPreview && operativeCase
      ? generatePatientExplanation(operativeCase)
      : [];
  const preoperativeGuide = generatePreoperativePatientGuide(plan);
  const title = readyForFamilyPreview
    ? mode === "preoperative_education"
      ? preoperativeGuide.title
      : operativeCase
        ? generatePatientTitle(operativeCase)
        : "Ear surgery visual summary"
    : "Patient education preview unavailable";
  const downloadSvg = async () => {
    const panels = Array.from(
      document.querySelectorAll<SVGSVGElement>(
        "#preview-verify .diagram-workbench [data-diagram-source] .diagram-svg",
      ),
    );
    if (panels.length === 0) return;
    const svg = await serializeDiagramPanelsWithEmbeddedImages(panels);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${operativeCase?.caseId ?? "planned-otology-procedure"}.svg`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printDiagrams = (
    <div className="print-diagram-stack">
      <MedicalIllustrationDiagram plan={plan} phase="finding" presentationMode={mode} />
      <MedicalIllustrationDiagram plan={plan} phase="procedure" presentationMode={mode} />
    </div>
  );

  return (
    <section className="surface p-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-heading">
          {mode === "preoperative_education"
            ? "Clinic handout preview"
            : "Patient education preview"}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={downloadSvg}
            disabled={exportBlocked}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download SVG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
            disabled={exportBlocked}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / save PDF
          </Button>
        </div>
      </div>

      <div className="no-print mt-4 space-y-3">
        {exportBlocked ? (
          <div role="alert" className="text-sm text-red-800">
            <strong>Export is blocked.</strong> <span>{exportBlockers[0]}</span>
          </div>
        ) : null}
        {draft ? (
          <p className="inline-flex rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-950">
            Draft - not reviewed
          </p>
        ) : null}

        {readyForFamilyPreview ? (
          <article className="overflow-hidden rounded-md border border-slate-300 bg-white">
            <header className="border-b border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                {mode === "preoperative_education"
                  ? "Patient procedure discussion"
                  : "Patient education handout draft"}
              </p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">Generated {generatedAtLabel}</p>
                </div>
                <p className="status-pill bg-white">
                  {draft
                    ? "Draft - not reviewed"
                    : mode === "preoperative_education"
                      ? "Approved for patient discussion"
                      : "Reviewed for demo"}
                </p>
              </div>
            </header>

            {mode === "preoperative_education" ? (
              <div className="p-4">
                <PatientProcedureGuide plan={plan} compact />
              </div>
            ) : (
              <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-3 text-sm leading-6 text-slate-700">
                  {postoperativeExplanation.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <aside className="space-y-3 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  <p className="font-semibold text-slate-900">Reference illustration guardrails</p>
                  <p>Uses licensed professional medical art and finite, deterministic overlays only.</p>
                  <p>Does not represent exact patient anatomy or replace the surgeon&apos;s explanation.</p>
                </aside>
              </div>
            )}

            <div className="border-t border-slate-200 p-4">
              <Legend />
              <p className="mt-3 rounded-md border border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                Educational preview—not an operative image or substitute for informed consent. Final
                details must be confirmed by the surgeon.
              </p>
            </div>
          </article>
        ) : (
          <div className="rounded-md border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <h3 className="text-base font-semibold text-slate-950">Preview locked</h3>
            <p className="mt-1">Complete the requirements above to unlock patient-facing copy and export.</p>
            {!normalizedPlan.canRender ? (
              <p className="mt-2 font-medium text-red-800">
                Resolve the conflicting structured selections before export.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="print-export-only">
        <header className="print-export-header">
          <div>
            <h2>{title}</h2>
            <p>Generated {generatedAtLabel}</p>
            {reviewerLabel ? <p>Clinician reviewer: {reviewerLabel}</p> : null}
          </div>
          <p>
            {draft
              ? "Draft - not reviewed"
              : mode === "preoperative_education"
                ? "Approved for patient discussion"
                : "Reviewed for demo"}
          </p>
        </header>
        {readyForFamilyPreview ? (
          <>
            {printDiagrams}
            {mode === "preoperative_education" ? (
              <PatientProcedureGuide plan={plan} compact />
            ) : (
              <div className="print-explanation">
                {postoperativeExplanation.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
            <Legend />
            <p className="print-disclaimer">
              Educational preview—not an operative image or substitute for informed consent. Final
              details must be confirmed by the surgeon.
            </p>
          </>
        ) : (
          <p className="print-disclaimer">
            Patient education handout unavailable until all review requirements are resolved.
          </p>
        )}
      </div>
    </section>
  );
}
