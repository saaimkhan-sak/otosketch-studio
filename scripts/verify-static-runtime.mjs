import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const OUT_DIR = path.resolve("out");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

async function resolveStaticPath(requestUrl) {
  const url = new URL(requestUrl, "http://static.local");
  const decodedPath = decodeURIComponent(url.pathname);
  const normalized = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(OUT_DIR, normalized);
  if (!filePath.startsWith(OUT_DIR)) {
    return null;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    if (!path.extname(filePath)) {
      filePath = path.join(OUT_DIR, "index.html");
    }
  }

  return filePath;
}

function startStaticServer() {
  const server = createServer(async (request, response) => {
    const filePath = await resolveStaticPath(request.url ?? "/");
    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Could not bind static server.");
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

if (!existsSync(path.join(OUT_DIR, "index.html"))) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Static export is missing out/index.html. Run pnpm build:static:remote-atlas first.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const pageErrors = [];
const consoleErrors = [];
const { server, url } = await startStaticServer();
const browser = await chromium.launch();

async function completeReviewChecklist(page) {
  await page.getByLabel(/Laterality and side labels checked/i).check();
  await page.getByLabel(/Findings match the cited evidence/i).check();
  await page.getByLabel(/Visual layers and limitations checked/i).check();
  await page.getByLabel(/Patient handout copy reviewed/i).check();
}

try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Otology Visual Summary" })).toBeVisible();
  await expect(page.getByText(/Synthetic demo — do not enter patient information/i)).toBeVisible();
  await expect(page.getByLabel("Example case")).toHaveValue("normal-ossicular-chain");
  const initialPreview = page.getByRole("region", { name: "Diagram preview" });
  await expect(initialPreview.locator(".composed-surgery-svg")).toHaveCount(4);
  await expect(initialPreview.locator(".surgery-graft-overlay")).toHaveCount(1);
  await expect(initialPreview.locator(".surgery-repaired-defect-outline")).toHaveCount(1);
  await expect(
    initialPreview.locator(
      'svg[data-diagram-phase="procedure"][data-template-view="otoscopic_tm"] .surgery-perforation',
    ),
  ).toHaveCount(0);

  await page.getByLabel("Example case").selectOption("porp-reconstruction");
  await page.getByRole("button", { name: /Build diagram/i }).click();
  const porpPreview = page
    .locator("section.no-print", { has: page.getByRole("heading", { name: "Diagram preview" }) })
    .first();
  await expect(page.getByRole("button", { name: /^Incus: Absent$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reconstruction: PORP$/i })).toBeVisible();
  await expect(porpPreview.locator(".surgery-prosthesis-line")).toHaveCount(1);
  await expect(porpPreview.locator(".surgery-prosthesis-head")).toHaveCount(1);
  await expect(porpPreview.locator(".surgery-prosthesis-cup")).toHaveCount(1);
  await expect(porpPreview.locator(".surgery-prosthesis-foot")).toHaveCount(0);
  await expect(
    porpPreview.locator('svg[data-diagram-phase="procedure"][data-template-view="otoscopic_tm"]'),
  ).toHaveCount(0);
  await expect(page.getByRole("group", { name: /Sources and limitations/i })).toContainText(
    /Repair reference · 1736/i,
  );
  await page
    .getByRole("button", { name: /Incus: Absent/i })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator("blockquote").filter({ hasText: "The incus was absent" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Download SVG/i })).toBeDisabled();
  await completeReviewChecklist(page);
  await expect(page.getByRole("button", { name: /Mark reviewed for demo/i })).toBeEnabled();
  await page.getByRole("button", { name: /Mark reviewed for demo/i }).click();
  await expect(page.getByRole("button", { name: /Download SVG/i })).toBeDisabled();

  await page.getByLabel("Example case").selectOption("hero-otomimix-is-joint");
  await page.getByRole("button", { name: /Build diagram/i }).click();
  const diagramPreview = page
    .locator("section.no-print", { has: page.getByRole("heading", { name: "Diagram preview" }) })
    .first();
  await expect(
    page.getByRole("button", { name: /^Reconstruction: Bone cement bridge$/i }),
  ).toBeVisible();
  await expect(diagramPreview.locator(".surgery-cement-bridge")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Download SVG/i })).toBeDisabled();

  await page.getByText("Advanced", { exact: true }).click();
  await page.getByLabel("Extractor").selectOption("rules");
  await page.getByLabel("Example case").selectOption("porp-reconstruction");
  await page.getByRole("button", { name: /Build diagram/i }).click();
  await expect(page.getByText(/simple rules-based extractor/i)).toBeVisible();

  await page.getByRole("tab", { name: "Paste note" }).click();
  await page.getByLabel("Extractor").selectOption("cloudflare");
  await page
    .getByLabel("Operative note")
    .fill("Patient: Jane Sample. MRN 123456. Left tympanoplasty.");
  await expect(page.getByText(/Possible patient information detected/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Build diagram/i })).toBeDisabled();

  if (pageErrors.length > 0) {
    throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
  }
  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !/Failed to load resource/i.test(message),
  );
  if (unexpectedConsoleErrors.length > 0) {
    throw new Error(`Console errors: ${unexpectedConsoleErrors.join(" | ")}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        checked: [
          "load",
          "deterministic composed diagrams",
          "verified graft coverage",
          "PORP reconstruction template",
          "keyboard evidence",
          "clinician review and patient-export gate",
          "OtoMimix overlay",
          "rules extraction",
          "cloud PHI block",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        url,
        pageErrors,
        consoleErrors,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
