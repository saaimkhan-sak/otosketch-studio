import { expect, test, type Page } from "@playwright/test";

interface DiagramExpectation {
  caseId: string;
  procedureViews: Array<"otoscopic_tm" | "transcanal_middle_ear">;
  procedureLayer: string | null;
}

type SurgeryBaseView =
  | "otoscopic_tm"
  | "transcanal_middle_ear"
  | "mastoid_middle_ear"
  | "cochlea_implant_path"
  | "postauricular_implant"
  | "external_auditory_canal"
  | "eustachian_tube";

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
  procedureView: SurgeryBaseView;
  procedureLayer: string;
}

const canonicalCases: DiagramExpectation[] = [
  {
    caseId: "normal-ossicular-chain",
    procedureViews: ["otoscopic_tm", "transcanal_middle_ear"],
    procedureLayer: ".surgery-graft-overlay",
  },
  {
    caseId: "incus-long-process-erosion",
    procedureViews: ["otoscopic_tm"],
    procedureLayer: ".surgery-graft-overlay",
  },
  { caseId: "is-joint-discontinuity", procedureViews: [], procedureLayer: null },
  {
    caseId: "hero-otomimix-is-joint",
    procedureViews: ["transcanal_middle_ear"],
    procedureLayer: ".surgery-cement-bridge",
  },
  {
    caseId: "porp-reconstruction",
    procedureViews: ["transcanal_middle_ear"],
    procedureLayer: ".surgery-prosthesis-line",
  },
  {
    caseId: "torp-reconstruction",
    procedureViews: ["transcanal_middle_ear"],
    procedureLayer: ".surgery-prosthesis-line",
  },
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
    procedureView: "otoscopic_tm",
    procedureLayer: ".surgery-tube-device",
  },
  {
    presetId: "tympanoplasty",
    procedureView: "otoscopic_tm",
    procedureLayer: ".surgery-graft-overlay",
  },
  {
    presetId: "ossiculoplasty",
    procedureView: "transcanal_middle_ear",
    procedureLayer: ".surgery-prosthesis-line",
  },
  {
    presetId: "tympanomastoidectomy",
    procedureView: "mastoid_middle_ear",
    procedureLayer: ".surgery-mastoid-action",
  },
  {
    presetId: "stapes_surgery",
    procedureView: "transcanal_middle_ear",
    procedureLayer: ".surgery-piston",
  },
  {
    presetId: "cochlear_implant",
    procedureView: "cochlea_implant_path",
    procedureLayer: ".surgery-electrode-path",
  },
  {
    presetId: "bone_conduction_implant",
    procedureView: "postauricular_implant",
    procedureLayer: ".surgery-active-actuator",
  },
  {
    presetId: "canalplasty",
    procedureView: "external_auditory_canal",
    procedureLayer: ".surgery-canal-repaired",
  },
  {
    presetId: "eustachian_tube_dilation",
    procedureView: "eustachian_tube",
    procedureLayer: ".surgery-et-treated-wall",
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
  await expect(page.getByRole("heading", { name: "Diagram preview" })).toBeVisible();
}

async function generateSurgeryPreset(page: Page, presetId: SurgeryPresetExpectation["presetId"]) {
  await page.goto("/");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Build manually" }).click();
  await page.getByLabel("Synthetic surgery example").selectOption(presetId);
  await expect(page.getByRole("heading", { name: "Diagram preview" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function diagramPreview(page: Page) {
  return page
    .locator("section.no-print", {
      has: page.getByRole("heading", { name: "Diagram preview" }),
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

        await expect(preview.locator(".composed-surgery-svg")).toHaveCount(
          2 + diagramCase.procedureViews.length,
        );
        await expect(
          preview.locator(
            '.composed-surgery-svg[data-template-view="otoscopic_tm"][data-diagram-phase="finding"]',
          ),
        ).toHaveCount(1);
        for (const procedureView of ["otoscopic_tm", "transcanal_middle_ear"] as const) {
          await expect(
            preview.locator(
              `.composed-surgery-svg[data-template-view="${procedureView}"][data-diagram-phase="procedure"]`,
            ),
          ).toHaveCount(diagramCase.procedureViews.includes(procedureView) ? 1 : 0);
        }
        await expect(preview.getByText(/No eligible atlas template matches/i)).toHaveCount(0);
        await expect(preview.getByText(/Resolve the conflicting selections/i)).toHaveCount(0);
        await expect(
          preview
            .locator(
              '.composed-surgery-svg[data-template-view="otoscopic_tm"][data-diagram-phase="procedure"]',
            )
            .locator(".surgery-perforation"),
        ).toHaveCount(0);

        const markerCollisions = await preview.locator(".composed-surgery-svg").evaluateAll((svgs) =>
          svgs.flatMap((svg, svgIndex) => {
            const markers = Array.from(
              svg.querySelectorAll<SVGCircleElement>(".surgery-annotation-badge"),
            )
              .map((badge) => ({
                marker: badge.closest<SVGGElement>(".surgery-marker"),
                box: badge.getBoundingClientRect(),
              }))
              .filter(
                (item): item is { marker: SVGGElement; box: DOMRect } =>
                  Boolean(item.marker) && item.box.width > 0 && item.box.height > 0,
              );
            const collisions: Array<{ svgIndex: number; first: string; second: string }> = [];
            for (let first = 0; first < markers.length; first += 1) {
              for (let second = first + 1; second < markers.length; second += 1) {
                const a = markers[first];
                const b = markers[second];
                const overlapX = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
                const overlapY = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
                if (overlapX > 1 && overlapY > 1) {
                  collisions.push({
                    svgIndex,
                    first: a.marker.getAttribute("data-layer-marker") ?? "unknown",
                    second: b.marker.getAttribute("data-layer-marker") ?? "unknown",
                  });
                }
              }
            }
            return collisions;
          }),
        );
        expect(markerCollisions).toEqual([]);

        if (diagramCase.procedureLayer) {
          await expect(
            preview
              .locator('.composed-surgery-svg[data-diagram-phase="procedure"]')
              .locator(diagramCase.procedureLayer),
          ).toHaveCount(1);
        } else {
          await expect(
            preview.getByText("No documented procedure layer to draw.", { exact: true }).first(),
          ).toBeVisible();
        }

        if (diagramCase.caseId === "normal-ossicular-chain") {
          const coverage = await preview
            .locator(
              '.composed-surgery-svg[data-template-view="otoscopic_tm"][data-diagram-phase="procedure"]',
            )
            .evaluate((svg) => {
              const graft = svg.querySelector<SVGGraphicsElement>(".surgery-graft-overlay");
              const perforation = svg.querySelector<SVGGraphicsElement>(
                ".surgery-repaired-defect-outline",
              );
              if (!graft || !perforation) return null;
              const graftBox = graft.getBBox();
              const perforationBox = perforation.getBBox();
              return {
                graft: {
                  x: graftBox.x,
                  y: graftBox.y,
                  right: graftBox.x + graftBox.width,
                  bottom: graftBox.y + graftBox.height,
                },
                perforation: {
                  x: perforationBox.x,
                  y: perforationBox.y,
                  right: perforationBox.x + perforationBox.width,
                  bottom: perforationBox.y + perforationBox.height,
                },
              };
            });

          expect(coverage).not.toBeNull();
          expect(coverage!.graft.x).toBeLessThanOrEqual(coverage!.perforation.x);
          expect(coverage!.graft.y).toBeLessThanOrEqual(coverage!.perforation.y);
          expect(coverage!.graft.right).toBeGreaterThanOrEqual(coverage!.perforation.right);
          expect(coverage!.graft.bottom).toBeGreaterThanOrEqual(coverage!.perforation.bottom);
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
        const procedureSvg = preview.locator(
          `.composed-surgery-svg[data-template-view="${surgeryPreset.procedureView}"][data-diagram-phase="procedure"]`,
        );

        await expect(procedureSvg).toHaveCount(1);
        await expect(procedureSvg.locator(surgeryPreset.procedureLayer).first()).toBeVisible();
        await expect(preview.getByText(/Resolve the conflicting selections/i)).toHaveCount(0);

        const phases = preview.locator(".composed-diagram-phases").first();
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
