import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact-desktop", width: 1024, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
  { name: "small-phone", width: 320, height: 740 },
];

for (const viewport of viewports) {
  test(`no text or page overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Example case").selectOption("porp-reconstruction");
    await expect(page.getByLabel("Operative note")).toHaveValue(/partial ossicular replacement prosthesis/i);
    await page.getByRole("button", { name: "Build diagram" }).click();
    await expect(page.getByRole("heading", { name: "Diagram" })).toBeVisible();
    await page.locator("details").evaluateAll((items) =>
      items.forEach((item) => { (item as HTMLDetailsElement).open = true; }),
    );

    const audit = await page.evaluate(() => {
      const selector = [
        "button", "a", "p", "h1", "h2", "h3", "h4", "label", "li", "summary", "blockquote",
        ".fact-row", ".status-pill", ".template-source-link", ".surgery-layer-row",
        ".surgery-builder-layer-card", ".surgery-scene-header", "input", "select", "textarea",
      ].join(",");
      const overflowingText = Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (
            element.classList.contains("sr-only") ||
            style.display === "none" ||
            style.visibility === "hidden" ||
            rect.width === 0
          ) return false;
          return element.scrollWidth > element.clientWidth + 1;
        })
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          text: element.textContent?.trim().slice(0, 100),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));

      const overflowingSvgText = Array.from(document.querySelectorAll<SVGTextElement>("svg text"))
        .filter((element) => {
          if (getComputedStyle(element).display === "none" || element.closest("svg")?.getBoundingClientRect().width === 0) return false;
          const svg = element.ownerSVGElement;
          if (!svg) return false;
          const box = element.getBoundingClientRect();
          const svgBox = svg.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) return false;
          return box.left < svgBox.left - 1 || box.right > svgBox.right + 1;
        })
        .map((element) => ({ text: element.textContent, className: element.getAttribute("class") }));

      return {
        viewportWidth: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        overflowingText,
        overflowingSvgText,
      };
    });

    expect(audit.pageWidth).toBeLessThanOrEqual(audit.viewportWidth);
    expect(audit.overflowingText).toEqual([]);
    expect(audit.overflowingSvgText).toEqual([]);

    const fullScreenTextLines = await page.getByRole("button", { name: "Full screen" }).evaluate((button) => {
      const textNode = Array.from(button.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.includes("Full screen"),
      );
      if (!textNode) return 0;
      const range = document.createRange();
      range.selectNodeContents(textNode);
      return range.getClientRects().length;
    });
    expect(fullScreenTextLines).toBe(1);
  });
}
