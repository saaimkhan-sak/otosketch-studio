import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SurgeryBuilder } from "@/components/app/SurgeryBuilder";
import {
  createDefaultLayer,
  createEmptySurgeryPlan,
  layerCatalog,
  normalizeSurgeryPlan,
  procedureCatalog,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";

function BuilderHarness({
  initialPlan,
  onPlanChange,
}: {
  initialPlan: SurgeryPlan;
  onPlanChange: (plan: SurgeryPlan) => void;
}) {
  const [plan, setPlan] = useState(initialPlan);
  return (
    <SurgeryBuilder
      plan={plan}
      onChange={(next) => {
        setPlan(next);
        onPlanChange(next);
      }}
    />
  );
}

describe("SurgeryBuilder", () => {
  it("groups common procedures and supports a documented multi-selection", async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    render(
      <BuilderHarness initialPlan={createEmptySurgeryPlan()} onPlanChange={onPlanChange} />,
    );

    const procedureSummary = screen.getByText("Procedures").closest("summary");
    expect(procedureSummary).not.toBeNull();
    await user.click(procedureSummary!);
    expect(screen.getByRole("region", { name: "Hearing implants" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Eardrum and pressure" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Cochlear implantation" }));
    await user.click(screen.getByRole("checkbox", { name: "Bone-conduction hearing implant" }));
    const changed = onPlanChange.mock.lastCall?.[0] as SurgeryPlan;
    expect(changed.procedureFamilies).toEqual(["cochlear_implant", "bone_conduction_implant"]);
    expect(changed.baseViews).toEqual([
      "cochlea_implant_path",
      "postauricular_implant",
    ]);
    expect(changed.review).toEqual({ status: "draft_unreviewed" });
  });

  it("provides a clinically coherent demonstrable preset for every common family", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SurgeryBuilder plan={createEmptySurgeryPlan()} onChange={onChange} />);
    const preset = screen.getByLabelText("Synthetic surgery example");

    expect(within(preset).getAllByRole("option")).toHaveLength(procedureCatalog.length + 1);
    for (const procedure of procedureCatalog) {
      await user.selectOptions(preset, procedure.id);
      const selectedPlan = onChange.mock.lastCall?.[0] as SurgeryPlan;
      expect(selectedPlan.procedureFamilies).toEqual([procedure.id]);
      expect(selectedPlan.baseViews).toEqual(procedure.defaultBaseViews);
      expect(selectedPlan.layers.length, procedure.id).toBeGreaterThan(0);
      expect(selectedPlan.review).toEqual({ status: "draft_unreviewed" });
      expect(
        selectedPlan.layers.every(
          (layer) =>
            layer.documentation === "documented" &&
            layer.enteredBy === "clinician" &&
            layer.evidence.length === 0,
        ),
        procedure.id,
      ).toBe(true);
      expect(
        normalizeSurgeryPlan(selectedPlan).issues.filter((issue) => issue.level === "blocking"),
        procedure.id,
      ).toEqual([]);
    }
  });

  it("keeps the chosen common procedure visible in the controlled select", async () => {
    const user = userEvent.setup();
    render(
      <BuilderHarness initialPlan={createEmptySurgeryPlan()} onPlanChange={vi.fn()} />,
    );

    const preset = screen.getByLabelText("Synthetic surgery example");
    await user.selectOptions(preset, "ossiculoplasty");
    expect(preset).toHaveValue("ossiculoplasty");
  });

  it("builds the tympanoplasty preset with an organic perforation and a larger contour-matched graft", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SurgeryBuilder plan={createEmptySurgeryPlan()} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Synthetic surgery example"), "tympanoplasty");
    const selectedPlan = onChange.mock.lastCall?.[0] as SurgeryPlan;
    const perforation = selectedPlan.layers.find(
      (layer) => layer.kind === "tm_perforation",
    );
    const graft = selectedPlan.layers.find((layer) => layer.kind === "tm_graft");

    expect(perforation?.geometry?.basis).toBe("generic_template");
    expect(graft?.geometry?.basis).toBe("generic_template");
    expect(perforation?.geometry?.points.length).toBeGreaterThanOrEqual(8);
    expect(graft?.geometry?.points).toHaveLength(perforation?.geometry?.points.length ?? 0);

    const perforationPoints = perforation?.geometry?.points ?? [];
    const graftPoints = graft?.geometry?.points ?? [];
    expect(new Set(perforationPoints.map((point) => point.x)).size).toBeGreaterThan(2);
    expect(new Set(perforationPoints.map((point) => point.y)).size).toBeGreaterThan(2);

    const center = perforationPoints.reduce(
      (sum, point) => ({
        x: sum.x + point.x / perforationPoints.length,
        y: sum.y + point.y / perforationPoints.length,
      }),
      { x: 0, y: 0 },
    );
    for (const [index, point] of perforationPoints.entries()) {
      const graftPoint = graftPoints[index];
      expect(graftPoint).toBeDefined();
      expect(Math.hypot(graftPoint.x - center.x, graftPoint.y - center.y)).toBeGreaterThan(
        Math.hypot(point.x - center.x, point.y - center.y),
      );
    }
  });

  it("adds a not-documented layer, records manual choices, and removes it", async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    render(
      <BuilderHarness initialPlan={createEmptySurgeryPlan()} onPlanChange={onPlanChange} />,
    );

    await user.selectOptions(screen.getByLabelText("Findings layer type"), "tm_perforation");
    await user.click(screen.getByRole("button", { name: "Add finding" }));

    expect(screen.getByLabelText("Region")).toHaveValue("not_documented");
    expect(screen.getByLabelText("Documented")).not.toBeChecked();

    await user.selectOptions(screen.getByLabelText("Region"), "central");
    let changed = onPlanChange.mock.lastCall?.[0] as SurgeryPlan;
    const perforation = changed.layers.find((layer) => layer.kind === "tm_perforation");
    expect(perforation).toMatchObject({
      region: "central",
      documentation: "documented",
      enteredBy: "clinician",
      evidence: [],
    });
    expect(changed.review).toEqual({ status: "draft_unreviewed" });

    await user.click(screen.getByRole("button", { name: "Remove Eardrum perforation 1" }));
    changed = onPlanChange.mock.lastCall?.[0] as SurgeryPlan;
    expect(changed.layers).toEqual([]);
  });

  it("keeps intraoperative management text separate from generated anatomy", async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    render(
      <BuilderHarness initialPlan={createEmptySurgeryPlan()} onPlanChange={onPlanChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Add change" }));
    await user.selectOptions(screen.getByLabelText("Change"), "procedure_changed");
    await user.type(screen.getByLabelText("Management note"), "Converted to a staged procedure.");

    expect(screen.getByText(/does not generate anatomy or a visual layer/i)).toBeInTheDocument();
    const changed = onPlanChange.mock.lastCall?.[0] as SurgeryPlan;
    expect(changed.layers[0]).toMatchObject({
      kind: "intraoperative_deviation",
      deviation: "procedure_changed",
      management: "Converted to a staged procedure.",
      documentation: "documented",
      enteredBy: "clinician",
      evidence: [],
    });
  });

  it("renders controlled subtype fields for every layer kind", () => {
    const plan: SurgeryPlan = {
      ...createEmptySurgeryPlan(),
      procedureFamilies: ["tympanoplasty"],
      layers: layerCatalog.map((entry) => createDefaultLayer(entry.kind)),
    };
    const { container } = render(<SurgeryBuilder plan={plan} onChange={vi.fn()} />);
    const cards = Array.from(container.querySelectorAll(".surgery-builder-layer-card"));

    expect(cards).toHaveLength(layerCatalog.length);
    for (const card of cards) {
      expect(card.querySelectorAll("select, textarea, input[type='checkbox']").length).toBeGreaterThan(2);
    }
  });

  it("labels blocking issues without repeating the expected approval reminder", () => {
    const intact = {
      ...createDefaultLayer("tm_state", "right"),
      documentation: "documented" as const,
      state: "intact" as const,
    };
    const perforation = {
      ...createDefaultLayer("tm_perforation", "right"),
      documentation: "documented" as const,
      region: "central" as const,
    };
    const plan: SurgeryPlan = {
      ...createEmptySurgeryPlan(),
      laterality: "right",
      procedureFamilies: ["tympanoplasty"],
      revisionStatus: "primary",
      sourceSafety: { status: "cleared" },
      layers: [intact, perforation],
    };

    render(<SurgeryBuilder plan={plan} onChange={vi.fn()} />);

    expect(screen.getByText("Blocking")).toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
    expect(
      screen.getByText(/cannot be both intact and perforated in the same finding state/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/requires clinician review before patient-facing export/i)).not.toBeInTheDocument();
  });
});
