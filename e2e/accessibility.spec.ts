import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("generated composable workflow has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Synthetic demo — do not enter patient information.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Example case").selectOption("porp-reconstruction");
  await expect(page.getByLabel("Operative note")).toHaveValue(/partial ossicular replacement prosthesis/i);
  await page.getByRole("button", { name: "Build diagram" }).click();
  await expect(page.getByRole("button", { name: /^Incus: Absent$/i })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("upcoming procedure workflow has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Upcoming procedure" }).click();
  await page.getByLabel("Common planned procedure").selectOption("tympanoplasty");
  await expect(page.getByRole("heading", { name: /Your planned Tympanoplasty/i })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
