import { expect, test } from "@playwright/test";

test("clinic can build, approve, and print an upcoming procedure guide", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Upcoming procedure" }).click();

  await expect(page.getByText("No patient note is needed")).toBeVisible();
  await expect(page.getByLabel("Operative note")).toHaveCount(0);
  await page.getByLabel("Common planned procedure").selectOption("tympanoplasty");

  await expect(page.getByRole("region", { name: /Anatomy being discussed: Eardrum view/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /Planned procedure: Eardrum view/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your planned Tympanoplasty/i })).toBeVisible();
  await expect(page.getByText(/Stanford background is prepared but not embedded/i)).toBeVisible();

  await page.getByLabel("Reviewer name").fill("Synthetic Clinician");
  await page.getByLabel("Planned procedure and side checked").check();
  await page.getByLabel("Planned steps match the surgeon discussion").check();
  await page.getByLabel("Reference image, overlays, and limitations checked").check();
  await page.getByLabel("Clinic handout language reviewed").check();
  await page.getByRole("button", { name: "Approve for patient discussion" }).click();

  await expect(page.getByText("Approved for patient discussion").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Download SVG" })).toBeEnabled();

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-export-only")).toBeVisible();
  await expect(page.locator(".print-export-only")).toContainText("Plan may change during surgery");
  await expect(page.locator(".print-export-only")).toContainText("Clinician reviewer: Synthetic Clinician");
  await expect(page.locator(".print-export-only")).not.toContainText("operative note");

  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: "0.35in", bottom: "0.35in", left: "0.35in", right: "0.35in" },
  });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pageErrors).toEqual([]);
});

for (const viewport of [
  { name: "small phone", width: 320, height: 740 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
]) {
  test(`clinic workflow has no text or page overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.getByRole("button", { name: "Upcoming procedure" }).click();
    await page.getByLabel("Common planned procedure").selectOption("cochlear_implant");

    const audit = await page.evaluate(() => {
      const selector = [
        "button", "a", "p", "h1", "h2", "h3", "h4", "label", "li", "summary",
        ".status-pill", ".diagram-status-row span", ".preop-guide-card",
        ".surgery-builder-layer-card", ".surgery-builder-layer-summary",
        ".procedure-atlas-callout", "input", "select", "textarea",
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
          return element.scrollWidth > element.clientWidth + 1 || rect.right > innerWidth + 1;
        })
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          text: element.textContent?.trim().slice(0, 100),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));

      return {
        viewportWidth: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        overflowingText,
      };
    });
    expect(audit.pageWidth).toBeLessThanOrEqual(audit.viewportWidth);
    expect(audit.overflowingText).toEqual([]);
  });
}

test("clinic reset clears the loaded procedure and preset command", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Upcoming procedure" }).click();
  const preset = page.getByLabel("Common planned procedure");
  await preset.selectOption("tympanoplasty");
  await expect(preset).toHaveValue("");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(preset).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Your planned ear procedure" })).toBeVisible();
});
