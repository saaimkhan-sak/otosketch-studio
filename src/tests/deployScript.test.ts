import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Cloudflare demo deploy script", () => {
  it("prints a no-side-effect dry-run plan", () => {
    const result = spawnSync("node", ["scripts/deploy-cloudflare-demo.mjs", "--dry-run"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      ok: true,
      dryRun: true,
      projectName: "ai-oto-surgical-diagrammer",
      extractionEndpoint: "/api/extract",
    });
    expect(report.plannedCommands.join(" ")).toContain("wrangler pages functions build functions");
    expect(report.plannedCommands.join(" ")).toContain("wrangler pages deploy out");
    expect(report.plannedCommands.join(" ")).toContain("CLOUDFLARE_WORKER_EXTRACT_URL=<pages-url>/api/extract pnpm verify:worker");
    expect(report.plan.join(" ")).toMatch(/Pages Function/);
  });

  it("keeps strict live Workers AI verification opt-in for deploys", () => {
    const result = spawnSync("node", ["scripts/deploy-cloudflare-demo.mjs", "--dry-run"], {
      encoding: "utf8",
      env: {
        ...process.env,
        REQUIRE_LIVE_WORKERS_AI: "true",
      },
    });

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.plannedCommands.join(" ")).toContain("REQUIRE_LIVE_WORKERS_AI=true pnpm verify:worker");
  });
});
