import { describe, expect, it } from "vitest";
import { onRequest } from "../../functions/api/extract";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

describe("Cloudflare Pages Function extraction endpoint", () => {
  it("reuses the Worker extraction handler with Pages bindings", async () => {
    const fixture = getSyntheticCase("hero-otomimix-is-joint");
    const response = await onRequest({
      request: new Request("https://demo.pages.dev/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: fixture.note, caseHint: fixture.id }),
      }),
      env: {
        AI: {
          run: async () => ({
            response: {
              ...fixture.expected,
              extractionProvider: "cloudflare",
            },
          }),
        },
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      case: {
        caseId: fixture.id,
        extractionProvider: "cloudflare",
      },
    });
  });
});
