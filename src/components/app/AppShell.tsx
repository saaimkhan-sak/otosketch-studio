"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, Layers3, RotateCcw, ShieldCheck, Undo2 } from "lucide-react";
import type { EducationMode } from "@/domain/educationMode";
import { detectPossiblePhi } from "@/domain/safety";
import { clearReview, markReviewed, updateCaseField } from "@/domain/editCase";
import { getApprovalBlockers, getExportBlockers } from "@/domain/review";
import type { OperativeCase } from "@/domain/schema";
import {
  createEmptySurgeryPlan,
  deriveSurgeryPlanFromCase,
  getActiveSurgeryLayers,
  validateSurgeryPlan,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import type { CaseFieldPath } from "@/domain/types";
import { mockExtractor } from "@/extractors/mockExtractor";
import type { ExtractorProvider } from "@/extractors/NoteExtractor";
import { rulesExtractor } from "@/extractors/rulesExtractor";
import { syntheticCases, getSyntheticCase } from "@/fixtures/syntheticCases";
import { DiagramPanel } from "@/components/diagram/DiagramPanel";
import { Button } from "@/components/ui/Button";
import { ApprovalPanel } from "./ApprovalPanel";
import { CorrectionPanel } from "./CorrectionPanel";
import { EvidencePanel } from "./EvidencePanel";
import { ExampleCasePicker } from "./ExampleCasePicker";
import { ExportPanel } from "./ExportPanel";
import { ExtractionControls } from "./ExtractionControls";
import { FindingsPanel } from "./FindingsPanel";
import { NoteInput } from "./NoteInput";
import { PatientProcedureGuide } from "./PatientProcedureGuide";
import { ReviewIssuesPanel } from "./ReviewIssuesPanel";
import { SurgeryBuilder } from "./SurgeryBuilder";
import { TeachingProcedureGuide } from "./TeachingProcedureGuide";

const defaultProvider = (process.env.NEXT_PUBLIC_DEFAULT_EXTRACTOR ?? "mock") as ExtractorProvider;
const allowProviderSwitcher = process.env.NEXT_PUBLIC_ALLOW_PROVIDER_SWITCHER !== "false";
const publicCloudflareWorkerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL?.trim();

const reviewChecklistItemsByMode = {
  postoperative_summary: [
    { id: "laterality", label: "Laterality and side labels checked" },
    { id: "findings", label: "Findings match the cited evidence" },
    { id: "template", label: "Visual layers and limitations checked" },
    { id: "handout", label: "Patient handout copy reviewed" },
  ],
  preoperative_education: [
    { id: "laterality", label: "Planned procedure and side checked" },
    { id: "findings", label: "Planned steps match the surgeon discussion" },
    { id: "template", label: "Reference image, overlays, and limitations checked" },
    { id: "handout", label: "Clinic handout language reviewed" },
  ],
} as const satisfies Record<EducationMode, readonly { id: string; label: string }[]>;

type ReviewChecklistId = (typeof reviewChecklistItemsByMode.postoperative_summary)[number]["id"];
type ReviewChecklistState = Record<ReviewChecklistId, boolean>;
type SessionPurpose = "postoperative_summary" | "preoperative_education" | "teaching_walkthrough";

function createEmptyReviewChecklist(): ReviewChecklistState {
  return {
    laterality: false,
    findings: false,
    template: false,
    handout: false,
  };
}

function createManualOperativeCase(seed: OperativeCase): OperativeCase {
  const next = structuredClone(seed);
  const notDocumented = () => ({
    value: "not_documented" as const,
    evidence: [],
    editedByClinician: false,
  });
  next.caseId = "manual-synthetic-case";
  next.extractionProvider = "manual";
  next.createdAtIso = new Date().toISOString();
  next.procedure.family = notDocumented();
  next.procedure.laterality = notDocumented();
  next.anatomy.tympanicMembrane = notDocumented();
  next.anatomy.malleus = notDocumented();
  next.anatomy.incus = notDocumented();
  next.anatomy.incudostapedialJoint = notDocumented();
  next.anatomy.stapes = notDocumented();
  next.repair.reconstructionType = notDocumented();
  next.repair.reconstructionMaterial = notDocumented();
  next.repair.graftType = notDocumented();
  next.ambiguities = [];
  next.unsupportedClaims = [];
  next.safety = {
    containsPossiblePhi: false,
    phiWarnings: [],
    suitableForRendering: true,
  };
  next.review = { status: "draft_unreviewed" };
  return next;
}

export function AppShell() {
  const firstCase = syntheticCases[0];
  const [sessionPurpose, setSessionPurpose] = useState<SessionPurpose>("postoperative_summary");
  const [educationMode, setEducationMode] = useState<EducationMode>("postoperative_summary");
  const [selectedCaseId, setSelectedCaseId] = useState(firstCase.id);
  const [note, setNote] = useState(firstCase.note);
  const [provider, setProvider] = useState<ExtractorProvider>(defaultProvider);
  const [operativeCase, setOperativeCase] = useState<OperativeCase | null>(firstCase.expected);
  const [generatedCase, setGeneratedCase] = useState<OperativeCase | null>(firstCase.expected);
  const [surgeryPlan, setSurgeryPlan] = useState<SurgeryPlan>(() =>
    deriveSurgeryPlanFromCase(firstCase.expected),
  );
  const [generatedSurgeryPlan, setGeneratedSurgeryPlan] = useState<SurgeryPlan>(() =>
    deriveSurgeryPlanFromCase(firstCase.expected),
  );
  const [surgeryPlanHistory, setSurgeryPlanHistory] = useState<SurgeryPlan[]>([]);
  const [caseHistory, setCaseHistory] = useState<OperativeCase[]>([]);
  const [lastExtractedNote, setLastExtractedNote] = useState(firstCase.note);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewChecklist, setReviewChecklist] = useState<ReviewChecklistState>(() =>
    createEmptyReviewChecklist(),
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"example" | "note" | "manual">("example");
  const diagramRegionRef = useRef<HTMLElement | null>(null);
  const reviewChecklistItems = reviewChecklistItemsByMode[educationMode];
  const isTeaching = sessionPurpose === "teaching_walkthrough";

  const phiDetection = useMemo(() => detectPossiblePhi(note), [note]);
  const resultIsStale = operativeCase !== null && note !== lastExtractedNote;
  const surgeryPlanValidation = useMemo(() => validateSurgeryPlan(surgeryPlan), [surgeryPlan]);
  const surgeryPlanReviewBlockers = useMemo(
    () =>
      surgeryPlanValidation.issues
        .filter(
          (issue) =>
            issue.level === "blocking" ||
            [
              "source_safety_block",
              "source_safety_not_documented",
              "procedure_not_documented",
              "laterality_not_documented",
              "layer_evidence_missing",
            ].includes(issue.code),
        )
        .map((issue) => issue.message),
    [surgeryPlanValidation],
  );
  const preoperativePlanBlockers = useMemo(() => {
    if (educationMode !== "preoperative_education") return [];
    const blockers = surgeryPlanValidation.issues
      .filter(
        (issue) =>
          issue.code !== "plan_not_clinician_approved" &&
          (issue.level === "blocking" ||
            [
              "source_safety_block",
              "source_safety_not_documented",
              "procedure_not_documented",
              "laterality_not_documented",
            ].includes(issue.code)),
      )
      .map((issue) => issue.message);
    const hasPlannedAction = getActiveSurgeryLayers(surgeryPlan).some(
      (layer) => layer.role === "action" && layer.documentation === "documented",
    );
    if (!hasPlannedAction) blockers.push("Add at least one documented planned step or implant.");
    if (!reviewerName.trim()) blockers.push("Enter the clinician reviewer name.");
    return blockers;
  }, [educationMode, reviewerName, surgeryPlan, surgeryPlanValidation]);
  const approvalBlockers = useMemo(() => {
    if (educationMode === "preoperative_education") {
      return Array.from(new Set(preoperativePlanBlockers));
    }
    return operativeCase
      ? Array.from(
          new Set([
            ...getApprovalBlockers(operativeCase, { resultIsStale }),
            ...surgeryPlanReviewBlockers,
          ]),
        )
      : [];
  }, [
    educationMode,
    operativeCase,
    preoperativePlanBlockers,
    resultIsStale,
    surgeryPlanReviewBlockers,
  ]);
  const reviewChecklistComplete = useMemo(
    () => reviewChecklistItems.every((item) => reviewChecklist[item.id]),
    [reviewChecklist, reviewChecklistItems],
  );
  const reviewChecklistBlockers = useMemo(
    () =>
      !reviewChecklistComplete ? ["Complete the clinician review checklist before approval."] : [],
    [reviewChecklistComplete],
  );
  const reviewApprovalBlockers = useMemo(
    () => Array.from(new Set([...approvalBlockers, ...reviewChecklistBlockers])),
    [approvalBlockers, reviewChecklistBlockers],
  );
  const exportBlockers = useMemo(() => {
    if (educationMode === "preoperative_education") {
      return Array.from(
        new Set([
          ...(surgeryPlan.review.status === "approved_by_clinician"
            ? []
            : ["Clinician approval is required before the clinic handout can be exported."]),
          ...surgeryPlanValidation.issues.map((issue) => issue.message),
        ]),
      );
    }
    return operativeCase
      ? Array.from(
          new Set([
            ...getExportBlockers(operativeCase, { resultIsStale }),
            ...surgeryPlanValidation.issues.map((issue) => issue.message),
          ]),
        )
      : [];
  }, [educationMode, operativeCase, resultIsStale, surgeryPlan, surgeryPlanValidation]);
  const reviewChecklistForPanel = reviewChecklistItems.map((item) => ({
    ...item,
    checked: reviewChecklist[item.id],
  }));
  const cloudPhiBlocked = provider === "cloudflare" && phiDetection.containsPossiblePhi;
  const directCloudflareWorker = provider === "cloudflare" && Boolean(publicCloudflareWorkerUrl);

  const handleSelectCase = (caseId: string) => {
    const fixture = getSyntheticCase(caseId);
    const nextPlan = deriveSurgeryPlanFromCase(fixture.expected);
    setSelectedCaseId(fixture.id);
    setNote(fixture.note);
    setOperativeCase(fixture.expected);
    setGeneratedCase(fixture.expected);
    setSurgeryPlan(nextPlan);
    setGeneratedSurgeryPlan(nextPlan);
    setSurgeryPlanHistory([]);
    setCaseHistory([]);
    setLastExtractedNote(fixture.note);
    setReviewChecklist(createEmptyReviewChecklist());
    setWarnings([]);
    setError(null);
    setSelectedFeatureId(null);
  };

  const handleEducationModeChange = (nextMode: EducationMode) => {
    if (nextMode === educationMode) return;
    setEducationMode(nextMode);
    setReviewerName("");
    setReviewChecklist(createEmptyReviewChecklist());
    setSelectedFeatureId(null);

    if (nextMode === "postoperative_summary") {
      setInputMode("example");
      handleSelectCase(selectedCaseId);
      return;
    }

    const manualCase = createManualOperativeCase(firstCase.expected);
    const emptyPlan = {
      ...createEmptySurgeryPlan(),
      sourceCaseId: undefined,
      sourceSafety: { status: "cleared" as const },
    };
    setInputMode("manual");
    setNote("");
    setLastExtractedNote("");
    setOperativeCase(manualCase);
    setGeneratedCase(null);
    setSurgeryPlan(emptyPlan);
    setGeneratedSurgeryPlan(emptyPlan);
    setSurgeryPlanHistory([]);
    setCaseHistory([]);
    setWarnings([]);
    setError(null);
  };

  const handleSessionPurposeChange = (purpose: SessionPurpose) => {
    setSessionPurpose(purpose);
    handleEducationModeChange(
      purpose === "teaching_walkthrough" ? "preoperative_education" : purpose,
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      if (provider === "mock" || provider === "rules") {
        const extractor = provider === "mock" ? mockExtractor : rulesExtractor;
        const result = await extractor.extract({
          note,
          caseHint: selectedCaseId,
          provider,
        });
        setOperativeCase(result.case);
        setGeneratedCase(result.case);
        const nextPlan = deriveSurgeryPlanFromCase(result.case);
        setSurgeryPlan(nextPlan);
        setGeneratedSurgeryPlan(nextPlan);
        setWarnings(result.warnings);
        setLastExtractedNote(note);
      } else {
        const response = await fetch(
          directCloudflareWorker ? publicCloudflareWorkerUrl! : "/api/extract",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note, provider, caseHint: selectedCaseId }),
          },
        );
        const body = (await response.json()) as
          | { ok: true; case: OperativeCase; warnings: string[] }
          | { ok: false; message: string; warnings?: string[] };
        if (!response.ok || !body.ok) {
          setWarnings("warnings" in body ? (body.warnings ?? []) : []);
          throw new Error("message" in body ? body.message : "Extraction failed.");
        }
        setOperativeCase(body.case);
        setGeneratedCase(body.case);
        const nextPlan = deriveSurgeryPlanFromCase(body.case);
        setSurgeryPlan(nextPlan);
        setGeneratedSurgeryPlan(nextPlan);
        setWarnings(body.warnings);
        setLastExtractedNote(note);
      }
      setCaseHistory([]);
      setSurgeryPlanHistory([]);
      setReviewChecklist(createEmptyReviewChecklist());
      setSelectedFeatureId(null);
      window.setTimeout(() => {
        if (typeof diagramRegionRef.current?.scrollIntoView === "function") {
          diagramRegionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fieldPath: CaseFieldPath, value: string) => {
    if (!operativeCase) return;
    const nextCase = updateCaseField(operativeCase, fieldPath, value);
    setCaseHistory((history) => [...history.slice(-19), structuredClone(operativeCase)]);
    setSurgeryPlanHistory((history) => [...history.slice(-19), structuredClone(surgeryPlan)]);
    setReviewChecklist(createEmptyReviewChecklist());
    setOperativeCase(nextCase);
    setSurgeryPlan(deriveSurgeryPlanFromCase(nextCase));
  };

  const handleUndoEdit = () => {
    if (caseHistory.length === 0) return;
    const previousCase = caseHistory[caseHistory.length - 1];
    setOperativeCase(previousCase);
    setSurgeryPlan(deriveSurgeryPlanFromCase(previousCase));
    setCaseHistory((history) => history.slice(0, -1));
    setReviewChecklist(createEmptyReviewChecklist());
    setSelectedFeatureId(null);
  };

  const handleResetToGenerated = () => {
    if (!generatedCase) return;
    setOperativeCase(structuredClone(generatedCase));
    setSurgeryPlan(structuredClone(generatedSurgeryPlan));
    setCaseHistory([]);
    setSurgeryPlanHistory([]);
    setReviewChecklist(createEmptyReviewChecklist());
    setSelectedFeatureId(null);
  };

  const handleSurgeryPlanChange = (nextPlan: SurgeryPlan) => {
    setSurgeryPlanHistory((history) => [...history.slice(-29), structuredClone(surgeryPlan)]);
    setSurgeryPlan(nextPlan);
    if (operativeCase && educationMode === "postoperative_summary") {
      let nextCase = clearReview(operativeCase);
      if (
        nextPlan.laterality !== "not_documented" &&
        nextPlan.laterality !== nextCase.procedure.laterality.value
      ) {
        nextCase = updateCaseField(nextCase, "procedure.laterality", nextPlan.laterality);
      }
      setOperativeCase(nextCase);
    }
    setReviewChecklist(createEmptyReviewChecklist());
    setSelectedFeatureId(null);
  };

  const handleUndoPlan = () => {
    if (surgeryPlanHistory.length === 0) return;
    setSurgeryPlan(surgeryPlanHistory[surgeryPlanHistory.length - 1]);
    setSurgeryPlanHistory((history) => history.slice(0, -1));
    setReviewChecklist(createEmptyReviewChecklist());
    setSelectedFeatureId(null);
  };

  const handleResetPlan = () => {
    setSurgeryPlan(structuredClone(generatedSurgeryPlan));
    setSurgeryPlanHistory([]);
    if (generatedCase) setOperativeCase(clearReview(structuredClone(generatedCase)));
    setReviewChecklist(createEmptyReviewChecklist());
    setSelectedFeatureId(null);
  };

  const handleInputModeChange = (mode: "example" | "note" | "manual") => {
    setInputMode(mode);
    if (mode === "example") {
      handleSelectCase(selectedCaseId);
      return;
    }
    if (mode === "manual" && inputMode !== "manual") {
      const manualCase = createManualOperativeCase(firstCase.expected);
      const emptyPlan = {
        ...createEmptySurgeryPlan(),
        sourceCaseId: manualCase.caseId,
        sourceSafety: { status: "cleared" as const },
      };
      setNote("");
      setLastExtractedNote("");
      setOperativeCase(manualCase);
      setGeneratedCase(manualCase);
      setSurgeryPlan(emptyPlan);
      setGeneratedSurgeryPlan(emptyPlan);
      setCaseHistory([]);
      setSurgeryPlanHistory([]);
      setReviewChecklist(createEmptyReviewChecklist());
      setWarnings([]);
      setError(null);
      setSelectedFeatureId(null);
    }
  };

  const handleReviewChecklistChange = (id: string, checked: boolean) => {
    if (!reviewChecklistItems.some((item) => item.id === id)) return;
    setReviewChecklist((current) => ({
      ...current,
      [id as ReviewChecklistId]: checked,
    }));
  };

  const handleMarkReviewed = () => {
    if (reviewApprovalBlockers.length > 0) return;
    if (educationMode === "preoperative_education") {
      setSurgeryPlan((current) => ({
        ...current,
        review: {
          status: "approved_by_clinician",
          reviewerName: reviewerName.trim(),
          reviewedAtIso: new Date().toISOString(),
        },
      }));
      return;
    }
    if (!operativeCase) return;
    setOperativeCase(markReviewed(operativeCase, reviewerName));
    setSurgeryPlan((current) => ({
      ...current,
      review: {
        status: "requires_clinician_review",
        reviewerName: reviewerName.trim() || undefined,
        reviewedAtIso: new Date().toISOString(),
      },
    }));
  };

  const handleClearReview = () => {
    if (educationMode === "postoperative_summary") {
      if (!operativeCase) return;
      setOperativeCase(clearReview(operativeCase));
    }
    setSurgeryPlan((current) => ({ ...current, review: { status: "draft_unreviewed" } }));
    setReviewChecklist(createEmptyReviewChecklist());
  };

  return (
    <main className="app-workspace">
      <header className="product-header no-print">
        <div className="product-identity">
          <div className="product-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="product-kicker">Surgeon-reviewed visual education</p>
            <h1>OtoSketch Studio</h1>
          </div>
        </div>
        <div className="product-status" aria-label="Prototype status">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          {isTeaching
            ? "Teaching mode"
            : educationMode === "preoperative_education"
              ? "Clinic planning mode"
              : "Synthetic draft mode"}
        </div>
      </header>

      <section
        className="education-mode-switcher no-print"
        aria-labelledby="education-mode-heading"
      >
        <div>
          <p className="eyebrow">Start with the audience</p>
          <h2 id="education-mode-heading">
            {isTeaching
              ? "Teach the operation as a structured sequence"
              : educationMode === "preoperative_education"
                ? "Explain an upcoming procedure"
                : "Summarize a completed procedure"}
          </h2>
          <p className="education-mode-summary">
            Build one clinically grounded visual for the consult room, postoperative discussion, or
            resident teaching session.
          </p>
        </div>
        <div className="purpose-tabs" role="group" aria-label="Patient education purpose">
          <button
            type="button"
            aria-label="Upcoming procedure"
            className={sessionPurpose === "preoperative_education" ? "is-active" : undefined}
            aria-pressed={sessionPurpose === "preoperative_education"}
            onClick={() => handleSessionPurposeChange("preoperative_education")}
          >
            <strong>Upcoming procedure</strong>
            <span>Plan a clinic conversation</span>
          </button>
          <button
            type="button"
            aria-label="Completed procedure"
            className={sessionPurpose === "postoperative_summary" ? "is-active" : undefined}
            aria-pressed={sessionPurpose === "postoperative_summary"}
            onClick={() => handleSessionPurposeChange("postoperative_summary")}
          >
            <strong>Completed procedure</strong>
            <span>Explain findings and repair</span>
          </button>
          <button
            type="button"
            aria-label="Teaching walkthrough"
            className={sessionPurpose === "teaching_walkthrough" ? "is-active" : undefined}
            aria-pressed={sessionPurpose === "teaching_walkthrough"}
            onClick={() => handleSessionPurposeChange("teaching_walkthrough")}
          >
            <strong>Teaching walkthrough</strong>
            <span>Guide a trainee step by step</span>
          </button>
        </div>
      </section>

      <div className="workspace-shell-grid">
        <aside className="workspace-rail no-print">
          <nav className="stage-nav" aria-label="Workflow">
            <p>Workflow</p>
            <a href="#create-case">
              <span>1</span>
              {isTeaching
                ? "Choose procedure"
                : educationMode === "preoperative_education"
                  ? "Plan procedure"
                  : "Create case"}
            </a>
            <a href="#preview-verify">
              <span>2</span>
              {isTeaching
                ? "Teach the sequence"
                : educationMode === "preoperative_education"
                  ? "Preview discussion"
                  : "Preview & verify"}
            </a>
            <a href="#review-export">
              <span>3</span>
              {isTeaching
                ? "Approve teaching view"
                : educationMode === "preoperative_education"
                  ? "Approve & print"
                  : "Review & export"}
            </a>
          </nav>
          <div className="engine-card">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
            <div>
              <strong>Open medical art engine</strong>
              <p>Servier anatomy under CC BY 4.0 with finite, deterministic overlays.</p>
            </div>
          </div>
          <div className="privacy-card">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <div>
              <strong>Synthetic demo</strong>
              <p>No patient information. No note text is logged.</p>
            </div>
          </div>
        </aside>
        <div className="stage-stack">
          <section
            id="create-case"
            className="stage-shell no-print"
            aria-labelledby="create-case-heading"
          >
            <header className="stage-header">
              <span className="stage-number" aria-hidden="true">
                1
              </span>
              <div>
                <h2 id="create-case-heading">
                  {isTeaching
                    ? "Choose procedure"
                    : educationMode === "preoperative_education"
                      ? "Plan procedure"
                      : "Create case"}
                </h2>
                <p>
                  {isTeaching
                    ? "Start from a common operation, then select the anatomy and steps you want to teach."
                    : educationMode === "preoperative_education"
                      ? "Choose a common procedure, then customize only the surgeon's planned steps."
                      : "Start from an example, a synthetic note, or structured controls."}
                </p>
              </div>
            </header>

            {educationMode === "postoperative_summary" ? (
              <div className="input-mode-tabs" role="tablist" aria-label="Case input method">
                {(
                  [
                    ["example", "Example"],
                    ["note", "Paste note"],
                    ["manual", "Build manually"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={inputMode === mode}
                    className={inputMode === mode ? "is-active" : undefined}
                    onClick={() => handleInputModeChange(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              className={
                educationMode === "preoperative_education"
                  ? "create-case-grid is-clinic"
                  : "create-case-grid"
              }
            >
              {educationMode === "postoperative_summary" ? (
                <div className="case-source-panel">
                  {inputMode === "example" ? (
                    <>
                      <ExampleCasePicker
                        selectedCaseId={selectedCaseId}
                        onSelect={handleSelectCase}
                      />
                      <details className="compact-details">
                        <summary>View or edit example note</summary>
                        <div className="mt-3">
                          <NoteInput note={note} onChange={setNote} />
                        </div>
                      </details>
                    </>
                  ) : null}
                  {inputMode === "note" ? <NoteInput note={note} onChange={setNote} /> : null}
                  {inputMode === "manual" ? (
                    <div className="manual-mode-intro">
                      <strong>Structured builder</strong>
                      <span>
                        Choose only documented details. Unselected details stay not documented.
                      </span>
                    </div>
                  ) : null}
                  {phiDetection.containsPossiblePhi ? (
                    <div
                      role="alert"
                      className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-medium">Possible patient information detected.</p>
                        <p>{phiDetection.warnings.join(" ")}</p>
                      </div>
                    </div>
                  ) : null}
                  {provider === "cloudflare" ? (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
                      {directCloudflareWorker
                        ? "Text is sent directly to the configured Cloudflare extraction endpoint/model provider in this mode."
                        : "Text is sent to the configured Cloudflare extraction endpoint/model provider in this mode."}{" "}
                      Use synthetic notes only.
                    </div>
                  ) : null}
                  {provider === "ollama" ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      Ollama mode sends text to the configured local server. Keep it bound to
                      localhost.
                    </div>
                  ) : null}
                  {inputMode !== "manual" ? (
                    <ExtractionControls
                      provider={provider}
                      allowProviderSwitcher={allowProviderSwitcher}
                      onProviderChange={setProvider}
                      onGenerate={handleGenerate}
                      loading={loading}
                      disabled={!note.trim() || cloudPhiBlocked}
                    />
                  ) : null}
                </div>
              ) : (
                <aside className="clinic-plan-intro" aria-label="Clinic planning guardrails">
                  <strong>
                    {isTeaching ? "Faculty-led teaching view" : "No patient note is needed"}
                  </strong>
                  <p>
                    {isTeaching
                      ? "Build a reusable walkthrough from structured selections. Keep case-specific details out of this demo."
                      : "Build from structured selections only. Do not enter names, dates of birth, record numbers, or free-text patient details."}
                  </p>
                  <ul>
                    <li>Generic educational anatomy</li>
                    <li>
                      {isTeaching
                        ? "Stepwise cognitive walkthrough"
                        : "Plan may change during surgery"}
                    </li>
                    <li>Clinician approval required before printing</li>
                  </ul>
                </aside>
              )}
              <div className="structured-builder-column">
                <div className="builder-history-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUndoPlan}
                    disabled={surgeryPlanHistory.length === 0}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleResetPlan}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                  </Button>
                </div>
                <SurgeryBuilder
                  plan={surgeryPlan}
                  mode={educationMode}
                  onChange={handleSurgeryPlanChange}
                />
                {educationMode === "postoperative_summary" &&
                operativeCase &&
                inputMode !== "manual" ? (
                  <details className="source-fields-details">
                    <summary>Source extraction fields</summary>
                    <div className="mt-3">
                      <CorrectionPanel
                        operativeCase={operativeCase}
                        onEdit={handleEdit}
                        canUndo={caseHistory.length > 0}
                        canReset={Boolean(generatedCase)}
                        onUndo={handleUndoEdit}
                        onReset={handleResetToGenerated}
                      />
                    </div>
                  </details>
                ) : null}
              </div>
            </div>
            {error ? (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900"
              >
                {error}
              </div>
            ) : null}
            {warnings.length > 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
              >
                {warnings.join(" ")}
              </div>
            ) : null}
            {resultIsStale ? (
              <div
                role="alert"
                className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              >
                The note has changed since the current diagram was generated. Regenerate before
                review or export.
              </div>
            ) : null}
          </section>

          <section
            id="preview-verify"
            ref={diagramRegionRef}
            className="stage-shell"
            aria-labelledby="preview-verify-heading"
          >
            <header className="stage-header no-print">
              <span className="stage-number" aria-hidden="true">
                2
              </span>
              <div>
                <h2 id="preview-verify-heading">
                  {isTeaching
                    ? "Teach the sequence"
                    : educationMode === "preoperative_education"
                      ? "Preview discussion"
                      : "Preview & verify"}
                </h2>
                <p>
                  {isTeaching
                    ? "Orient to the anatomy, then move through each selected operative step."
                    : educationMode === "preoperative_education"
                      ? "Use the diagram and short guide to explain what is planned and what may change."
                      : "Select a visual label to inspect its source."}
                </p>
              </div>
            </header>
            {operativeCase ? (
              <>
                <DiagramPanel
                  operativeCase={operativeCase}
                  surgeryPlan={surgeryPlan}
                  mode={educationMode}
                  selectedFeatureId={selectedFeatureId}
                  onFeatureSelect={(featureId) => setSelectedFeatureId(featureId || null)}
                />
                {educationMode === "preoperative_education" ? (
                  <div className="no-print mt-5">
                    {isTeaching ? (
                      <TeachingProcedureGuide plan={surgeryPlan} />
                    ) : (
                      <PatientProcedureGuide plan={surgeryPlan} />
                    )}
                  </div>
                ) : (
                  <div className="verify-grid no-print">
                    <ReviewIssuesPanel operativeCase={operativeCase} />
                    <FindingsPanel
                      operativeCase={operativeCase}
                      surgeryPlan={surgeryPlan}
                      selectedFeatureId={selectedFeatureId}
                      onSelectFeature={setSelectedFeatureId}
                    />
                    <EvidencePanel
                      operativeCase={operativeCase}
                      surgeryPlan={surgeryPlan}
                      selectedFeatureId={selectedFeatureId}
                    />
                  </div>
                )}
              </>
            ) : null}
          </section>

          {operativeCase ? (
            <section
              id="review-export"
              className="stage-shell"
              aria-labelledby="review-export-heading"
            >
              <header className="stage-header no-print">
                <span className="stage-number" aria-hidden="true">
                  3
                </span>
                <div>
                  <h2 id="review-export-heading">
                    {isTeaching
                      ? "Approve teaching view"
                      : educationMode === "preoperative_education"
                        ? "Approve & print"
                        : "Review & export"}
                  </h2>
                  <p>
                    {isTeaching
                      ? "A named clinician must confirm the anatomy, sequence, and limitations."
                      : educationMode === "preoperative_education"
                        ? "A named clinician must confirm the plan and patient-facing language."
                        : "Confirm the draft before preparing patient education."}
                  </p>
                </div>
              </header>
              {exportBlockers.length > 0 ? (
                <details className="export-requirements no-print">
                  <summary>
                    {exportBlockers.length} requirement{exportBlockers.length === 1 ? "" : "s"}{" "}
                    before export
                  </summary>
                  <ul>
                    {exportBlockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <div className="review-grid no-print">
                <ApprovalPanel
                  operativeCase={operativeCase}
                  planReview={surgeryPlan.review}
                  mode={educationMode}
                  reviewerName={reviewerName}
                  approvalBlockers={reviewApprovalBlockers}
                  reviewChecklist={reviewChecklistForPanel}
                  onReviewerNameChange={setReviewerName}
                  onReviewChecklistChange={handleReviewChecklistChange}
                  onMarkReviewed={handleMarkReviewed}
                  onClearReview={handleClearReview}
                />
              </div>
              <ExportPanel
                operativeCase={operativeCase}
                surgeryPlan={surgeryPlan}
                mode={educationMode}
                exportBlockers={exportBlockers}
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
