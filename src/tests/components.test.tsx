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
import { createPresetPlan } from "@/components/app/SurgeryBuilder";
import { DiagramPanel } from "@/components/diagram/DiagramPanel";
import { MedicalIllustrationDiagram } from "@/components/diagram/MedicalIllustrationDiagram";
import { buildFeatureMap } from "@/domain/diagramMapping";
import { markReviewed, updateCaseField } from "@/domain/editCase";
import { getApprovalBlockers, getExportBlockers } from "@/domain/review";
import type { SurgeryLayer } from "@/domain/surgeryPlan";
import { getSyntheticCase, syntheticCases } from "@/fixtures/syntheticCases";

const reviewChecklist = [
  { id: "laterality", label: "Laterality and side labels checked", checked: false },
  { id: "findings", label: "Findings match the cited evidence", checked: false },
  { id: "template", label: "Medical art and limitations reviewed", checked: false },
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
    render(
      <CorrectionPanel
        operativeCase={getSyntheticCase("hero-otomimix-is-joint").expected}
        onEdit={onEdit}
      />,
    );
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
    expect(getApprovalBlockers(operativeCase).join(" ")).toMatch(
      /Unsupported claim must be resolved/i,
    );
  });

  it("locks patient education preview until review and omits raw note text", () => {
    const operativeCase = getSyntheticCase("hero-otomimix-is-joint").expected;
    render(
      <ExportPanel
        operativeCase={operativeCase}
        exportBlockers={getExportBlockers(operativeCase)}
      />,
    );

    expect(screen.getByText("Export is blocked.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Export is blocked/i);
    expect(
      screen.getByText(/Mark the diagram reviewed before patient education export/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download SVG/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Print \/ save PDF/i })).toBeDisabled();
    expect(screen.getAllByText(/Draft - not reviewed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Patient education preview unavailable/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Complete the requirements above/i)).toBeInTheDocument();
    expect(screen.queryByText(/bone cement bridging/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/This is fictional sample text for product development/i),
    ).not.toBeInTheDocument();
  });

  it("does not show family-facing repair claims before review", () => {
    const mismatchedBoneCement = updateCaseField(
      getSyntheticCase("porp-reconstruction").expected,
      "repair.reconstructionType",
      "bone_cement_bridge",
    );

    render(
      <ExportPanel
        operativeCase={mismatchedBoneCement}
        exportBlockers={getExportBlockers(mismatchedBoneCement)}
      />,
    );

    expect(screen.getAllByText(/Patient education preview unavailable/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/bone cement bridging the hearing-bone connection/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/partial prosthesis used to reconnect/i)).not.toBeInTheDocument();
  });

  it("enables export after clinician review", () => {
    const operativeCase = markReviewed(getSyntheticCase("normal-ossicular-chain").expected);
    render(
      <ExportPanel
        operativeCase={operativeCase}
        exportBlockers={getExportBlockers(operativeCase)}
      />,
    );

    expect(screen.queryByText("Export is blocked.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download SVG/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Print \/ save PDF/i })).toBeEnabled();
  });

  it("renders professional medical art with deterministic callouts and provenance", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(container.querySelectorAll(".medical-illustration-svg")).toHaveLength(2);
    expect(
      container.querySelector('[data-medical-illustration="servier-inner-ear"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-diagram-source="open-medical-art"]')).toBeInTheDocument();
    expect(screen.getAllByText(/Servier Medical Art/i).length).toBeGreaterThan(0);
  });

  it("omits documented no-op reconstruction text from the visual layer legend", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("normal-ossicular-chain").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(screen.queryByText("No ossicular reconstruction performed")).not.toBeInTheDocument();
    expect(container.querySelector('[data-prosthesis-method="none"]')).not.toBeInTheDocument();
  });

  it("maps a tympanoplasty perforation and covering graft onto the curved source TM", () => {
    const { container } = render(
      <DiagramPanel
        surgeryPlan={createPresetPlan("tympanoplasty")}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(container.querySelector('[data-medical-perforation="central"]')).toHaveAttribute(
      "data-perforation-geometry",
      "documented-polygon",
    );
    const graft = container.querySelector('[data-medical-graft="tympanic-membrane-repair"]');
    expect(graft).toHaveAttribute("data-graft-calibration", "servier-ear-cutaway-tm-2026-07");
    expect(graft).toHaveAttribute("data-graft-geometry", "documented-polygon");
    expect(graft).toHaveAttribute("data-graft-technique", "medial");
    expect(
      container.querySelector('[data-medical-art-composition="tm-foreground"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-anatomy-education-treatment="translucent-foreground"]'),
    ).toHaveAttribute("opacity", "0.52");
  });

  it("shows medical-art diagrams with compact source and limitation details", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(screen.getByRole("region", { name: /diagram preview/i })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Findings: Middle and inner ear/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Procedure: Middle and inner ear/i }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".medical-illustration-svg")).toHaveLength(2);

    const sources = screen.getByRole("group", { name: /sources and limitations/i });
    expect(sources).not.toHaveAttribute("open");
    expect(sources).toHaveTextContent(/Servier Medical Art/i);
    expect(sources).toHaveTextContent(/Calibrated structured overlays/i);
    expect(sources).toHaveTextContent(/Clinician review required/i);
  });

  it("opens a full-screen medical illustration review dialog", async () => {
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
    expect(dialog.querySelectorAll(".medical-illustration-svg")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /Close/i }));
    expect(
      screen.queryByRole("dialog", { name: /Full-screen diagram preview/i }),
    ).not.toBeInTheDocument();
  });

  it("lets keyboard users select medical-art callouts for evidence review", async () => {
    const user = userEvent.setup();
    const onFeatureSelect = vi.fn();
    render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={onFeatureSelect}
      />,
    );

    screen.getAllByRole("button", { name: /^Callout \d+: PORP/i })[0].focus();
    await user.keyboard("{Enter}");
    expect(onFeatureSelect).toHaveBeenLastCalledWith("feature-reconstruction");

    await user.keyboard(" ");
    expect(onFeatureSelect).toHaveBeenLastCalledWith("feature-reconstruction");
  });

  it("visually links the selected medical-art layer to evidence review", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId="feature-reconstruction"
        onFeatureSelect={() => undefined}
      />,
    );

    expect(container.querySelector(".medical-panel-hotspot.is-selected")).toBeInTheDocument();
    expect(
      container.querySelector('.medical-panel-hotspot[aria-pressed="true"]'),
    ).toBeInTheDocument();
  });

  it("renders incus erosion by clipping the official incus layer at the retained stump", () => {
    const { container } = render(
      <DiagramPanel
        surgeryPlan={createPresetPlan("ossiculoplasty")}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    const erodedIncusLayers = container.querySelectorAll(
      '[data-anatomy-component="incus"][data-anatomy-component-state="long-process-eroded"]',
    );
    expect(erodedIncusLayers).toHaveLength(2);
    for (const incus of erodedIncusLayers) {
      expect(incus.getAttribute("clip-path")).toMatch(/incus-retained/);
      expect(incus).not.toHaveAttribute("mask");
    }
    expect(
      container.querySelector('.medical-lesion[data-erosion-rendering="source-clipped-stump"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('image[href="/medical-art/servier/inner-ear.png"]'),
    ).not.toBeInTheDocument();
    expect(container.querySelector('image[mask*="anatomy-mask"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-anatomy-layer="ossicle_state"]')).toBeInTheDocument();
    expect(
      container.querySelector('[data-anatomy-layer="verification_status"]'),
    ).not.toBeInTheDocument();
  });

  it("joins a bone-cement bridge to the retained incus stump", () => {
    const plan = createPresetPlan("ossiculoplasty");
    plan.layers = plan.layers.map((layer) =>
      layer.kind === "ossicular_reconstruction"
        ? {
            ...layer,
            method: "bone_cement_bridge",
            material: "otomimix",
            lateralEndpoint: "incus_long_process",
            medialEndpoint: "stapes_capitulum",
          }
        : layer,
    );
    const reconstructionId = plan.layers.find(
      (layer) => layer.kind === "ossicular_reconstruction",
    )?.id;

    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="procedure" />);

    expect(
      container.querySelector('[data-reconstruction-rendering="bone-cement-bridge"]'),
    ).toHaveAttribute("data-reconstruction-lateral-target", "incus_erosion_stump");
    expect(
      container.querySelector(`[data-medical-callout-leader="${reconstructionId}"]`),
    ).toHaveAttribute("data-callout-target-source", "148.500,184.000");
  });

  it("attaches a malleus-routed stapes piston to the manubrium", () => {
    const plan = createPresetPlan("stapes_surgery");
    plan.layers = plan.layers.map((layer) =>
      layer.kind === "stapes_procedure" ? { ...layer, pistonAttachment: "malleus" } : layer,
    );
    const stapesProcedureId = plan.layers.find((layer) => layer.kind === "stapes_procedure")?.id;

    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="procedure" />);

    expect(container.querySelector("[data-stapes-piston-attachment-target]")).toHaveAttribute(
      "data-stapes-piston-attachment-target",
      "malleus_manubrium",
    );
    expect(
      container.querySelector(`[data-medical-callout-leader="${stapesProcedureId}"]`),
    ).toHaveAttribute("data-callout-target-source", "148.500,189.000");
  });

  it("leaves unsupported tube devices and mobile ossicles unillustrated", () => {
    const tubePlan = createPresetPlan("myringotomy_tympanostomy");
    const tubeId = tubePlan.layers.find((layer) => layer.kind === "tympanostomy")?.id;
    tubePlan.layers = tubePlan.layers.map((layer) =>
      layer.kind === "tympanostomy" ? { ...layer, tubeType: "t_tube" } : layer,
    );
    const tube = render(<MedicalIllustrationDiagram plan={tubePlan} phase="procedure" />);
    expect(tube.container.querySelector('[data-tympanostomy-rendering="tube-placed"]')).toBeNull();
    expect(
      tube.container.querySelector(`[data-medical-unillustrated-layer="${tubeId}"]`),
    ).toHaveTextContent(/Not illustrated/i);
    tube.unmount();

    const mobilePlan = createPresetPlan("ossiculoplasty");
    const mobileId = mobilePlan.layers.find((layer) => layer.kind === "ossicle_state")?.id;
    mobilePlan.layers = mobilePlan.layers.map((layer) =>
      layer.kind === "ossicle_state" ? { ...layer, state: "mobile" } : layer,
    );
    const mobile = render(<MedicalIllustrationDiagram plan={mobilePlan} phase="finding" />);
    expect(mobile.container.querySelector('[data-anatomy-layer="ossicle_state"]')).toBeNull();
    expect(
      mobile.container.querySelector(`[data-medical-unillustrated-layer="${mobileId}"]`),
    ).toHaveTextContent(/Not illustrated/i);
  });

  it("derives official component omissions from supported spatial layers in a mixed plan", () => {
    const preset = createPresetPlan("ossiculoplasty");
    const incus = preset.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "ossicle_state" }> =>
        layer.kind === "ossicle_state",
    );
    expect(incus).toBeDefined();
    if (!incus) return;

    const unsupportedBodyErosion = {
      ...incus,
      id: "unsupported-incus-body-erosion",
      state: "body_eroded" as const,
    };
    const supportedAbsence = {
      ...incus,
      id: "supported-incus-absence",
      state: "absent" as const,
    };
    const plan = {
      ...preset,
      layers: [
        unsupportedBodyErosion,
        supportedAbsence,
        ...preset.layers.filter((layer) => layer.id !== incus.id),
      ],
    };

    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="finding" />);
    const svg = container.querySelector(".medical-illustration-svg");

    expect(container.querySelectorAll('[data-anatomy-component="incus"]')).toHaveLength(0);
    expect(
      container.querySelector('[data-medical-callout="supported-incus-absence"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-medical-callout="unsupported-incus-body-erosion"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(
        '[data-medical-unillustrated-layer="unsupported-incus-body-erosion"]',
      ),
    ).toHaveTextContent(/Not illustrated/i);
    expect(
      container.querySelector('[data-mobile-unillustrated-layer="unsupported-incus-body-erosion"]'),
    ).toHaveTextContent(/Not illustrated/i);
    expect(svg).toHaveAttribute("data-spatial-callout-count", "1");
    expect(svg).toHaveAttribute("data-nonspatial-layer-count", "1");
    expect(svg).toHaveAttribute("data-unillustrated-layer-count", "1");
    expect(container.querySelector(".medical-panel-count")).toHaveTextContent("2");
  });

  it("masks only supported perforations when supported and undocumented geometry coexist", () => {
    const preset = createPresetPlan("tympanoplasty");
    const perforation = preset.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "tm_perforation" }> =>
        layer.kind === "tm_perforation",
    );
    expect(perforation).toBeDefined();
    if (!perforation) return;

    const undocumentedGeometry = {
      ...perforation,
      id: "undocumented-perforation-geometry",
      region: "not_documented" as const,
      geometry: undefined,
    };
    const plan = {
      ...preset,
      layers: [undocumentedGeometry, ...preset.layers],
    };

    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="finding" />);
    const anatomyMask = container.querySelector('mask[id$="-anatomy-mask"]');
    const tympanicMask = container.querySelector('mask[id$="-tympanic-membrane"]');
    const anatomyRemovalGroups = Array.from(anatomyMask?.children ?? []).filter(
      (child) => child.tagName.toLowerCase() === "g",
    );

    expect(anatomyRemovalGroups).toHaveLength(1);
    expect(tympanicMask?.querySelectorAll("path")).toHaveLength(1);
    expect(
      container.querySelector(`[data-medical-callout="${perforation.id}"]`),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-medical-callout="undocumented-perforation-geometry"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(
        '[data-medical-unillustrated-layer="undocumented-perforation-geometry"]',
      ),
    ).toHaveTextContent(/Not illustrated/i);
    expect(
      container.querySelector('image[href="/medical-art/servier/ear-cutaway.png"]'),
    ).toHaveAttribute("mask", expect.stringMatching(/anatomy-mask/));
  });

  it("renders every documented layer without silently truncating complex cases", () => {
    const preset = createPresetPlan("ossiculoplasty");
    const finding = preset.layers.find((layer) => layer.kind === "ossicle_state");
    expect(finding).toBeDefined();
    if (!finding) return;
    const plan = {
      ...preset,
      layers: Array.from({ length: 9 }, (_, index) => ({
        ...finding,
        id: `audited-finding-${index + 1}`,
      })),
    };

    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="finding" />);

    expect(container.querySelectorAll('[data-anatomy-layer="ossicle_state"]')).toHaveLength(9);
    expect(container.querySelectorAll('g[role="button"]')).toHaveLength(0);

    const svg = container.querySelector(".medical-illustration-svg");
    const legend = container.querySelector(".medical-panel-legend-bg");
    const legendRows = container.querySelectorAll(".medical-panel-legend-row > rect");
    const lastRow = legendRows.item(legendRows.length - 1);
    const viewBoxHeight = Number(svg?.getAttribute("viewBox")?.split(" ")[3]);
    const legendBottom = Number(legend?.getAttribute("y")) + Number(legend?.getAttribute("height"));
    const lastRowBottom =
      Number(lastRow.getAttribute("y")) + Number(lastRow.getAttribute("height"));

    expect(svg).toHaveAttribute("data-visible-layer-count", "9");
    expect(svg).toHaveAttribute("data-spatial-callout-count", "9");
    expect(container.querySelectorAll("[data-medical-callout]")).toHaveLength(9);
    expect(container.querySelectorAll("[data-medical-callout-leader]")).toHaveLength(9);
    expect(
      Array.from(container.querySelectorAll("[data-medical-callout]")).map((callout) =>
        Number(callout.getAttribute("data-callout-legend-number")),
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(viewBoxHeight).toBeGreaterThan(620);
    expect(lastRowBottom).toBeLessThanOrEqual(legendBottom);
  });

  it("uses one shared ordinal for every spatial badge, overlay, and legend row", () => {
    const plan = createPresetPlan("ossiculoplasty");
    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="procedure" />);
    const svg = container.querySelector(".medical-illustration-svg");
    const badges = Array.from(container.querySelectorAll<SVGGElement>("[data-medical-callout]"));
    const legendRows = Array.from(
      container.querySelectorAll<SVGGElement>("[data-medical-legend-layer]"),
    );
    const overlays = Array.from(container.querySelectorAll<SVGGElement>("[data-anatomy-layer]"));
    const visibleTerminals = Array.from(
      container.querySelectorAll<SVGGElement>("[data-medical-callout-visible-terminal]"),
    );
    const mobileRows = Array.from(
      container.querySelectorAll<HTMLLIElement>("[data-mobile-callout-layer]"),
    );

    expect(svg).toHaveAttribute("data-visible-layer-count", "2");
    expect(svg).toHaveAttribute("data-spatial-callout-count", "2");
    expect(svg).toHaveAttribute("data-nonspatial-layer-count", "1");
    expect(badges).toHaveLength(2);
    expect(legendRows).toHaveLength(2);
    expect(overlays).toHaveLength(2);
    expect(visibleTerminals).toHaveLength(2);
    expect(mobileRows).toHaveLength(2);

    for (const badge of badges) {
      const layerId = badge.dataset.layerId;
      const ordinal = badge.dataset.calloutLegendNumber;
      expect(layerId).toBeTruthy();
      expect(legendRows.find((row) => row.dataset.layerId === layerId)).toHaveAttribute(
        "data-legend-number",
        ordinal,
      );
      expect(overlays.find((overlay) => overlay.dataset.layerId === layerId)).toHaveAttribute(
        "data-legend-number",
        ordinal,
      );
      expect(mobileRows.find((row) => row.dataset.layerId === layerId)).toHaveAttribute(
        "data-legend-number",
        ordinal,
      );
      expect(
        visibleTerminals.find(
          (terminal) => terminal.dataset.medicalCalloutVisibleTerminal === layerId,
        ),
      ).toHaveAttribute("data-callout-legend-number", ordinal);
    }
    expect(
      container.querySelector('[data-medical-legend-layer*="verification"]'),
    ).not.toBeInTheDocument();

    const leaderGroup = container.querySelector(
      '[data-callout-render-order="beneath-anatomy-and-overlays"]',
    );
    const anatomyGroup = container.querySelector("[data-anatomy-source-transform]");
    const terminalGroup = container.querySelector(
      '[data-callout-terminal-render-order="above-anatomy-beneath-overlays"]',
    );
    const firstOverlay = container.querySelector("[data-anatomy-layer]");
    expect(
      leaderGroup?.compareDocumentPosition(anatomyGroup as Node) ??
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      anatomyGroup?.compareDocumentPosition(terminalGroup as Node) ??
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      terminalGroup?.compareDocumentPosition(firstOverlay as Node) ??
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("announces matching callout ordinals on interactive anatomy and legend controls", () => {
    const plan = createPresetPlan("ossiculoplasty");
    const { container } = render(
      <MedicalIllustrationDiagram plan={plan} phase="procedure" onLayerSelect={() => undefined} />,
    );

    for (const badge of container.querySelectorAll<SVGGElement>("[data-medical-callout]")) {
      const layerId = badge.dataset.layerId;
      const ordinal = badge.dataset.calloutLegendNumber;
      expect(layerId).toBeTruthy();
      expect(ordinal).toBeTruthy();
      expect(
        container.querySelector(`[data-anatomy-layer][data-layer-id="${layerId}"]`),
      ).toHaveAccessibleName(expect.stringMatching(new RegExp(`^Callout ${ordinal}:`)));
      expect(
        container.querySelector(`[data-medical-legend-layer="${layerId}"]`),
      ).toHaveAccessibleName(expect.stringMatching(new RegExp(`^Callout ${ordinal}:`)));
    }
  });

  it("mirrors laterality around the source-image axis without changing native placement", () => {
    const rightPlan = createPresetPlan("ossiculoplasty");
    const reconstructionId = rightPlan.layers.find(
      (layer) => layer.kind === "ossicular_reconstruction",
    )?.id;
    expect(reconstructionId).toBeDefined();
    const leftPlan = {
      ...rightPlan,
      laterality: "left" as const,
      layers: rightPlan.layers.map((layer) => ({
        ...layer,
        side: "left" as const,
      })),
    };

    const right = render(<MedicalIllustrationDiagram plan={rightPlan} phase="procedure" />);
    const rightProsthesis = right.container.querySelector('[data-prosthesis-method="porp"]');
    const sourcePlacement = {
      headplate: rightProsthesis?.getAttribute("data-prosthesis-headplate-source"),
      distal: rightProsthesis?.getAttribute("data-prosthesis-distal-source"),
      shaftStart: rightProsthesis?.getAttribute("data-prosthesis-shaft-start-source"),
      shaftEnd: rightProsthesis?.getAttribute("data-prosthesis-shaft-end-source"),
    };
    const rightCalloutTarget = right.container
      .querySelector(`[data-medical-callout-leader="${reconstructionId}"]`)
      ?.getAttribute("data-callout-target");
    const rightBadgeCenter = right.container
      .querySelector(`[data-medical-callout="${reconstructionId}"]`)
      ?.getAttribute("data-callout-badge-center");
    expect(
      right.container.querySelector('[data-anatomy-orientation="source-right"]'),
    ).toBeInTheDocument();
    expect(right.container.querySelector("[data-anatomy-source-transform]")).toHaveAttribute(
      "data-anatomy-source-transform",
      "identity",
    );
    right.unmount();

    const left = render(<MedicalIllustrationDiagram plan={leftPlan} phase="procedure" />);
    const leftProsthesis = left.container.querySelector('[data-prosthesis-method="porp"]');
    expect(
      left.container.querySelector('[data-anatomy-orientation="mirrored-left"]'),
    ).toBeInTheDocument();
    expect(left.container.querySelector("[data-anatomy-source-transform]")).toHaveAttribute(
      "data-anatomy-source-transform",
      "translate(644 0) scale(-1 1)",
    );
    expect({
      headplate: leftProsthesis?.getAttribute("data-prosthesis-headplate-source"),
      distal: leftProsthesis?.getAttribute("data-prosthesis-distal-source"),
      shaftStart: leftProsthesis?.getAttribute("data-prosthesis-shaft-start-source"),
      shaftEnd: leftProsthesis?.getAttribute("data-prosthesis-shaft-end-source"),
    }).toEqual(sourcePlacement);
    const leftCalloutTarget = left.container
      .querySelector(`[data-medical-callout-leader="${reconstructionId}"]`)
      ?.getAttribute("data-callout-target");
    const leftBadgeCenter = left.container
      .querySelector(`[data-medical-callout="${reconstructionId}"]`)
      ?.getAttribute("data-callout-badge-center");
    expect(rightCalloutTarget).toBeTruthy();
    expect(leftCalloutTarget).toBeTruthy();
    if (rightCalloutTarget && leftCalloutTarget) {
      const [rightX, rightY] = rightCalloutTarget.split(",").map(Number);
      const [leftX, leftY] = leftCalloutTarget.split(",").map(Number);
      expect(leftX + rightX).toBeCloseTo(644, 3);
      expect(leftY).toBe(rightY);
    }
    expect(leftBadgeCenter).toBe(rightBadgeCenter);
  });

  it("places a neutral PORP from the protected TM headplate to the capitulum", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    const prosthesis = container.querySelector('[data-prosthesis-method="porp"]');
    expect(prosthesis).toHaveAttribute("data-prosthesis-medial-endpoint", "stapes_capitulum");
    expect(prosthesis).toHaveAttribute(
      "data-prosthesis-rendering",
      "neutral-headplate-shaft-capitulum-seat",
    );
    expect(prosthesis).toHaveAttribute(
      "data-prosthesis-calibration",
      "servier-inner-ear-layered-2026-07",
    );
    expect(prosthesis).toHaveAttribute("data-prosthesis-source-space", "584x370");
    expect(prosthesis).toHaveAttribute("data-prosthesis-headplate-source", "60.434,249.879");
    expect(prosthesis).toHaveAttribute("data-prosthesis-distal-source", "181.000,211.000");
    expect(prosthesis).toHaveAttribute(
      "data-prosthesis-depth-order",
      "tm-cartilage-headplate-shaft-stapes",
    );
    expect(prosthesis?.getAttribute("data-prosthesis-rendering")).not.toMatch(/cup|shoe/);

    const protectionGraft = container.querySelector('[data-medical-graft="prosthesis-protection"]');
    expect(protectionGraft).toHaveAttribute(
      "data-graft-calibration",
      "servier-inner-ear-layered-2026-07",
    );
    expect(protectionGraft).toHaveAttribute("data-graft-source-center", "56.936,251.818");
    expect(protectionGraft).toHaveAttribute("data-graft-source-radii", "17,10");
    expect(protectionGraft).toHaveAttribute("data-graft-depth-order", "tm-cartilage-headplate");
    expect(
      container.querySelector('[data-anatomy-education-treatment="translucent-foreground"]'),
    ).toHaveAttribute("opacity", "0.52");

    expect(container.querySelectorAll('[data-anatomy-component="incus"]')).toHaveLength(0);
    expect(
      container.querySelectorAll(
        '[data-anatomy-component="stapes"][data-anatomy-component-state="intact"]',
      ),
    ).toHaveLength(2);
    expect(
      container.querySelector('image[href="/medical-art/servier/inner-ear.png"]'),
    ).not.toBeInTheDocument();
    expect(container.querySelector('image[mask*="anatomy-mask"]')).not.toBeInTheDocument();
  });

  it("uses neutral TORP contact on the retained official footplate without inventing a shoe", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("torp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    const prosthesis = container.querySelector('[data-prosthesis-method="torp"]');
    expect(prosthesis).toHaveAttribute("data-prosthesis-medial-endpoint", "stapes_footplate");
    expect(prosthesis).toHaveAttribute(
      "data-prosthesis-rendering",
      "neutral-headplate-shaft-footplate-contact",
    );
    expect(prosthesis).toHaveAttribute(
      "data-prosthesis-calibration",
      "servier-inner-ear-layered-2026-07",
    );
    expect(prosthesis).toHaveAttribute("data-prosthesis-headplate-source", "60.434,249.879");
    expect(prosthesis).toHaveAttribute("data-prosthesis-distal-source", "236.000,180.000");
    expect(prosthesis).toHaveAttribute(
      "data-prosthesis-depth-order",
      "tm-cartilage-headplate-shaft-stapes",
    );
    expect(prosthesis?.getAttribute("data-prosthesis-rendering")).not.toMatch(/cup|shoe/);

    const retainedFootplates = container.querySelectorAll(
      '[data-anatomy-component="stapes"][data-anatomy-component-state="footplate-only"]',
    );
    expect(retainedFootplates).toHaveLength(2);
    for (const footplate of retainedFootplates) {
      expect(footplate.getAttribute("clip-path")).toMatch(/stapes-footplate/);
      expect(footplate).not.toHaveAttribute("mask");
    }
    expect(container.querySelectorAll('[data-anatomy-component="incus"]')).toHaveLength(0);
    expect(
      container.querySelector('image[href="/medical-art/servier/inner-ear.png"]'),
    ).not.toBeInTheDocument();
    expect(container.querySelector('image[mask*="anatomy-mask"]')).not.toBeInTheDocument();
  });

  it("does not let an unsupported stapedectomy mutate the official stapes component", () => {
    const preset = createPresetPlan("stapes_surgery");
    const stapedotomy = preset.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "stapes_procedure" }> =>
        layer.kind === "stapes_procedure",
    );
    expect(stapedotomy).toBeDefined();
    if (!stapedotomy) return;

    const unsupportedStapedectomy = {
      ...stapedotomy,
      id: "unsupported-stapedectomy",
      technique: "stapedectomy" as const,
    };
    const withoutSupportedAction = {
      ...preset,
      layers: preset.layers.map((layer) =>
        layer.id === stapedotomy.id ? unsupportedStapedectomy : layer,
      ),
    };

    const unsupported = render(
      <MedicalIllustrationDiagram plan={withoutSupportedAction} phase="procedure" />,
    );
    expect(
      unsupported.container.querySelectorAll(
        '[data-anatomy-component="stapes"][data-anatomy-component-state="footplate-only"]',
      ),
    ).toHaveLength(0);
    expect(
      unsupported.container.querySelectorAll(
        '[data-anatomy-component="stapes"][data-anatomy-component-state="intact"]',
      ),
    ).toHaveLength(1);
    expect(
      unsupported.container.querySelector('[data-medical-callout="unsupported-stapedectomy"]'),
    ).not.toBeInTheDocument();
    expect(
      unsupported.container.querySelector(
        '[data-medical-unillustrated-layer="unsupported-stapedectomy"]',
      ),
    ).toHaveTextContent(/Not illustrated/i);
    unsupported.unmount();

    const unsupportedPanel = render(
      <DiagramPanel
        surgeryPlan={withoutSupportedAction}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );
    expect(
      unsupportedPanel.container.querySelector(
        '[data-medical-unillustrated-layer="unsupported-stapedectomy"]',
      ),
    ).toHaveTextContent(/Not illustrated/i);
    expect(
      screen.getByRole("region", { name: /Procedure: Middle and inner ear/i }),
    ).toBeInTheDocument();
    unsupportedPanel.unmount();

    const mixedPlan = {
      ...preset,
      layers: [
        unsupportedStapedectomy,
        stapedotomy,
        ...preset.layers.filter((layer) => layer.id !== stapedotomy.id),
      ],
    };
    const mixed = render(<MedicalIllustrationDiagram plan={mixedPlan} phase="procedure" />);
    expect(
      mixed.container.querySelectorAll(
        '[data-anatomy-component="stapes"][data-anatomy-component-state="footplate-only"]',
      ),
    ).toHaveLength(1);
    expect(
      mixed.container.querySelector(`[data-medical-callout="${stapedotomy.id}"]`),
    ).toBeInTheDocument();
    expect(
      mixed.container.querySelector('[data-medical-callout="unsupported-stapedectomy"]'),
    ).not.toBeInTheDocument();
    expect(
      mixed.container.querySelector(
        '[data-medical-unillustrated-layer="unsupported-stapedectomy"]',
      ),
    ).toHaveTextContent(/Not illustrated/i);
  });

  it("keeps an aborted stapedotomy from altering the final stapes anatomy", () => {
    const preset = createPresetPlan("stapes_surgery");
    const stapedotomy = preset.layers.find(
      (layer): layer is Extract<SurgeryLayer, { kind: "stapes_procedure" }> =>
        layer.kind === "stapes_procedure",
    );
    expect(stapedotomy).toBeDefined();
    if (!stapedotomy) return;

    const aborted: Extract<SurgeryLayer, { kind: "intraoperative_deviation" }> = {
      id: "aborted-stapedotomy",
      side: stapedotomy.side,
      documentation: "documented",
      evidence: [],
      enteredBy: "clinician",
      kind: "intraoperative_deviation",
      role: "deviation",
      deviation: "aborted",
      affectedLayerIds: [stapedotomy.id],
    };
    const plan = {
      ...preset,
      layers: [...preset.layers, aborted],
    };

    const { container } = render(<MedicalIllustrationDiagram plan={plan} phase="procedure" />);

    expect(
      container.querySelectorAll(
        '[data-anatomy-component="stapes"][data-anatomy-component-state="footplate-only"]',
      ),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(
        '[data-anatomy-component="stapes"][data-anatomy-component-state="intact"]',
      ),
    ).toHaveLength(1);
    expect(
      container.querySelector('[data-anatomy-layer="stapes_procedure"]'),
    ).not.toBeInTheDocument();
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

    expect(
      screen.getByText(/The reconstruction endpoints are not fully documented/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Procedure: Middle and inner ear/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /sources and limitations/i })).toHaveTextContent(
      /Calibrated structured overlays/i,
    );
  });

  it("keeps every synthetic case connected to an evidence map and medical-art source", () => {
    for (const fixture of syntheticCases) {
      const { container, unmount } = render(
        <DiagramPanel
          operativeCase={fixture.expected}
          selectedFeatureId={null}
          onFeatureSelect={() => undefined}
        />,
      );
      const evidenceFeatureIds = new Set(
        buildFeatureMap(fixture.expected).map((feature) => feature.id),
      );
      expect(evidenceFeatureIds.size).toBeGreaterThan(0);
      expect(container.querySelector("[data-medical-illustration]")).toBeInTheDocument();
      unmount();
    }
  });
});
