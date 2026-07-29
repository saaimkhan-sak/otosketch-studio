import { describe, expect, it } from "vitest";
import worker from "../../worker/src/index";
import { getSyntheticCase } from "@/fixtures/syntheticCases";

function request(body: unknown, headers: HeadersInit = {}) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");
  return new Request("https://worker.test", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}

describe("Cloudflare Worker extraction endpoint", () => {
  it("returns a validated full case from compact Workers AI JSON mode", async () => {
    let modelInput: unknown;
    const response = await worker.fetch(request({ note: getSyntheticCase("hero-otomimix-is-joint").note }), {
      AI: {
        run: async (_model, input) => {
          modelInput = input;
          return {
            response: {
              procedureFamily: "tympanoplasty_with_ossiculoplasty",
              laterality: "left",
              tympanicMembrane: "perforation_posterior",
              malleus: "not_documented",
              incus: "long_process_eroded",
              incudostapedialJoint: "discontinuous",
              stapes: "mobile",
              reconstructionType: "bone_cement_bridge",
              reconstructionMaterial: "otomimix",
              graftType: "not_documented",
              evidence: {
                procedureFamily: ["Procedure: Left tympanoplasty with ossicular chain reconstruction."],
                laterality: ["Procedure: Left tympanoplasty with ossicular chain reconstruction."],
                tympanicMembrane: ["a posterior tympanic membrane perforation was visualized."],
                malleus: [],
                incus: [
                  "The long process of the incus was eroded, resulting in discontinuity at the incudostapedial joint.",
                ],
                incudostapedialJoint: ["resulting in discontinuity at the incudostapedial joint."],
                stapes: ["The stapes superstructure was intact and mobile."],
                reconstructionType: [
                  "OtoMimix bone cement was applied to bridge the eroded long process of the incus to the stapes capitulum.",
                ],
                reconstructionMaterial: ["OtoMimix bone cement was applied"],
                graftType: [],
              },
              ambiguities: [],
              unsupportedClaims: [],
              containsPossiblePhi: false,
              phiWarnings: [],
              suitableForRendering: true,
            },
          };
        },
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      case: {
        extractionProvider: "cloudflare",
        procedure: { family: { value: "tympanoplasty_with_ossiculoplasty" } },
        repair: { reconstructionType: { value: "bone_cement_bridge" } },
      },
    });
    const incusEvidence = body.case.anatomy.incus.evidence[0];
    const note = getSyntheticCase("hero-otomimix-is-joint").note;
    expect(note.slice(incusEvidence.startChar, incusEvidence.endChar)).toBe(incusEvidence.sourceText);
    expect(JSON.stringify(modelInput)).toContain("procedureFamily");
    expect(JSON.stringify(modelInput)).not.toContain("createdAtIso");
  });

  it("returns a validated case from mocked Workers AI JSON mode", async () => {
    const hero = structuredClone(getSyntheticCase("hero-otomimix-is-joint").expected);
    const response = await worker.fetch(request({ note: getSyntheticCase("hero-otomimix-is-joint").note }), {
      AI: {
        run: async () => ({
          response: {
            ...hero,
            extractionProvider: "cloudflare",
          },
        }),
      },
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      case: {
        caseId: "hero-otomimix-is-joint",
        extractionProvider: "cloudflare",
      },
    });
    expect(body.durationMs).toEqual(expect.any(Number));
  });

  it("applies trusted metadata around model-owned clinical fields", async () => {
    const hero = structuredClone(getSyntheticCase("hero-otomimix-is-joint").expected);
    const response = await worker.fetch(request({ note: getSyntheticCase("hero-otomimix-is-joint").note }), {
      AI: {
        run: async () => ({
          response: {
            ...hero,
            createdAtIso: "not a datetime",
            extractionProvider: "manual",
            inputKind: "wrong-kind",
            review: { status: "approved_by_clinician", reviewerName: "model" },
          },
        }),
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.case).toMatchObject({
      extractionProvider: "cloudflare",
      inputKind: "synthetic_note",
      review: { status: "draft_unreviewed" },
    });
    expect(body.case.createdAtIso).toEqual(expect.any(String));
  });

  it("blocks possible PHI before model calls", async () => {
    let called = false;
    const response = await worker.fetch(request({ note: "Patient: Jane Sample. MRN 123456." }), {
      AI: {
        run: async () => {
          called = true;
          return {};
        },
      },
    });
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(called).toBe(false);
    expect(body).toMatchObject({ ok: false, errorCode: "POSSIBLE_PHI" });
  });

  it("falls back to a bundled synthetic fixture for known demo cases when JSON mode fails", async () => {
    const response = await worker.fetch(
      request({
        note: getSyntheticCase("hero-otomimix-is-joint").note,
        caseHint: "hero-otomimix-is-joint",
      }),
      {
        AI: {
          run: async () => {
            throw new Error("json mode failed");
          },
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      case: {
        caseId: "hero-otomimix-is-joint",
        extractionProvider: "cloudflare",
      },
    });
    expect(body.durationMs).toEqual(expect.any(Number));
    expect(body.warnings.join(" ")).toMatch(/bundled synthetic fixture fallback/i);
  });

  it("returns a safe model failure when JSON mode fails for an unknown note", async () => {
    const response = await worker.fetch(
      request({
        note: "Synthetic operative note. Left tympanoplasty. The tympanic membrane was intact.",
        caseHint: "unknown-case",
      }),
      {
        AI: {
          run: async () => {
            throw new Error("json mode failed");
          },
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ ok: false, errorCode: "MODEL_FAILED" });
  });

  it("does not use a selected demo fixture when the note has changed", async () => {
    const response = await worker.fetch(
      request({
        note: "Synthetic operative note. Right tympanoplasty. The tympanic membrane was intact.",
        caseHint: "hero-otomimix-is-joint",
      }),
      {
        AI: {
          run: async () => {
            throw new Error("json mode failed");
          },
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ ok: false, errorCode: "MODEL_FAILED" });
    expect(JSON.stringify(body)).not.toContain("hero-otomimix-is-joint");
  });

  it("uses exact note equality instead of a stale selected-case hint for fixture fallback", async () => {
    const fixture = getSyntheticCase("porp-reconstruction");
    const response = await worker.fetch(
      request({
        note: fixture.note,
        caseHint: "hero-otomimix-is-joint",
      }),
      {
        AI: {
          run: async () => {
            throw new Error("json mode failed");
          },
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      case: {
        caseId: fixture.id,
        repair: { reconstructionType: { value: "porp" } },
      },
    });
  });

  it("does not echo raw model error content in debug failures", async () => {
    const response = await worker.fetch(
      request({
        note: "Synthetic operative note. Left tympanoplasty. The tympanic membrane was intact.",
        caseHint: "unknown-case",
      }),
      {
        DEBUG_WORKER_ERRORS: "true",
        AI: {
          run: async () => {
            throw new Error("raw model response contained quoted evidence text");
          },
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({ ok: false, errorCode: "MODEL_FAILED", debugErrorType: "Error" });
    expect(JSON.stringify(body)).not.toMatch(/quoted evidence text|raw model response/i);
  });

  it("only returns CORS allow-origin for a configured allowed origin", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test", {
        method: "OPTIONS",
        headers: { Origin: "https://demo.example" },
      }),
      {
        ALLOWED_ORIGIN: "https://demo.example",
        AI: {
          run: async () => ({}),
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://demo.example");

    const blocked = await worker.fetch(
      new Request("https://worker.test", {
        method: "OPTIONS",
        headers: { Origin: "https://other.example" },
      }),
      {
        ALLOWED_ORIGIN: "https://demo.example",
        AI: {
          run: async () => ({}),
        },
      },
    );

    expect(blocked.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rate limits repeated extraction requests before model calls", async () => {
    let called = 0;
    const env = {
      RATE_LIMIT_REQUESTS_PER_MINUTE: "1",
      AI: {
        run: async () => {
          called += 1;
          return { response: { ...getSyntheticCase("hero-otomimix-is-joint").expected, extractionProvider: "cloudflare" } };
        },
      },
    };

    const first = await worker.fetch(
      request({ note: getSyntheticCase("hero-otomimix-is-joint").note }, { "CF-Connecting-IP": "203.0.113.99" }),
      env,
    );
    const second = await worker.fetch(
      request({ note: getSyntheticCase("hero-otomimix-is-joint").note }, { "CF-Connecting-IP": "203.0.113.99" }),
      env,
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(called).toBe(1);
    await expect(second.json()).resolves.toMatchObject({ ok: false, errorCode: "RATE_LIMITED" });
  });
});
