import { expect, test, type Page } from "@playwright/test";

async function completeReviewChecklist(page: Page) {
  await page.getByLabel(/Laterality and side labels checked/i).check();
  await page.getByLabel(/Findings match the cited evidence/i).check();
  await page.getByLabel(/Visual layers and limitations checked/i).check();
  await page.getByLabel(/Patient handout copy reviewed/i).check();
}

async function buildExample(page: Page, caseId: string) {
  const fixtureNotePattern: Record<string, RegExp> = {
    "hero-otomimix-is-joint": /OtoMimix bone cement/i,
    "porp-reconstruction": /partial ossicular replacement prosthesis/i,
  };
  await page.goto("/");
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Example case").selectOption(caseId);
  await expect(page.getByLabel("Operative note")).toHaveValue(fixtureNotePattern[caseId]);
  await page.getByRole("button", { name: "Build diagram" }).click();
  await expect(page.getByRole("heading", { name: "Diagram" })).toBeVisible();
}

test("PORP case uses professional medical art and can be reviewed", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Example case").selectOption("porp-reconstruction");
  await expect(page.getByLabel("Operative note")).toHaveValue(/partial ossicular replacement prosthesis/i);
  await page.getByText("View or edit example note").click();
  await expect(page.getByLabel("Operative note")).toHaveValue(/PORP/i);
  await page.getByRole("button", { name: "Build diagram" }).click();

  await expect(page.getByRole("button", { name: /^Incus: Absent$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reconstruction: PORP$/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /Findings: Middle and inner ear/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /Procedure: Middle and inner ear/i })).toBeVisible();
  await expect(page.locator("#preview-verify .medical-illustration-svg")).toHaveCount(2);
  await expect(page.locator('[data-medical-illustration="servier-inner-ear"]')).toHaveCount(2);

  await page
    .getByRole("group", { name: /Sources and limitations/i })
    .locator("summary")
    .click();
  await expect(page.getByText(/Servier Medical Art/i).first()).toBeVisible();
  await expect(page.getByText(/Calibrated structured overlays/i)).toBeVisible();

  await page.getByRole("button", { name: "Full screen" }).click();
  await expect(page.getByRole("dialog", { name: "Full-screen diagram preview" })).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Full-screen diagram preview" }).locator(".medical-illustration-svg"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog", { name: "Full-screen diagram preview" })).toBeHidden();

  await page.getByRole("button", { name: /^Incus: Absent$/i }).click();
  await expect(page.locator("blockquote").filter({ hasText: "The incus was absent" })).toBeVisible();

  await page.getByText("Source extraction fields").click();
  await page.getByText("Review 10 structured fields").click();
  await page.getByLabel("Reconstruction", { exact: true }).selectOption("bone_cement_bridge");
  await expect(page.getByText(/reconstruction endpoints are not fully documented/i).first()).toBeVisible();
  await page.getByLabel("Reconstruction", { exact: true }).selectOption("porp");

  await expect(page.getByRole("button", { name: "Mark reviewed for demo" })).toBeDisabled();
  await completeReviewChecklist(page);
  await expect(page.getByRole("button", { name: "Mark reviewed for demo" })).toBeEnabled();
  await page.getByRole("button", { name: "Mark reviewed for demo" }).click();
  await expect(page.getByText("Reviewed for demo").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test("bone-cement reconstruction remains a distinct deterministic medical-art layer", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await buildExample(page, "hero-otomimix-is-joint");

  const preview = page
    .locator("section.no-print", { has: page.getByRole("heading", { name: "Diagram" }) })
    .first();
  await expect(preview.locator(".medical-illustration-svg")).toHaveCount(2);
  await expect(preview.locator('[data-medical-illustration="servier-inner-ear"]')).toHaveCount(2);
  expect(await preview.locator(".medical-panel-hotspot").count()).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /^Reconstruction: Bone cement bridge$/i })).toBeVisible();

  await page.getByRole("button", { name: /^Reconstruction: Bone cement bridge$/i }).click();
  await expect(
    page.locator("blockquote").filter({ hasText: "OtoMimix bone cement was applied" }),
  ).toBeVisible();

  await completeReviewChecklist(page);
  await expect(page.getByRole("button", { name: "Mark reviewed for demo" })).toBeEnabled();
  await page.getByRole("button", { name: "Mark reviewed for demo" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Export is blocked/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test("manual builder provides every common surgery preset and its required view", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("tab", { name: "Build manually" }).click();

  const presets = [
    ["myringotomy_tympanostomy", "servier-ear-cutaway", 1],
    ["tympanoplasty", "servier-ear-cutaway", 2],
    ["ossiculoplasty", "servier-inner-ear", 2],
    ["tympanomastoidectomy", "servier-ear-cutaway", 2],
    ["stapes_surgery", "servier-inner-ear", 2],
    ["cochlear_implant", "nih-inner-ear", 1],
    ["bone_conduction_implant", "servier-ear-cutaway", 1],
    ["canalplasty", "servier-ear-cutaway", 1],
    ["eustachian_tube_dilation", "servier-ear-cutaway", 1],
  ] as const;

  for (const [preset, asset, phaseCount] of presets) {
    await page.getByLabel("Synthetic surgery example").selectOption(preset);
    await expect(page.locator(".medical-illustration-svg")).toHaveCount(phaseCount);
    await expect(page.locator(`[data-medical-illustration="${asset}"]`)).toHaveCount(
      phaseCount,
    );
    await expect(page.locator('[data-anatomy-layer="verification_status"]')).toHaveCount(0);
    await expect(page.getByText("Resolve the conflicting selections")).toHaveCount(0);
  }

  await page.getByLabel("Synthetic surgery example").selectOption("cochlear_implant");
  const changes = page.locator("details.surgery-builder-layer-group", {
    hasText: "Intraoperative changes",
  });
  await changes.locator("summary").click();
  await changes.getByRole("button", { name: "Add change" }).click();
  await changes.getByLabel("Change", { exact: true }).selectOption("procedure_changed");
  await changes.getByLabel("Management note").fill("Synthetic deviation: alternate insertion route used.");
  await expect(
    page.getByRole("button", { name: /Intraoperative change · Procedure changed/i }).first(),
  ).toBeVisible();
  expect(await page.locator(".medical-panel-hotspot").count()).toBeGreaterThanOrEqual(1);
  expect(pageErrors).toEqual([]);
});

test("contradictory intraoperative selections block a misleading image", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Build manually" }).click();
  await page.getByLabel("Synthetic surgery example").selectOption("tympanomastoidectomy");

  const actions = page.locator("details.surgery-builder-layer-group", {
    hasText: "Actions and implants",
  });
  await actions.locator("summary").click();
  await actions.getByLabel("Actions and implants layer type").selectOption("mastoid_technique");
  await actions.getByRole("button", { name: "Add action or implant" }).click();
  const mastoidCards = actions.locator(".surgery-builder-layer-card", { hasText: "Mastoid technique" });
  await expect(mastoidCards).toHaveCount(2);
  await mastoidCards.nth(1).locator('select[id$="-technique"]').selectOption("canal_wall_down");

  await expect(page.getByText(/Canal-wall-up and canal-wall-down cannot both/i).first()).toBeVisible();
  await expect(page.getByText("Resolve the conflicting selections")).toBeVisible();
  await expect(page.locator("#preview-verify .medical-illustration-svg")).toHaveCount(0);
});

test("cloud mode warns and blocks possible PHI", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("tab", { name: "Paste note" }).click();
  await page.getByText("Advanced").click();
  await page.getByLabel("Extractor").selectOption("cloudflare");
  await expect(page.getByText(/Text is sent to the configured Cloudflare extraction endpoint/i)).toBeVisible();
  await page.getByLabel("Operative note").fill("Patient: Jane Sample. MRN 123456. Left tympanoplasty.");
  await expect(page.getByText(/Possible patient information detected/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Build diagram" })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test("edited note makes current diagram stale until regenerated", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await buildExample(page, "porp-reconstruction");
  await expect(page.getByRole("button", { name: /^Incus: Absent$/i })).toBeVisible();
  await page.getByRole("tab", { name: "Paste note" }).click();
  await page.getByLabel("Operative note").fill("Synthetic operative note. Left tympanoplasty.");
  await expect(page.getByText(/note has changed since the current diagram was generated/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark reviewed for demo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test("print output remains locked until the clinician marks the case reviewed", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await buildExample(page, "porp-reconstruction");
  await completeReviewChecklist(page);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-export-only")).toBeVisible();
  await expect(page.getByText("OtoSketch Studio", { exact: true })).toBeHidden();
  await expect(page.getByText("Synthetic operative note for demonstration only")).toBeHidden();
  await expect(page.locator(".print-disclaimer")).toContainText(
    "unavailable until all review requirements are resolved",
  );

  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: "0.35in", bottom: "0.35in", left: "0.35in", right: "0.35in" },
  });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  const pageObjectCount = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  expect(pageObjectCount).toBe(1);
  expect(pageErrors).toEqual([]);
});
