import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("AppShell Cloudflare extraction", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls a public Worker URL directly when configured for static demos", async () => {
    const workerUrl = "https://worker.example/extract";
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_EXTRACTOR", "cloudflare");
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL", workerUrl);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/atlas-assets/stanford/index.json") {
        return new Response(
          JSON.stringify({
            source: "https://otosurgeryatlas.stanford.edu",
            builtAt: new Date().toISOString(),
            assetCount: 0,
            assets: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === workerUrl) {
        return new Response(
          JSON.stringify({
            ok: true,
            case: { ...getSyntheticCase("hero-otomimix-is-joint").expected, extractionProvider: "cloudflare" },
            warnings: [],
            durationMs: 1234,
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        );
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { AppShell } = await import("@/components/app/AppShell");
    const user = userEvent.setup();

    render(<AppShell />);
    await user.selectOptions(screen.getByLabelText("Example case"), "hero-otomimix-is-joint");
    await user.click(screen.getByRole("button", { name: /Build diagram/i }));

    expect((await screen.findAllByText("Reconstruction: Bone cement bridge")).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      workerUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/extract", expect.anything());
  });
});
