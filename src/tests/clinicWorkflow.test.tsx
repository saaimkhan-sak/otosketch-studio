import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app/AppShell";
import { DiagramPanel } from "@/components/diagram/DiagramPanel";
import { createPresetPlan } from "@/components/app/SurgeryBuilder";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("clinic procedure workflow", () => {
  it("uses professional open medical art for postoperative preview", () => {
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(container.querySelector('[data-diagram-source="open-medical-art"]')).toBeInTheDocument();
    expect(container.querySelectorAll(".medical-illustration-svg")).toHaveLength(2);
    expect(container.querySelector('[data-medical-illustration="servier-inner-ear"]')).toBeInTheDocument();
    expect(screen.getAllByText(/Servier Medical Art/i).length).toBeGreaterThan(0);
  });

  it("uses the NIH Illustrator vector for a cochlear-implant clinic preview", () => {
    const { container } = render(
      <DiagramPanel
        surgeryPlan={createPresetPlan("cochlear_implant", "preoperative_education")}
        mode="preoperative_education"
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    expect(container.querySelector('[data-medical-illustration="nih-inner-ear"]')).toBeInTheDocument();
    expect(container.querySelector('image[href="/medical-art/nih/inner-ear.svg"]')).toBeInTheDocument();
    expect(screen.getAllByText(/Ryan Kissinger/i).length).toBeGreaterThan(0);
  });

  it("keeps structured medical-art callouts selectable", () => {
    const onFeatureSelect = vi.fn();
    const { container } = render(
      <DiagramPanel
        operativeCase={getSyntheticCase("porp-reconstruction").expected}
        selectedFeatureId={null}
        onFeatureSelect={onFeatureSelect}
      />,
    );

    const callout = container.querySelector<SVGGElement>(
      '.medical-illustration-svg g[role="button"]',
    );
    expect(callout).not.toBeNull();
    fireEvent.click(callout!);
    expect(onFeatureSelect).toHaveBeenCalled();
  });

  it("opens the diagram dialog with focus and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(
      <DiagramPanel
        surgeryPlan={createPresetPlan("tympanoplasty", "preoperative_education")}
        mode="preoperative_education"
        selectedFeatureId={null}
        onFeatureSelect={() => undefined}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Full screen" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Full-screen diagram preview" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("builds and approves an upcoming tympanoplasty discussion without a note", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole("button", { name: "Upcoming procedure" }));
    expect(screen.queryByRole("tab", { name: "Example" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Operative note")).not.toBeInTheDocument();
    expect(screen.getByText("Structured selections only. Do not enter patient information.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Common planned procedure"), "tympanoplasty");
    expect(screen.getByRole("heading", { name: /Your planned Tympanoplasty/i })).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: /Anatomy: Ear and temporal-bone cutaway/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: /Plan: Ear and temporal-bone cutaway/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Plan may change during surgery/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Reviewer name"), "Synthetic Clinician");
    await user.click(screen.getByLabelText("Planned procedure and side checked"));
    await user.click(screen.getByLabelText("Planned steps match the surgeon discussion"));
    await user.click(screen.getByLabelText("Reference image, overlays, and limitations checked"));
    await user.click(screen.getByLabelText("Clinic handout language reviewed"));

    const approve = screen.getByRole("button", { name: "Approve for patient discussion" });
    expect(approve).toBeEnabled();
    await user.click(approve);
    expect(screen.getAllByText("Approved for patient discussion").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Print / save PDF" })).toBeEnabled();
  });

  it("keeps the selected procedure visible until the clinic plan is reset", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole("button", { name: "Upcoming procedure" }));
    const preset = screen.getByLabelText("Common planned procedure");
    await user.selectOptions(preset, "tympanoplasty");
    expect(preset).toHaveValue("tympanoplasty");
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(preset).toHaveValue("");
    expect(screen.getByRole("heading", { name: "Your planned ear procedure" })).toBeInTheDocument();
  });

  it("does not expose completed-procedure outcomes in the upcoming workflow", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole("button", { name: "Upcoming procedure" }));
    await user.selectOptions(screen.getByLabelText("Common planned procedure"), "cochlear_implant");
    expect(screen.queryByLabelText("Completion")).not.toBeInTheDocument();
  });
});
