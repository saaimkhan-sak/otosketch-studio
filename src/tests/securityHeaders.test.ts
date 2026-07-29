import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/securityHeaders";

describe("deployment security headers", () => {
  it("defines a restrictive CSP and browser hardening headers", () => {
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(securityHeaders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Content-Security-Policy" }),
        expect.objectContaining({ key: "Referrer-Policy", value: "no-referrer" }),
        expect.objectContaining({ key: "X-Content-Type-Options", value: "nosniff" }),
        expect.objectContaining({ key: "X-Frame-Options", value: "DENY" }),
      ]),
    );
  });

  it("keeps the Cloudflare Pages static headers aligned with runtime headers", () => {
    const staticHeaders = readFileSync(join(process.cwd(), "public/_headers"), "utf8");

    for (const header of securityHeaders) {
      expect(staticHeaders).toContain(`${header.key}: ${header.value}`);
    }
  });

  it("keeps environment secrets ignored while documenting safe example settings", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
    const envExamplePath = join(process.cwd(), ".env.example");
    const envExample = readFileSync(envExamplePath, "utf8");

    expect(existsSync(envExamplePath)).toBe(true);
    expect(gitignore).toContain(".env*");
    expect(gitignore).toContain("!.env.example");
    expect(gitignore).toContain(".dev.vars");
    expect(envExample).toContain("ENABLE_OLLAMA=false");
    expect(envExample).toContain("ENABLE_CLOUDFLARE_AI=false");
    expect(envExample).toContain("NEXT_PUBLIC_DEFAULT_EXTRACTOR=mock");
    expect(envExample).not.toMatch(/(?:sk-|-----BEGIN|api[_-]?key=.*\\S)/i);
  });
});
