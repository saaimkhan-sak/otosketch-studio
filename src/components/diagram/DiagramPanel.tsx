"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import {
  canDisplayStanfordAtlas,
  getAtlasUsageRights,
  type AtlasUsageRights,
} from "@/domain/atlasUsage";
import { selectAtlasDiagramTemplate } from "@/domain/atlasTemplates";
import type { EducationMode } from "@/domain/educationMode";
import { selectProcedureAtlas } from "@/domain/procedureAtlas";
import type { OperativeCase } from "@/domain/schema";
import {
  deriveSurgeryPlanFromCase,
  labelSurgeryProcedure,
  normalizeSurgeryPlan,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import { Button } from "@/components/ui/Button";
import { AtlasRightsNotice } from "./AtlasRightsNotice";
import { AtlasTemplateDiagram } from "./AtlasTemplateDiagram";
import { ComposedSurgeryDiagram } from "./ComposedSurgeryDiagram";
import { OpenMedicalArtOverview } from "./OpenMedicalArtOverview";
import { ProcedureAtlasDiagram } from "./ProcedureAtlasDiagram";
import { ProcedureAtlasSummary } from "./ProcedureAtlasSummary";
import { TemplateSummaryPanel } from "./TemplateSummaryPanel";

interface DiagramPanelProps {
  operativeCase?: OperativeCase | null;
  surgeryPlan?: SurgeryPlan;
  mode?: EducationMode;
  atlasUsageRights?: AtlasUsageRights;
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
  atlasUsageRights = getAtlasUsageRights(),
  selectedFeatureId,
  onFeatureSelect,
}: DiagramPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [failedAtlasKey, setFailedAtlasKey] = useState<string | null>(null);
  const expandTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const basePlan = useMemo(() => {
    if (surgeryPlan) return surgeryPlan;
    if (operativeCase) return deriveSurgeryPlanFromCase(operativeCase);
    throw new Error("DiagramPanel requires a structured surgery plan or operative case.");
  }, [operativeCase, surgeryPlan]);
  const normalized = useMemo(() => normalizeSurgeryPlan(basePlan), [basePlan]);
  const plan = normalized.plan ?? basePlan;
  const templateSelection = operativeCase ? selectAtlasDiagramTemplate(operativeCase) : null;
  const procedureAtlasSelection = useMemo(() => selectProcedureAtlas(plan, mode), [mode, plan]);
  const atlasSelectionKey =
    templateSelection?.status === "ready"
      ? `template:${templateSelection.template.id}`
      : procedureAtlasSelection
        ? `procedure:${procedureAtlasSelection.family}:${procedureAtlasSelection.panels.procedure.asset.id}`
        : null;
  const atlasLoadFailed = Boolean(atlasSelectionKey && failedAtlasKey === atlasSelectionKey);
  const atlasAuthorized = canDisplayStanfordAtlas(atlasUsageRights, mode);
  const templateClinicallyEligible =
    mode === "postoperative_summary" ||
    (templateSelection?.status === "ready" &&
      templateSelection.template.review.status === "clinician_approved");
  const procedureAtlasClinicallyEligible =
    mode === "postoperative_summary" ||
    procedureAtlasSelection?.review.status === "clinician_approved";
  const useAtlasTemplate =
    mode === "postoperative_summary" &&
    templateSelection?.status === "ready" &&
    templateClinicallyEligible &&
    !atlasLoadFailed &&
    atlasAuthorized;
  const useProcedureAtlas =
    !useAtlasTemplate &&
    Boolean(procedureAtlasSelection) &&
    procedureAtlasClinicallyEligible &&
    !atlasLoadFailed &&
    atlasAuthorized;
  const atlasInUse = useAtlasTemplate || useProcedureAtlas;
  const selectedLayerId = selectedFeatureId
    ? (featureToLegacyLayer[selectedFeatureId] ?? selectedFeatureId)
    : null;
  const selectLayer = (layerId: string) =>
    onFeatureSelect(legacyLayerToFeature[layerId] ?? layerId);
  const procedureLabel =
    plan.procedureFamilies === "not_documented"
      ? "Procedure not documented"
      : plan.procedureFamilies.map(labelSurgeryProcedure).join(" + ");

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

    const handleKeyDown = (event: KeyboardEvent) => {
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

  const diagramPhases = useAtlasTemplate ? (
    <div className="atlas-diagram-phases" data-diagram-source="stanford-atlas">
      <AtlasTemplateDiagram
        selection={templateSelection}
        panel="found"
        mode={mode}
        selectedFeatureId={selectedFeatureId}
        onFeatureSelect={onFeatureSelect}
        onImageError={() => atlasSelectionKey && setFailedAtlasKey(atlasSelectionKey)}
      />
      <AtlasTemplateDiagram
        selection={templateSelection}
        panel="repaired"
        mode={mode}
        selectedFeatureId={selectedFeatureId}
        onFeatureSelect={onFeatureSelect}
        onImageError={() => atlasSelectionKey && setFailedAtlasKey(atlasSelectionKey)}
      />
    </div>
  ) : useProcedureAtlas && procedureAtlasSelection ? (
    <div className="atlas-diagram-phases" data-diagram-source="stanford-atlas">
      <ProcedureAtlasDiagram
        selection={procedureAtlasSelection}
        phase="finding"
        selectedFeatureId={selectedLayerId}
        onFeatureSelect={selectLayer}
        onImageError={() => atlasSelectionKey && setFailedAtlasKey(atlasSelectionKey)}
      />
      <ProcedureAtlasDiagram
        selection={procedureAtlasSelection}
        phase="procedure"
        selectedFeatureId={selectedLayerId}
        onFeatureSelect={selectLayer}
        onImageError={() => atlasSelectionKey && setFailedAtlasKey(atlasSelectionKey)}
      />
    </div>
  ) : (
    <div className="composed-diagram-phases" data-diagram-source="original-deterministic">
      <ComposedSurgeryDiagram
        plan={plan}
        phase="finding"
        presentationMode={mode}
        selectedLayerId={selectedLayerId}
        onLayerSelect={selectLayer}
      />
      <ComposedSurgeryDiagram
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
          <p className="eyebrow">Surgical detail</p>
          <h3>
            {mode === "preoperative_education"
              ? "Walk through the planned procedure"
              : "Compare findings with the completed repair"}
          </h3>
        </div>
        <span>Structured SVG · not to scale</span>
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
            <span>
              {atlasInUse
                ? "Open medical art + atlas detail"
                : "Open medical art + deterministic detail"}
            </span>
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

      {atlasLoadFailed ? (
        <div role="status" className="atlas-load-fallback">
          <strong>Atlas source unavailable</strong>
          <span>
            Showing the original deterministic view so no overlay appears on a blank image.
          </span>
        </div>
      ) : null}

      {templateSelection?.status === "ready" && !atlasAuthorized ? (
        <AtlasRightsNotice selection={templateSelection} rights={atlasUsageRights} />
      ) : null}

      {templateSelection?.status === "ready" ? (
        <TemplateSummaryPanel selection={templateSelection} />
      ) : procedureAtlasSelection ? (
        <ProcedureAtlasSummary
          selection={procedureAtlasSelection}
          authorized={useProcedureAtlas}
          rights={atlasUsageRights}
        />
      ) : (
        <details className="template-summary" aria-label="Sources and limitations">
          <summary>Sources &amp; limitations · composable vector templates</summary>
          <p className="template-review-status">Needs otologist approval</p>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            This case uses original, deterministic anatomy views and finite visual layers. No exact
            atlas-image pair is required, and missing details are not inferred.
          </p>
        </details>
      )}

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
                <p>
                  {atlasInUse
                    ? "Atlas-backed reference preview"
                    : "Original deterministic · composable template preview"}
                </p>
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
