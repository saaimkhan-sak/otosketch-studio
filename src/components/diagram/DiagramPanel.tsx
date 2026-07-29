"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { EducationMode } from "@/domain/educationMode";
import { selectMedicalArtAsset } from "@/domain/medicalArt";
import type { OperativeCase } from "@/domain/schema";
import {
  deriveSurgeryPlanFromCase,
  labelSurgeryProcedure,
  normalizeSurgeryPlan,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import { Button } from "@/components/ui/Button";
import { MedicalIllustrationDiagram } from "./MedicalIllustrationDiagram";
import { OpenMedicalArtOverview } from "./OpenMedicalArtOverview";

interface DiagramPanelProps {
  operativeCase?: OperativeCase | null;
  surgeryPlan?: SurgeryPlan;
  mode?: EducationMode;
  selectedFeatureId: string | null;
  onFeatureSelect: (featureId: string) => void;
}

const legacyLayerToFeature: Record<string, string> = {
  "legacy-tm-state": "feature-tm",
  "legacy-tm-perforation": "feature-tm",
  "legacy-malleus": "feature-malleus",
  "legacy-incus": "feature-incus",
  "legacy-incudostapedial-joint": "feature-is-joint",
  "legacy-stapes": "feature-stapes",
  "legacy-ossicular-reconstruction": "feature-reconstruction",
  "legacy-graft": "feature-graft",
};

const featureToLegacyLayer = Object.fromEntries(
  Object.entries(legacyLayerToFeature).map(([layer, feature]) => [feature, layer]),
);

export function DiagramPanel({
  operativeCase,
  surgeryPlan,
  mode = "postoperative_summary",
  selectedFeatureId,
  onFeatureSelect,
}: DiagramPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const expandTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const basePlan = useMemo(() => {
    if (surgeryPlan) return surgeryPlan;
    if (operativeCase) return deriveSurgeryPlanFromCase(operativeCase);
    throw new Error("DiagramPanel requires a structured surgery plan or operative case.");
  }, [operativeCase, surgeryPlan]);
  const normalized = useMemo(() => normalizeSurgeryPlan(basePlan), [basePlan]);
  const plan = normalized.plan ?? basePlan;
  const selectedLayerId = selectedFeatureId
    ? (featureToLegacyLayer[selectedFeatureId] ?? selectedFeatureId)
    : null;
  const selectLayer = (layerId: string) =>
    onFeatureSelect(legacyLayerToFeature[layerId] ?? layerId);
  const procedureLabel =
    plan.procedureFamilies === "not_documented"
      ? "Procedure not documented"
      : plan.procedureFamilies.map(labelSurgeryProcedure).join(" + ");
  const medicalArt = selectMedicalArtAsset(plan);

  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpanded(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      expandTriggerRef.current?.focus();
    };
  }, [expanded]);

  if (operativeCase && !operativeCase.safety.suitableForRendering) {
    return (
      <div role="alert" className="diagram-blocker">
        <strong>Diagram unavailable</strong>
        <span>{operativeCase.safety.blockRenderingReason}</span>
      </div>
    );
  }

  const diagramPhases = (
    <div className="medical-illustration-phases" data-diagram-source="open-medical-art">
      <MedicalIllustrationDiagram
        plan={plan}
        phase="finding"
        presentationMode={mode}
        selectedLayerId={selectedLayerId}
        onLayerSelect={selectLayer}
      />
      <MedicalIllustrationDiagram
        plan={plan}
        phase="procedure"
        presentationMode={mode}
        selectedLayerId={selectedLayerId}
        onLayerSelect={selectLayer}
      />
    </div>
  );

  const diagramExperience = (
    <div className="diagram-experience">
      <OpenMedicalArtOverview
        plan={plan}
        selectedLayerId={selectedLayerId}
        onLayerSelect={selectLayer}
      />
      <div className="surgical-detail-heading">
        <div>
          <p className="eyebrow">Medical illustration sequence</p>
          <h3>
            {mode === "preoperative_education"
              ? "Walk through the planned procedure"
              : "Compare findings with the completed repair"}
          </h3>
        </div>
        <span>Professional medical art · structured overlays</span>
      </div>
      {diagramPhases}
    </div>
  );

  return (
    <section className="diagram-workbench no-print" aria-label="Diagram preview">
      <div className="diagram-workbench-header">
        <div>
          <h2 className="section-heading">Diagram preview</h2>
          <div className="diagram-status-row" aria-label="Diagram status">
            <span>
              {mode === "preoperative_education" ? "Upcoming procedure" : "Internal draft"}
            </span>
            <span>Professional open medical art</span>
            <span>{mode === "preoperative_education" ? "Plan may change" : "Not to scale"}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={(event) => {
            expandTriggerRef.current = event.currentTarget;
            setExpanded(true);
          }}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
          Full screen
        </Button>
      </div>

      {normalized.issues.length > 0 ? (
        <div className="plan-issue-list" aria-live="polite">
          {normalized.issues
            .filter((item) => item.code !== "plan_not_clinician_approved")
            .map((item) => (
              <div
                key={`${item.code}-${item.layerIds.join("-")}`}
                className={item.level === "blocking" ? "is-blocking" : "is-review"}
              >
                <strong>{item.level === "blocking" ? "Cannot combine" : "Needs review"}</strong>
                <span>{item.message}</span>
              </div>
            ))}
        </div>
      ) : null}

      {normalized.canRender ? (
        diagramExperience
      ) : (
        <div role="alert" className="diagram-blocker">
          <strong>Resolve the conflicting selections</strong>
          <span>
            The current combination is anatomically contradictory, so no misleading image is shown.
          </span>
        </div>
      )}

      <details className="template-summary" aria-label="Sources and limitations">
        <summary>Sources &amp; limitations · professional medical art</summary>
        <p className="template-review-status">Clinician review required</p>
        <p className="mt-3 text-xs leading-5 text-slate-600">
          Base illustration: {medicalArt.attribution}. Created with{" "}
          {medicalArt.illustrationSoftware}; {medicalArt.license}. OtoSketch adds only finite,
          structured overlays from documented plan fields. The image is generic educational
          anatomy, not patient-specific geometry.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          No traced surgical-atlas artwork or source-image coordinate calibration is used.
        </p>
      </details>

      {expanded ? (
        <div className="diagram-dialog-backdrop" onClick={() => setExpanded(false)}>
          <div
            ref={dialogRef}
            className="diagram-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Full-screen diagram preview"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h3>{procedureLabel}</h3>
                <p>Professional open medical art · deterministic structured overlays</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setExpanded(false)}>
                <X className="h-4 w-4" aria-hidden="true" />
                Close
              </Button>
            </header>
            {diagramExperience}
          </div>
        </div>
      ) : null}
    </section>
  );
}
