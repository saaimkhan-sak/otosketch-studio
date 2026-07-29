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

type PresetPresentationMode = "postoperative_summary" | "preoperative_education";

const minimumReadableBadgeNumberHeightPx = 10;

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

async function generateSurgeryPreset(
  page: Page,
  presetId: SurgeryPresetExpectation["presetId"],
  mode: PresetPresentationMode = "postoperative_summary",
) {
  await page.goto("/");
  await installVisualTestStyles(page);
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  if (mode === "preoperative_education") {
    await page.getByRole("button", { name: "Upcoming procedure" }).click();
  } else {
    await page.getByRole("tab", { name: "Build manually" }).click();
  }
  const preset = page.getByLabel(
    mode === "preoperative_education" ? "Common planned procedure" : "Synthetic surgery example",
  );
  await preset.selectOption(presetId);
  await expect(preset).toHaveValue(presetId);
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

async function expectProductionMobileCalloutReadability(
  preview: ReturnType<typeof diagramPreview>,
) {
  const diagrams = preview.locator(".medical-illustration-svg");
  const count = await diagrams.count();
  let badgeNumberCount = 0;

  for (let index = 0; index < count; index += 1) {
    const layout = await diagrams.nth(index).evaluate((svg) => {
      const panel = svg.closest(".medical-illustration-panel");
      if (!(panel instanceof HTMLElement)) {
        throw new Error("Medical illustration SVG is missing its panel.");
      }
      const isVisible = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
        );
      };
      const svgRect = svg.getBoundingClientRect();
      const svgCallouts = Array.from(
        svg.querySelectorAll<SVGGElement>("[data-medical-callout]"),
      ).map((callout) => ({
        layerId: callout.dataset.medicalCallout ?? "",
        ordinal: callout.dataset.calloutLegendNumber ?? "",
      }));
      const numberRects = Array.from(
        svg.querySelectorAll<SVGTextElement>(".medical-panel-callout-number"),
      ).map((number) => {
        const rect = number.getBoundingClientRect();
        return {
          layerId: number.closest<SVGGElement>("[data-medical-callout]")?.dataset.layerId,
          height: rect.height,
          width: rect.width,
        };
      });
      const mobileCallouts = Array.from(
        panel.querySelectorAll<HTMLElement>("[data-mobile-callout-layer]"),
      ).map((row) => {
        const number = row.querySelector<HTMLElement>(".medical-mobile-callout-number");
        const numberRect = number?.getBoundingClientRect();
        return {
          layerId: row.dataset.mobileCalloutLayer ?? "",
          ordinal: row.dataset.legendNumber ?? "",
          visible: isVisible(row),
          numberVisible: number ? isVisible(number) : false,
          numberText: number?.textContent?.trim() ?? "",
          numberWidth: numberRect?.width ?? 0,
          numberHeight: numberRect?.height ?? 0,
          numberBorderRadius: number ? getComputedStyle(number).borderRadius : "",
        };
      });
      const svgUnillustratedLayerIds = Array.from(
        svg.querySelectorAll<SVGGElement>("[data-medical-unillustrated-layer]"),
      ).map((row) => row.dataset.medicalUnillustratedLayer ?? "");
      const mobileUnillustratedRows = Array.from(
        panel.querySelectorAll<HTMLElement>("[data-mobile-unillustrated-layer]"),
      ).map((row) => ({
        layerId: row.dataset.mobileUnillustratedLayer ?? "",
        visible: isVisible(row),
      }));
      return {
        svgWidth: svgRect.width,
        panelClientWidth: panel.clientWidth,
        panelScrollWidth: panel.scrollWidth,
        overflowX: getComputedStyle(panel).overflowX,
        svgCallouts,
        numberRects,
        mobileCallouts,
        svgUnillustratedLayerIds,
        mobileUnillustratedRows,
      };
    });

    expect(
      layout.svgWidth,
      `diagram ${index + 1} should retain the production mobile width`,
    ).toBeGreaterThanOrEqual(719);
    expect(
      layout.overflowX,
      `diagram ${index + 1} should use the production scroll container`,
    ).toMatch(/auto|scroll/);
    expect(
      layout.panelScrollWidth,
      `diagram ${index + 1} should expose its full-width illustration by horizontal scroll`,
    ).toBeGreaterThan(layout.panelClientWidth);

    badgeNumberCount += layout.numberRects.length;
    for (const numberRect of layout.numberRects) {
      expect(
        numberRect.height,
        `${numberRect.layerId ?? "unknown layer"} badge number should remain readable at phone width`,
      ).toBeGreaterThanOrEqual(minimumReadableBadgeNumberHeightPx);
      expect(
        numberRect.width,
        `${numberRect.layerId ?? "unknown layer"} badge number should have visible rendered width`,
      ).toBeGreaterThan(0);
    }

    expect(
      layout.mobileCallouts,
      `diagram ${index + 1} should expose one mobile key row per SVG spatial callout`,
    ).toHaveLength(layout.svgCallouts.length);
    for (const svgCallout of layout.svgCallouts) {
      const matchingRows = layout.mobileCallouts.filter(
        (row) => row.layerId === svgCallout.layerId,
      );
      expect(
        matchingRows,
        `${svgCallout.layerId || "unknown layer"} should have one matching mobile key row`,
      ).toHaveLength(1);
      const matchingRow = matchingRows[0];
      expect(matchingRow.visible, `${svgCallout.layerId} mobile key row should be visible`).toBe(
        true,
      );
      expect(matchingRow.ordinal, `${svgCallout.layerId} mobile key ordinal`).toBe(
        svgCallout.ordinal,
      );
      expect(matchingRow.numberText, `${svgCallout.layerId} mobile key number`).toBe(
        svgCallout.ordinal,
      );
      expect(
        matchingRow.numberVisible,
        `${svgCallout.layerId} mobile key number should be visible`,
      ).toBe(true);
      expect(
        matchingRow.numberWidth,
        `${svgCallout.layerId} mobile key number should be at least 20px wide`,
      ).toBeGreaterThanOrEqual(20);
      expect(
        matchingRow.numberHeight,
        `${svgCallout.layerId} mobile key number should be at least 20px tall`,
      ).toBeGreaterThanOrEqual(20);
      expect(
        matchingRow.numberBorderRadius,
        `${svgCallout.layerId} mobile key number should remain circular`,
      ).toBe("50%");
    }

    expect(
      layout.mobileUnillustratedRows.map((row) => row.layerId).sort(),
      `diagram ${index + 1} mobile unsupported rows should match SVG unsupported layers`,
    ).toEqual([...layout.svgUnillustratedLayerIds].sort());
    for (const unsupportedRow of layout.mobileUnillustratedRows) {
      expect(
        unsupportedRow.visible,
        `${unsupportedRow.layerId || "unknown layer"} mobile unsupported row should be visible`,
      ).toBe(true);
    }
  }

  expect(
    badgeNumberCount,
    "phone layout should contain at least one numbered callout",
  ).toBeGreaterThan(0);
}

async function expectNumberedCalloutIntegrity(preview: ReturnType<typeof diagramPreview>) {
  const diagrams = preview.locator(".medical-illustration-svg");
  const count = await diagrams.count();

  for (let index = 0; index < count; index += 1) {
    const audit = await diagrams.nth(index).evaluate((svg) => {
      const svgRoot = svg as SVGSVGElement;
      const errors: string[] = [];
      const badges = Array.from(svgRoot.querySelectorAll<SVGGElement>("[data-medical-callout]"));
      const legends = Array.from(
        svgRoot.querySelectorAll<SVGGElement>("[data-medical-legend-layer]"),
      );
      const overlays = Array.from(svgRoot.querySelectorAll<SVGGElement>("[data-anatomy-layer]"));
      const leaders = Array.from(
        svgRoot.querySelectorAll<SVGGElement>("[data-medical-callout-leader]"),
      );
      const visibleTerminals = Array.from(
        svgRoot.querySelectorAll<SVGGElement>("[data-medical-callout-visible-terminal]"),
      );
      const image = svgRoot.querySelector<SVGRectElement>(".medical-panel-image-bg");
      const legend = svgRoot.querySelector<SVGRectElement>(".medical-panel-legend-bg");
      const parsePoint = (value: string | undefined) => {
        const [x, y] = (value ?? "").split(",").map(Number);
        return { x, y };
      };
      const parseBounds = (value: string | undefined) => {
        const [left, top, right, bottom] = (value ?? "").split(",").map(Number);
        return { left, top, right, bottom };
      };
      const overlaps = (first: DOMRect, second: DOMRect) =>
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;

      if (badges.length !== legends.length) {
        errors.push(`badge/legend mismatch ${badges.length}/${legends.length}`);
      }
      if (badges.length !== overlays.length) {
        errors.push(`badge/overlay mismatch ${badges.length}/${overlays.length}`);
      }
      if (Number(svgRoot.getAttribute("data-spatial-callout-count")) !== badges.length) {
        errors.push("SVG spatial count does not match badges");
      }
      if (visibleTerminals.length !== leaders.length) {
        errors.push(
          `visible-terminal/leader mismatch ${visibleTerminals.length}/${leaders.length}`,
        );
      }

      const imageRect = image?.getBoundingClientRect();
      const legendRect = legend?.getBoundingClientRect();
      for (const badge of badges) {
        const layerId = badge.dataset.layerId;
        const ordinal = badge.dataset.calloutLegendNumber;
        const circle = badge.querySelector<SVGCircleElement>("circle");
        const number = badge.querySelector<SVGTextElement>("text");
        const matchingLegend = legends.find((row) => row.dataset.layerId === layerId);
        const matchingOverlay = overlays.find((overlay) => overlay.dataset.layerId === layerId);
        const matchingLeaders = leaders.filter(
          (leader) => leader.dataset.medicalCalloutLeader === layerId,
        );
        if (!matchingLegend) errors.push(`${layerId}: missing legend row`);
        if (!matchingOverlay) errors.push(`${layerId}: missing overlay group`);
        if (matchingLeaders.length === 0) {
          errors.push(`${layerId}: missing leader`);
        }
        if (matchingLegend?.dataset.legendNumber !== ordinal) {
          errors.push(`${layerId}: legend ordinal mismatch`);
        }
        if (matchingOverlay?.dataset.legendNumber !== ordinal) {
          errors.push(`${layerId}: overlay ordinal mismatch`);
        }
        for (const leader of matchingLeaders) {
          if (leader.dataset.calloutLegendNumber !== ordinal) {
            errors.push(`${layerId}: leader ordinal mismatch`);
          }
        }
        const overlayRect = matchingOverlay?.getBoundingClientRect();
        const screenMatrix = svgRoot.getScreenCTM();
        if (
          overlayRect &&
          overlayRect.width > 0 &&
          overlayRect.height > 0 &&
          screenMatrix &&
          matchingLeaders.length > 0
        ) {
          const protectedBounds = matchingLeaders.map((leader) =>
            parseBounds(leader.dataset.calloutProtectedBounds),
          );
          const union = {
            left: Math.min(...protectedBounds.map((bounds) => bounds.left)),
            top: Math.min(...protectedBounds.map((bounds) => bounds.top)),
            right: Math.max(...protectedBounds.map((bounds) => bounds.right)),
            bottom: Math.max(...protectedBounds.map((bounds) => bounds.bottom)),
          };
          const first = new DOMPoint(union.left, union.top).matrixTransform(screenMatrix);
          const second = new DOMPoint(union.right, union.bottom).matrixTransform(screenMatrix);
          const tolerance = 4;
          if (
            overlayRect.left < Math.min(first.x, second.x) - tolerance ||
            overlayRect.top < Math.min(first.y, second.y) - tolerance ||
            overlayRect.right > Math.max(first.x, second.x) + tolerance ||
            overlayRect.bottom > Math.max(first.y, second.y) + tolerance
          ) {
            errors.push(`${layerId}: protected bounds miss rendered pixels`);
          }
        }
        if (!circle || !number || !imageRect || !legendRect) {
          errors.push(`${layerId}: incomplete badge geometry`);
          continue;
        }
        const circleRect = circle.getBoundingClientRect();
        const numberRect = number.getBoundingClientRect();
        if (circleRect.left <= imageRect.right) {
          errors.push(`${layerId}: badge overlaps image frame`);
        }
        if (circleRect.right >= legendRect.left) {
          errors.push(`${layerId}: badge overlaps legend frame`);
        }
        if (
          Math.abs(
            (circleRect.left + circleRect.right) / 2 - (numberRect.left + numberRect.right) / 2,
          ) > 1
        ) {
          errors.push(`${layerId}: number is not centered`);
        }
        for (const overlay of overlays) {
          const overlayRect = overlay.getBoundingClientRect();
          if (
            overlayRect.width > 0 &&
            overlayRect.height > 0 &&
            overlaps(circleRect, overlayRect)
          ) {
            errors.push(`${layerId}: badge overlaps ${overlay.dataset.layerId}`);
          }
        }
      }

      for (let first = 0; first < badges.length; first += 1) {
        const firstCircle = badges[first].querySelector<SVGCircleElement>("circle");
        if (!firstCircle) continue;
        for (let second = first + 1; second < badges.length; second += 1) {
          const secondCircle = badges[second].querySelector<SVGCircleElement>("circle");
          if (
            secondCircle &&
            overlaps(firstCircle.getBoundingClientRect(), secondCircle.getBoundingClientRect())
          ) {
            errors.push(
              `badge collision ${badges[first].dataset.layerId}/${badges[second].dataset.layerId}`,
            );
          }
        }
      }

      for (const leader of leaders) {
        const target = parsePoint(leader.dataset.calloutTarget);
        const end = parsePoint(leader.dataset.calloutEnd);
        const bounds = parseBounds(leader.dataset.calloutProtectedBounds);
        const targetInside =
          target.x >= bounds.left &&
          target.x <= bounds.right &&
          target.y >= bounds.top &&
          target.y <= bounds.bottom;
        const endInside =
          end.x >= bounds.left &&
          end.x <= bounds.right &&
          end.y >= bounds.top &&
          end.y <= bounds.bottom;
        if (!targetInside) {
          errors.push(`${leader.dataset.medicalCalloutLeader}: target outside bounds`);
        }
        if (endInside) {
          errors.push(`${leader.dataset.medicalCalloutLeader}: endpoint covers annotation`);
        }
        if (!leader.dataset.calloutBasis) {
          errors.push(`${leader.dataset.medicalCalloutLeader}: missing geometry basis`);
        }
        const line = leader.querySelector<SVGLineElement>(".medical-panel-callout-line");
        if (line) {
          const terminal = line.getPointAtLength(line.getTotalLength());
          if (Math.abs(terminal.x - end.x) > 0.001 || Math.abs(terminal.y - end.y) > 0.001) {
            errors.push(`${leader.dataset.medicalCalloutLeader}: rendered line endpoint drift`);
          }
        }
      }

      const expectedTerminalKeys = leaders
        .map(
          (leader) =>
            `${leader.dataset.medicalCalloutLeader}|${leader.dataset.calloutLegendNumber}|${leader.dataset.calloutEnd}`,
        )
        .sort();
      const actualTerminalKeys = visibleTerminals
        .map(
          (terminal) =>
            `${terminal.dataset.medicalCalloutVisibleTerminal}|${terminal.dataset.calloutLegendNumber}|${terminal.dataset.calloutTerminalCenter}`,
        )
        .sort();
      if (expectedTerminalKeys.join("\n") !== actualTerminalKeys.join("\n")) {
        errors.push("visible terminals do not match leader endpoints");
      }
      for (const terminal of visibleTerminals) {
        const center = parsePoint(terminal.dataset.calloutTerminalCenter);
        const circle = terminal.querySelector<SVGCircleElement>(".medical-panel-callout-terminal");
        if (
          !circle ||
          Math.abs(circle.cx.baseVal.value - center.x) > 0.001 ||
          Math.abs(circle.cy.baseVal.value - center.y) > 0.001
        ) {
          errors.push(`${terminal.dataset.medicalCalloutVisibleTerminal}: terminal center drift`);
        }
      }

      const leaderGroup = svgRoot.querySelector(
        '[data-callout-render-order="beneath-anatomy-and-overlays"]',
      );
      const anatomyGroup = svgRoot.querySelector("[data-anatomy-source-transform]");
      const terminalGroup = svgRoot.querySelector(
        '[data-callout-terminal-render-order="above-anatomy-beneath-overlays"]',
      );
      if (
        leaderGroup &&
        anatomyGroup &&
        !(leaderGroup.compareDocumentPosition(anatomyGroup) & Node.DOCUMENT_POSITION_FOLLOWING)
      ) {
        errors.push("leaders do not paint beneath licensed anatomy");
      }
      if (
        anatomyGroup &&
        terminalGroup &&
        !(anatomyGroup.compareDocumentPosition(terminalGroup) & Node.DOCUMENT_POSITION_FOLLOWING)
      ) {
        errors.push("visible terminals do not paint above licensed anatomy");
      }
      if (
        terminalGroup &&
        overlays[0] &&
        !(terminalGroup.compareDocumentPosition(overlays[0]) & Node.DOCUMENT_POSITION_FOLLOWING)
      ) {
        errors.push("visible terminals do not paint beneath surgical overlays");
      }

      return {
        errors,
        badges: badges.length,
        legends: legends.length,
        overlays: overlays.length,
      };
    });

    expect(audit.errors, `diagram ${index + 1}`).toEqual([]);
    expect(audit.badges).toBe(audit.legends);
    expect(audit.badges).toBe(audit.overlays);
  }
}

async function expectPresetLateralityCalibration(
  page: Page,
  surgeryPreset: SurgeryPresetExpectation,
  mode: PresetPresentationMode,
) {
  await generateSurgeryPreset(page, surgeryPreset.presetId, mode);
  const preview = diagramPreview(page);
  const collect = () =>
    preview.locator(".medical-illustration-svg").evaluateAll((svgs) =>
      svgs.map((svg) =>
        Array.from(svg.querySelectorAll<SVGGElement>("[data-medical-callout-leader]")).map(
          (leader) => {
            const layerId = leader.dataset.medicalCalloutLeader ?? "";
            const badge = svg.querySelector<SVGGElement>(`[data-medical-callout="${layerId}"]`);
            return {
              layerId,
              ordinal: leader.dataset.calloutLegendNumber,
              basis: leader.dataset.calloutBasis,
              target: leader.dataset.calloutTarget,
              source: leader.dataset.calloutTargetSource,
              bounds: leader.dataset.calloutProtectedBounds,
              badge: badge?.dataset.calloutBadgeCenter,
            };
          },
        ),
      ),
    );

  const right = await collect();
  await page.getByLabel("Laterality", { exact: true }).selectOption("left");
  await expect(preview.locator('[data-anatomy-orientation="mirrored-left"]')).toHaveCount(
    surgeryPreset.phaseCount,
  );
  const left = await collect();

  expect(left).toHaveLength(right.length);
  for (const [panelIndex, rightPanel] of right.entries()) {
    const leftPanel = left[panelIndex];
    expect(leftPanel).toHaveLength(rightPanel.length);
    for (const [leaderIndex, rightLeader] of rightPanel.entries()) {
      const leftLeader = leftPanel[leaderIndex];
      expect(leftLeader.layerId).toBe(rightLeader.layerId);
      expect(leftLeader.ordinal).toBe(rightLeader.ordinal);
      expect(leftLeader.basis).toBe(rightLeader.basis);
      expect(leftLeader.source).toBe(rightLeader.source);
      expect(leftLeader.badge).toBe(rightLeader.badge);

      const [rightX, rightY] = (rightLeader.target ?? "").split(",").map(Number);
      const [leftX, leftY] = (leftLeader.target ?? "").split(",").map(Number);
      expect(leftX + rightX).toBeCloseTo(644, 3);
      expect(leftY).toBe(rightY);

      const [rightLeft, rightTop, rightRight, rightBottom] = (rightLeader.bounds ?? "")
        .split(",")
        .map(Number);
      const [leftLeft, leftTop, leftRight, leftBottom] = (leftLeader.bounds ?? "")
        .split(",")
        .map(Number);
      expect(leftLeft + rightRight).toBeCloseTo(644, 3);
      expect(leftRight + rightLeft).toBeCloseTo(644, 3);
      expect(leftTop).toBe(rightTop);
      expect(leftBottom).toBe(rightBottom);
    }
  }
  await expectNumberedCalloutIntegrity(preview);
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
          const protection = preview.locator('[data-medical-graft="prosthesis-protection"]');
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
            preview.locator('[data-anatomy-education-treatment="translucent-foreground"]'),
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
          const protection = preview.locator('[data-medical-graft="prosthesis-protection"]');
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
          await expectProductionMobileCalloutReadability(preview);
        }
        await expectNumberedCalloutIntegrity(preview);

        await preview.scrollIntoViewIfNeeded();
        await expect(preview).toHaveScreenshot(`${diagramCase.caseId}-${viewport.name}.png`, {
          animations: "disabled",
          maxDiffPixelRatio: 0.005,
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
          ).toHaveAttribute("data-graft-calibration", servierPlacement.calibration);
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
          await expect(preview.locator('[data-medical-perforation="central"]')).toHaveAttribute(
            "data-perforation-geometry",
            "documented-polygon",
          );
          await expect(
            preview.locator('[data-medical-graft="tympanic-membrane-repair"]'),
          ).toHaveAttribute("data-graft-calibration", "servier-ear-cutaway-tm-2026-07");
          await expect(
            preview.locator('[data-anatomy-education-treatment="translucent-foreground"]'),
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
          await expectProductionMobileCalloutReadability(preview);
        }

        if (surgeryPreset.assetId === "servier-inner-ear") {
          await expect(
            preview.locator('[data-medical-art-composition="official-layers"]'),
          ).toHaveCount(surgeryPreset.phaseCount);
        }
        await expectNumberedCalloutIntegrity(preview);

        const phases = preview.locator(".medical-illustration-phases").first();
        await phases.scrollIntoViewIfNeeded();
        await expect(phases).toHaveScreenshot(
          `common-${surgeryPreset.presetId}-${viewport.name}.png`,
          {
            animations: "disabled",
            maxDiffPixelRatio: 0.004,
          },
        );
      });
    }

    for (const surgeryPreset of commonSurgeryPresets) {
      test(`common planned procedure · ${surgeryPreset.presetId}`, async ({ page }) => {
        await generateSurgeryPreset(page, surgeryPreset.presetId, "preoperative_education");
        const preview = diagramPreview(page);
        const diagrams = preview.locator(".medical-illustration-svg");

        await expect(diagrams).toHaveCount(surgeryPreset.phaseCount);
        await expect(
          preview.locator(`[data-medical-illustration="${surgeryPreset.assetId}"]`),
        ).toHaveCount(surgeryPreset.phaseCount);
        await expect(preview.locator('[data-anatomy-layer="verification_status"]')).toHaveCount(0);
        await expect(preview.getByText(/Resolve the conflicting selections/i)).toHaveCount(0);

        if (surgeryPreset.assetId === "servier-inner-ear") {
          await expect(
            preview.locator('[data-medical-art-composition="official-layers"]'),
          ).toHaveCount(surgeryPreset.phaseCount);
        }
        if (viewport.name === "mobile") {
          await expectProductionMobileCalloutReadability(preview);
        }
        await expectNumberedCalloutIntegrity(preview);
      });
    }
  });
}

test.describe("tablet common planned procedure callout readability", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  for (const surgeryPreset of commonSurgeryPresets) {
    test(`${surgeryPreset.presetId}`, async ({ page }) => {
      await generateSurgeryPreset(page, surgeryPreset.presetId, "preoperative_education");
      const preview = diagramPreview(page);

      await expect(preview.locator(".medical-illustration-svg")).toHaveCount(
        surgeryPreset.phaseCount,
      );
      await expectProductionMobileCalloutReadability(preview);

      const pageWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth);
    });
  }
});

test.describe("numbered callout laterality calibration", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  for (const mode of ["postoperative_summary", "preoperative_education"] as const) {
    for (const surgeryPreset of commonSurgeryPresets) {
      test(`${mode} · ${surgeryPreset.presetId} mirrors targets but not numbers`, async ({
        page,
      }) => {
        await expectPresetLateralityCalibration(page, surgeryPreset, mode);
      });
    }
  }
});
