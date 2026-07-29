import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApprovalPanel } from "@/components/app/ApprovalPanel";
import { CorrectionPanel } from "@/components/app/CorrectionPanel";
import { ExampleCasePicker } from "@/components/app/ExampleCasePicker";
import { ExtractionControls } from "@/components/app/ExtractionControls";
import { ExportPanel } from "@/components/app/ExportPanel";
import { NoteInput } from "@/components/app/NoteInput";
import { ReviewIssuesPanel } from "@/components/app/ReviewIssuesPanel";
import { SafetyBanner } from "@/components/app/SafetyBanner";
import { AtlasTemplateDiagram } from "@/components/diagram/AtlasTemplateDiagram";
import { DiagramPanel } from "@/components/diagram/DiagramPanel";
import { OtologyDiagram } from "@/components/diagram/OtologyDiagram";
import { selectAtlasDiagramTemplate } from "@/domain/atlasTemplates";
import { buildDiagramState, buildFeatureMap } from "@/domain/diagramMapping";
import { markReviewed, updateCaseField } from "@/domain/editCase";
import { getApprovalBlockers, getExportBlockers } from "@/domain/review";
import { getSyntheticCase, syntheticCases } from "@/fixtures/syntheticCases";

const reviewChecklist = [
  { id: "laterality", label: "Laterality and side labels checked", checked: false },
  { id: "findings", label: "Findings match the cited evidence", checked: false },
  { id: "template", label: "Atlas template and limitations reviewed", checked: false },
  { id: "handout", label: "Patient handout copy reviewed", checked: false },
];

describe("core UI components", () => {
  it("renders the synthetic-only safety banner", () => {
    render(<SafetyBanner />);
    expect(
      screen.getByText("Synthetic demo — do not enter patient information."),
    ).toBeInTheDocument();
  });

  it("lets a user choose a bundled synthetic case", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ExampleCasePicker selectedCaseId="normal-ossicular-chain" onSelect={onSelect} />);
    expect(syntheticCases.length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText(/Expected case:/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Example case"), "hero-otomimix-is-joint");
    expect(onSelect).toHaveBeenCalledWith("hero-otomimix-is-joint");
  });

  it("shows the operative-note count only near the character limit", () => {
    const { rerender } = render(
      <NoteInput note="1234567" characterLimit={10} onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Operative note")).toBeInTheDocument();
    expect(screen.queryByText("7 / 10")).not.toBeInTheDocument();

    rerender(<NoteInput note="12345678" characterLimit={10} onChange={vi.fn()} />);
    expect(screen.getByText("8 / 10")).toBeInTheDocument();
  });

  it("keeps diagram generation visible while extractor settings stay advanced", async () => {
    const user = userEvent.setup();
    const onProviderChange = vi.fn();
    const onGenerate = vi.fn();
    render(
      <ExtractionControls
        provider="mock"
        allowProviderSwitcher
        onProviderChange={onProviderChange}
        onGenerate={onGenerate}
        loading={false}
        disabled={false}
      />,
    );

    const advanced = screen.getByText("Advanced").closest("details");
    expect(advanced).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Build diagram" })).toBeVisible();

    await user.click(screen.getByText("Advanced"));
    expect(advanced).toHaveAttribute("open");
    await user.selectOptions(screen.getByLabelText("Extractor"), "rules");
    expect(onProviderChange).toHaveBeenCalledWith("rules");

    await user.click(screen.getByRole("button", { name: "Build diagram" }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("emits structured correction edits", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<CorrectionPanel operativeCase={getSyntheticCase("hero-otomimix-is-joint").expected} onEdit={onEdit} />);
    await user.selectOptions(screen.getByLabelText("Reconstruction"), "porp");
    expect(onEdit).toHaveBeenCalledWith("repair.reconstructionType", "porp");
  });

  it("exposes undo and reset controls for manual corrections", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    const onReset = vi.fn();
    render(
      <CorrectionPanel
        operativeCase={getSyntheticCase("hero-otomimix-is-joint").expected}
        onEdit={vi.fn()}
        canUndo
        canReset
        onUndo={onUndo}
        onReset={onReset}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Undo edit/i }));
    await user.click(screen.getByRole("button", { name: /Reset to generated/i }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("blocks approval when laterality is not documented", () => {
    const missingLaterality = updateCaseField(
      getSyntheticCase("hero-otomimix-is-joint").expected,
      "procedure.laterality",
      "not_documented",
    );
    expect(getApprovalBlockers(missingLaterality).join(" ")).toMatch(/Laterality/i);
  });

  it("blocks approval when note-derived output is stale", () => {
    const blockers = getApprovalBlockers(getSyntheticCase("hero-otomimix-is-joint").expected, {
      resultIsStale: true,
    });
    expect(blockers.join(" ")).toMatch(/Regenerate before review/i);
  });

  it("announces review blockers to assistive technology", () => {
    const operativeCase = getSyntheticCase("hero-otomimix-is-joint").expected;
    render(
      <ApprovalPanel
        operativeCase={operativeCase}
        reviewerName=""
        approvalBlockers={["Laterality must be reviewed before marking the diagram reviewed."]}
        reviewChecklist={reviewChecklist}
        onReviewerNameChange={vi.fn()}
        onReviewChecklistChange={vi.fn()}
        onMarkReviewed={vi.fn()}
        onClearReview={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Review is blocked/i);
    expect(screen.getByRole("button", { name: /Mark reviewed for demo/i })).toBeDisabled();
  });

  it("requires checklist completion before demo review", async () => {
    const user = userEvent.setup();
    const onChecklistChange = vi.fn();
    render(
      <ApprovalPanel
        operativeCase={getSyntheticCase("hero-otomimix-is-joint").expected}
        reviewerName=""
        approvalBlockers={["Complete the clinician review checklist before marking reviewed."]}
        reviewChecklist={reviewChecklist}
        onReviewerNameChange={vi.fn()}
        onReviewChecklistChange={onChecklistChange}
        onMarkReviewed={vi.fn()}
        onClearReview={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: /Clinician review checklist/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark reviewed for demo/i })).toBeDisabled();

    await user.click(screen.getByLabelText(/Laterality and side labels checked/i));
    expect(onChecklistChange).toHaveBeenCalledWith("laterality", true);
  });

  it("surfaces review issues and blocks unsupported claims from review", () => {
    const operativeCase = structuredClone(getSyntheticCase("hero-otomimix-is-joint").expected);
    operativeCase.ambiguities.push({
      message: "Material wording needs confirmation.",
      sourceText: "cement-like material was used",
      severity: "warning",
    });
    operativeCase.unsupportedClaims.push({
      claim: "Facial nerve decompression was described.",
      reason: "Facial nerve decompression is outside the MVP renderer.",
    });

    render(<ReviewIssuesPanel operativeCase={operativeCase} />);

    expect(screen.getByText("Material wording needs confirmation.")).toBeInTheDocument();
    expect(screen.getByText("cement-like material was used")).toBeInTheDocument();
    expect(screen.getByText("Facial nerve decompression was described.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Ambiguities/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/Unsupported claims/i);
    expect(getApprovalBlockers(operativeCase).join(" ")).toMatch(/Unsupported claim must be resolved/i);
  });

  it("locks patient education preview until review and omits raw note text", () => {
    const operativeCase = getSyntheticCase("hero-otomimix-is-joint").expected;
    render(<ExportPanel operativeCase={operativeCase} exportBlockers={getExportBlockers(operativeCase)} />);

    expect(screen.getByText("Export is blocked.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Export is blocked/i);
    expect(
      screen.getByText(/clinician-approved visual template required before patient education export/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download SVG/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Print \/ save PDF/i })).toBeDisabled();
    expect(screen.getAllByText(/Draft - not reviewed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Patient education preview unavailable/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Complete the requirements above/i)).toBeInTheDocument();
    expect(screen.queryByText(/bone cement bridging/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/This is fictional sample text for product development/i)).not.toBeInTheDocument();
  });

  it("does not show family-facing repair claims for unsupported template edits", () => {
    const mismatchedBoneCement = updateCaseField(
      getSyntheticCase("porp-reconstruction").expected,
      "repair.reconstructionType",
      "bone_cement_bridge",
    );

    render(<ExportPanel operativeCase={mismatchedBoneCement} exportBlockers={getExportBlockers(mismatchedBoneCement)} />);

    expect(screen.getAllByText(/Patient education preview unavailable/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/No exact atlas overlay template matches this bone-cement reconstruction pattern/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/bone cement bridging the hearing-bone connection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/partial prosthesis used to reconnect/i)).not.toBeInTheDocument();
  });

  it("blocks export after case review until the atlas template has otologist approval", () => {
    const operativeCase = markReviewed(getSyntheticCase("normal-ossicular-chain").expected);
    render(<ExportPanel operativeCase={operativeCase} exportBlockers={getExportBlockers(operativeCase)} />);

    expect(screen.getByText("Export is blocked.")).toBeInTheDocument();
    expect(screen.getByText(/template-level otologist approval/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download SVG/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Print \/ save PDF/i })).toBeDisabled();
  });

  it("renders an atlas-backed diagram with deterministic callouts and provenance", () => {
    const selection = selectAtlasDiagramTemplate(getSyntheticCase("porp-reconstruction").expected);
    if (selection.status !== "ready") throw new Error("PORP fixture should have a template.");

    const { container } = render(<AtlasTemplateDiagram selection={selection} panel="repaired" />);

    expect(screen.getByRole("group", { name: /documented repair/i })).toHaveAttribute("aria-labelledby");
    expect(container.querySelector('[data-template-id="atlas-porp-reference"]')).toBeInTheDocument();
    expect(container.querySelector('[data-atlas-asset-id="1736"]')).toBeInTheDocument();
    expect(screen.getAllByText(/Stanford Oto Surgery Atlas asset 1736/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reconstruction: PORP/i).length).toBeGreaterThan(0);
  });

  it("shows composable diagrams with compact source and limitation details", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(screen.getByRole("region", { name: /diagram preview/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /findings: eardrum view/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /procedure and repair: middle-ear view/i })).toBeInTheDocument();
    expect(container.querySelectorAll(".composed-surgery-svg")).toHaveLength(3);

    const sources = screen.getByRole("group", { name: /sources and limitations/i });
    expect(sources).not.toHaveAttribute("open");
    expect(sources).toHaveTextContent(/Atlas PORP reference/i);
    expect(sources).toHaveTextContent(/Finding reference · 1724/i);
    expect(sources).toHaveTextContent(/Repair reference · 1736/i);
    expect(sources).toHaveTextContent(/Needs otologist approval/i);
  });

  it("opens a full-screen composable diagram review dialog", async () => {
    const user = userEvent.setup();
    render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Full screen/i }));
    const dialog = screen.getByRole("dialog", { name: /Full-screen diagram preview/i });
    expect(dialog).toHaveTextContent(/Tympanoplasty \/ myringoplasty/i);
    expect(dialog).toHaveTextContent(/Ossiculoplasty \/ middle-ear exploration/i);
    expect(dialog).toHaveTextContent(/Composable template preview/i);
    expect(screen.getAllByRole("img", { name: /Procedure and repair: Middle-ear view/i })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /Close/i }));
    expect(screen.queryByRole("dialog", { name: /Full-screen diagram preview/i })).not.toBeInTheDocument();
  });

  it("lets keyboard users select diagram features for evidence review", async () => {
    const user = userEvent.setup();
    const onFeatureSelect = vi.fn();
    const selection = selectAtlasDiagramTemplate(getSyntheticCase("porp-reconstruction").expected);
    if (selection.status !== "ready") throw new Error("PORP fixture should have a template.");
    render(<AtlasTemplateDiagram selection={selection} panel="repaired" onFeatureSelect={onFeatureSelect} />);

    screen.getAllByRole("button", { name: /reconstruction: porp/i })[0].focus();
    await user.keyboard("{Enter}");
    expect(onFeatureSelect).toHaveBeenLastCalledWith("feature-reconstruction");

    await user.keyboard(" ");
    expect(onFeatureSelect).toHaveBeenLastCalledWith("feature-reconstruction");
  });

  it("visually links the selected diagram marker to evidence review", () => {
    const selection = selectAtlasDiagramTemplate(getSyntheticCase("porp-reconstruction").expected);
    if (selection.status !== "ready") throw new Error("PORP fixture should have a template.");
    const { container } = render(
      <AtlasTemplateDiagram selection={selection} panel="repaired" selectedFeatureId="feature-reconstruction" />,
    );

    expect(container.querySelector(".atlas-marker-selected-ring")).toBeInTheDocument();
    expect(container.querySelector('[data-feature-id="feature-reconstruction"]')).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the composable diagram available while flagging uncertain placement", () => {
    const mismatchedBoneCement = updateCaseField(
      getSyntheticCase("porp-reconstruction").expected,
      "repair.reconstructionType",
      "bone_cement_bridge",
    );

    render(
      <DiagramPanel
        operativeCase={mismatchedBoneCement}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(screen.getByText(/The reconstruction endpoints are not fully documented/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /procedure and repair: middle-ear view/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /sources and limitations/i })).toHaveTextContent(
      /composable vector templates/i,
    );
  });

  it("renders undocumented anatomy as non-selectable context", () => {
    const state = buildDiagramState(getSyntheticCase("is-joint-discontinuity").expected, "found");
    const { container } = render(<OtologyDiagram state={state} />);
    expect(screen.getByText(/incus not documented/i)).toBeInTheDocument();
    expect(container.querySelector('[data-structure="incus"][data-documentation-state="not_documented"]')).toBeInTheDocument();
    expect(container.querySelector('[data-feature-id="feature-incus"]')).not.toBeInTheDocument();
  });

  it("keeps right-ear diagram labels readable when anatomy is mirrored", () => {
    const state = buildDiagramState(getSyntheticCase("normal-ossicular-chain").expected, "found");
    const { container } = render(<OtologyDiagram state={state} />);
    const mirroredGroup = container.querySelector('[data-anatomy-mirror="right"]');
    expect(mirroredGroup).toBeInTheDocument();

    const mirroredLabels = Array.from(mirroredGroup!.querySelectorAll("text"));
    expect(mirroredLabels.length).toBeGreaterThan(0);
    for (const label of mirroredLabels) {
      expect(label).toHaveAttribute("data-readable-label", "true");
      expect(label.getAttribute("transform")).toMatch(/scale\(-1 1\)/);
    }
  });

  it("keeps every selectable diagram feature connected to the evidence map", () => {
    for (const fixture of syntheticCases) {
      if (selectAtlasDiagramTemplate(fixture.expected).status === "blocked") continue;
      const { container, unmount } = render(
        <DiagramPanel
          operativeCase={fixture.expected}
          selectedFeatureId={null}
          onFeatureSelect={() => undefined}
        />,
      );
      const evidenceFeatureIds = new Set(buildFeatureMap(fixture.expected).map((feature) => feature.id));
      const renderedFeatureIds = Array.from(container.querySelectorAll("[data-feature-id]")).map((element) =>
        element.getAttribute("data-feature-id"),
      );

      for (const featureId of renderedFeatureIds) {
        expect(evidenceFeatureIds.has(featureId ?? ""), `${fixture.id} rendered ${featureId}`).toBe(true);
      }
      unmount();
    }
  });
});
