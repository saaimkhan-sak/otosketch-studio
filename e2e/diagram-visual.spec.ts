import { expect, test, type Page } from "@playwright/test";

interface DiagramExpectation {
  caseId: string;
  phaseCount: 1 | 2;
}

interface SurgeryPresetExpectation {
  presetId:
    | "myringotomy_tympanostomy"
    | "tympanoplasty"
    | "ossiculoplasty"
    | "tympanomastoidectomy"
    | "stapes_surgery"
    | "cochlear_implant"
    | "bone_conduction_implant"
    | "canalplasty"
    | "eustachian_tube_dilation";
  assetId: "nih-inner-ear" | "servier-ear-cutaway" | "servier-inner-ear";
  phaseCount: 1 | 2;
}

const canonicalCases: DiagramExpectation[] = [
  { caseId: "normal-ossicular-chain", phaseCount: 2 },
  { caseId: "incus-long-process-erosion", phaseCount: 2 },
  { caseId: "is-joint-discontinuity", phaseCount: 1 },
  { caseId: "hero-otomimix-is-joint", phaseCount: 2 },
  { caseId: "porp-reconstruction", phaseCount: 2 },
  { caseId: "torp-reconstruction", phaseCount: 2 },
];

const fixtureNotePattern: Record<string, RegExp> = {
  "normal-ossicular-chain": /underlay temporalis fascia graft/i,
  "incus-long-process-erosion": /long process of the incus was eroded/i,
  "is-joint-discontinuity": /discontinuity at the incudostapedial joint/i,
  "hero-otomimix-is-joint": /OtoMimix bone cement/i,
  "porp-reconstruction": /partial ossicular replacement prosthesis/i,
  "torp-reconstruction": /total ossicular replacement prosthesis/i,
};

const commonSurgeryPresets: SurgeryPresetExpectation[] = [
  {
    presetId: "myringotomy_tympanostomy",
    assetId: "servier-ear-cutaway",
    phaseCount: 1,
  },
  {
    presetId: "tympanoplasty",
    assetId: "servier-ear-cutaway",
    phaseCount: 2,
  },
  {
    presetId: "ossiculoplasty",
    assetId: "servier-inner-ear",
    phaseCount: 2,
  },
  {
    presetId: "tympanomastoidectomy",
    assetId: "servier-ear-cutaway",
    phaseCount: 2,
  },
  {
    presetId: "stapes_surgery",
    assetId: "servier-inner-ear",
    phaseCount: 2,
  },
  {
    presetId: "cochlear_implant",
    assetId: "nih-inner-ear",
    phaseCount: 1,
  },
  {
    presetId: "bone_conduction_implant",
    assetId: "servier-ear-cutaway",
    phaseCount: 1,
  },
  {
    presetId: "canalplasty",
    assetId: "servier-ear-cutaway",
    phaseCount: 1,
  },
  {
    presetId: "eustachian_tube_dilation",
    assetId: "servier-ear-cutaway",
    phaseCount: 1,
  },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 900 },
];

async function generateCase(page: Page, caseId: string) {
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Example case").selectOption(caseId);
  await expect(page.getByLabel("Operative note")).toHaveValue(fixtureNotePattern[caseId]);
  await page.getByRole("button", { name: "Build diagram" }).click();
  await expect(page.getByRole("heading", { name: "Diagram" })).toBeVisible();
}

async function generateSurgeryPreset(page: Page, presetId: SurgeryPresetExpectation["presetId"]) {
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Build manually" }).click();
  await page.getByLabel("Synthetic surgery example").selectOption(presetId);
  await expect(page.getByRole("heading", { name: "Diagram" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function diagramPreview(page: Page) {
  return page
    .locator("section.no-print", {
      has: page.getByRole("heading", { name: "Diagram" }),
    })
    .first();
}

for (const viewport of viewports) {
  test.describe(`diagram visual regression at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const diagramCase of canonicalCases) {
      test(`${diagramCase.caseId}`, async ({ page }) => {
        await generateCase(page, diagramCase.caseId);
        const preview = diagramPreview(page);

        await expect(preview.locator(".medical-illustration-svg")).toHaveCount(
          diagramCase.phaseCount,
        );
        await expect(preview.locator('[data-diagram-source="open-medical-art"]')).toBeVisible();
        await expect(preview.locator("image[data-medical-art-source]")).toHaveCount(
          diagramCase.phaseCount,
        );
        await expect(
          preview.locator('image[data-medical-art-source*="otosurgeryatlas"]'),
        ).toHaveCount(0);
        await expect(preview.getByText(/Resolve the conflicting selections/i)).toHaveCount(0);
        await expect(preview.locator(".medical-panel-legend-bg")).toHaveCount(
          diagramCase.phaseCount,
        );

        await preview.scrollIntoViewIfNeeded();
        await expect(preview).toHaveScreenshot(`${diagramCase.caseId}-${viewport.name}.png`, {
          animations: "disabled",
          maxDiffPixelRatio: 0.02,
        });
      });
    }

    for (const surgeryPreset of commonSurgeryPresets) {
      test(`common surgery preset · ${surgeryPreset.presetId}`, async ({ page }) => {
        await generateSurgeryPreset(page, surgeryPreset.presetId);
        const preview = diagramPreview(page);
        const diagrams = preview.locator(".medical-illustration-svg");

        await expect(diagrams).toHaveCount(surgeryPreset.phaseCount);
        await expect(
          preview.locator(`[data-medical-illustration="${surgeryPreset.assetId}"]`),
        ).toHaveCount(surgeryPreset.phaseCount);
        await expect(preview.locator('[data-anatomy-layer="verification_status"]')).toHaveCount(0);
        await expect(preview.locator(".medical-panel-hotspot").first()).toBeVisible();
        await expect(preview.getByText(/Resolve the conflicting selections/i)).toHaveCount(0);

        const phases = preview.locator(".medical-illustration-phases").first();
        await phases.scrollIntoViewIfNeeded();
        await expect(phases).toHaveScreenshot(
          `common-${surgeryPreset.presetId}-${viewport.name}.png`,
          {
            animations: "disabled",
            maxDiffPixelRatio: 0.01,
          },
        );
      });
    }
  });
}
