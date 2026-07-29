import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extract/route";

describe("/api/extract", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects empty notes", async () => {
    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({ note: "", provider: "rules" }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false, errorCode: "EMPTY_NOTE" });
  });

  it("rejects oversized notes", async () => {
    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({ note: "x".repeat(12_001), provider: "rules" }),
      }),
    );
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ ok: false, errorCode: "TOO_LONG" });
  });

  it("sets no-store on successful extraction", async () => {
    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({
          note: "Synthetic operative note. Left tympanoplasty. The tympanic membrane was intact.",
          provider: "rules",
        }),
      }),
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects optional providers unless they are intentionally enabled", async () => {
    vi.stubEnv("ENABLE_OLLAMA", "false");

    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({
          note: "Synthetic operative note. Left tympanoplasty. The tympanic membrane was intact.",
          provider: "ollama",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ ok: false, errorCode: "PROVIDER_DISABLED" });
  });
});
