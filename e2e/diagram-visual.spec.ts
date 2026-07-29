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

const servierPlacement = {
  calibration: "servier-inner-ear-layered-2026-07",
  headplate: "60.434,249.879",
  cartilage: "56.936,251.818",
  cartilageRadii: "17,10",
  porp: {
    distal: "181.000,211.000",
    shaftStart: "64.790,248.474",
    shaftEnd: "177.431,212.151",
    rendering: "neutral-headplate-shaft-capitulum-seat",
  },
  torp: {
    distal: "236.000,180.000",
    shaftStart: "64.646,248.203",
    shaftEnd: "231.496,181.793",
    rendering: "neutral-headplate-shaft-footplate-contact",
  },
} as const;

async function installVisualTestStyles(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal { display: none !important; }
      @media (max-width: 720px) {
        .medical-illustration-panel {
          overflow-x: visible !important;
        }
        .medical-illustration-svg {
          min-width: 0 !important;
          width: 100% !important;
        }
      }
    `,
  });
}

async function generateCase(page: Page, caseId: string) {
  await page.goto("/");
  await installVisualTestStyles(page);
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Example case").selectOption(caseId);
  await expect(page.getByLabel("Operative note")).toHaveValue(fixtureNotePattern[caseId]);
  await page.getByRole("button", { name: "Build diagram" }).click();
  await expect(page.getByRole("heading", { name: "Diagram" })).toBeVisible();
}

async function generateSurgeryPreset(page: Page, presetId: SurgeryPresetExpectation["presetId"]) {
  await page.goto("/");
  await installVisualTestStyles(page);
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

async function expectFullSourceSvgFit(preview: ReturnType<typeof diagramPreview>) {
  const diagrams = preview.locator(".medical-illustration-svg");
  const count = await diagrams.count();

  for (let index = 0; index < count; index += 1) {
    const fit = await diagrams.nth(index).evaluate((svg) => {
      const panel = svg.closest(".medical-illustration-panel");
      if (!(panel instanceof HTMLElement)) {
        throw new Error("Medical illustration SVG is missing its panel.");
      }
      const svgRect = svg.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        svgLeft: svgRect.left,
        svgRight: svgRect.right,
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        viewportWidth: window.innerWidth,
      };
    });

    expect(fit.svgLeft).toBeGreaterThanOrEqual(Math.max(0, fit.panelLeft) - 1);
    expect(fit.svgRight).toBeLessThanOrEqual(
      Math.min(fit.viewportWidth, fit.panelRight) + 1,
    );
  }
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
          preview.locator('[data-medical-art-composition="official-layers"]'),
        ).toHaveCount(diagramCase.phaseCount);
        await expect(
          preview.locator('image[data-medical-art-source*="otosurgeryatlas"]'),
        ).toHaveCount(0);
        await expect(preview.getByText(/Resolve the conflicting selections/i)).toHaveCount(0);
        await expect(preview.locator(".medical-panel-legend-bg")).toHaveCount(
          diagramCase.phaseCount,
        );
        if (diagramCase.caseId === "porp-reconstruction") {
          const prosthesis = preview.locator('[data-prosthesis-method="porp"]');
          await expect(prosthesis).toHaveCount(1);
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-medial-endpoint",
            "stapes_capitulum",
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-calibration",
            servierPlacement.calibration,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-rendering",
            servierPlacement.porp.rendering,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-headplate-source",
            servierPlacement.headplate,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-distal-source",
            servierPlacement.porp.distal,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-shaft-start-source",
            servierPlacement.porp.shaftStart,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-shaft-end-source",
            servierPlacement.porp.shaftEnd,
          );
          const protection = preview.locator(
            '[data-medical-graft="prosthesis-protection"]',
          );
          await expect(protection).toHaveCount(1);
          await expect(protection).toHaveAttribute(
            "data-graft-calibration",
            servierPlacement.calibration,
          );
          await expect(protection).toHaveAttribute(
            "data-graft-source-center",
            servierPlacement.cartilage,
          );
          await expect(protection).toHaveAttribute(
            "data-graft-source-radii",
            servierPlacement.cartilageRadii,
          );
          await expect(
            preview.locator(
              '[data-anatomy-education-treatment="translucent-foreground"]',
            ),
          ).toHaveAttribute("opacity", "0.52");
          await expect(preview.locator('[data-anatomy-component="incus"]')).toHaveCount(0);
          await expect(
            preview.locator(
              '[data-anatomy-component="stapes"][data-anatomy-component-state="intact"]',
            ),
          ).toHaveCount(diagramCase.phaseCount);
        }
        if (diagramCase.caseId === "torp-reconstruction") {
          const prosthesis = preview.locator('[data-prosthesis-method="torp"]');
          await expect(prosthesis).toHaveCount(1);
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-medial-endpoint",
            "stapes_footplate",
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-calibration",
            servierPlacement.calibration,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-rendering",
            servierPlacement.torp.rendering,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-headplate-source",
            servierPlacement.headplate,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-distal-source",
            servierPlacement.torp.distal,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-shaft-start-source",
            servierPlacement.torp.shaftStart,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-shaft-end-source",
            servierPlacement.torp.shaftEnd,
          );
          const protection = preview.locator(
            '[data-medical-graft="prosthesis-protection"]',
          );
          await expect(protection).toHaveAttribute(
            "data-graft-calibration",
            servierPlacement.calibration,
          );
          await expect(protection).toHaveAttribute(
            "data-graft-source-center",
            servierPlacement.cartilage,
          );
          await expect(protection).toHaveAttribute(
            "data-graft-source-radii",
            servierPlacement.cartilageRadii,
          );
          await expect(preview.locator('[data-anatomy-component="incus"]')).toHaveCount(0);
          await expect(
            preview.locator(
              '[data-anatomy-component="stapes"][data-anatomy-component-state="footplate-only"]',
            ),
          ).toHaveCount(diagramCase.phaseCount);
        }
        if (diagramCase.caseId === "incus-long-process-erosion") {
          await expect(
            preview.locator(
              '[data-anatomy-component="incus"][data-anatomy-component-state="long-process-eroded"]',
            ),
          ).toHaveCount(diagramCase.phaseCount);
        }
        if (viewport.name === "mobile") {
          await expectFullSourceSvgFit(preview);
        }

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
        if (surgeryPreset.presetId === "ossiculoplasty") {
          const prosthesis = preview.locator('[data-prosthesis-method="porp"]');
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-medial-endpoint",
            "stapes_capitulum",
          );
          await expect(
            preview.locator('[data-medical-graft="prosthesis-protection"]'),
          ).toHaveAttribute(
            "data-graft-calibration",
            servierPlacement.calibration,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-rendering",
            servierPlacement.porp.rendering,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-headplate-source",
            servierPlacement.headplate,
          );
          await expect(prosthesis).toHaveAttribute(
            "data-prosthesis-distal-source",
            servierPlacement.porp.distal,
          );
          await expect(
            preview.locator(
              '[data-anatomy-component="incus"][data-anatomy-component-state="long-process-eroded"]',
            ),
          ).toHaveCount(surgeryPreset.phaseCount);
        }
        if (surgeryPreset.presetId === "tympanoplasty") {
          await expect(
            preview.locator('[data-medical-perforation="central"]'),
          ).toHaveAttribute(
            "data-perforation-geometry",
            "documented-polygon",
          );
          await expect(
            preview.locator(
              '[data-medical-graft="tympanic-membrane-repair"]',
            ),
          ).toHaveAttribute(
            "data-graft-calibration",
            "servier-ear-cutaway-tm-2026-07",
          );
          await expect(
            preview.locator(
              '[data-anatomy-education-treatment="translucent-foreground"]',
            ),
          ).toHaveAttribute("opacity", "0.52");
        }
        if (surgeryPreset.presetId === "stapes_surgery") {
          await expect(
            preview.locator(
              '[data-anatomy-component="stapes"][data-anatomy-component-state="intact"]',
            ),
          ).toHaveCount(1);
          await expect(
            preview.locator(
              '[data-anatomy-component="stapes"][data-anatomy-component-state="footplate-only"]',
            ),
          ).toHaveCount(1);
        }
        if (viewport.name === "mobile") {
          await expectFullSourceSvgFit(preview);
        }

        if (surgeryPreset.assetId === "servier-inner-ear") {
          await expect(
            preview.locator('[data-medical-art-composition="official-layers"]'),
          ).toHaveCount(surgeryPreset.phaseCount);
        }

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
