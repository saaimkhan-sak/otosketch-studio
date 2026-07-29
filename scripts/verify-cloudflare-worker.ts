import { getSyntheticCase } from "../src/fixtures/syntheticCases";

const workerUrl = process.env.CLOUDFLARE_WORKER_EXTRACT_URL ?? process.argv[2];
const requireLiveWorkersAi = process.env.REQUIRE_LIVE_WORKERS_AI === "true";

if (!workerUrl) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "CLOUDFLARE_WORKER_EXTRACT_URL or a URL argument is required.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

async function postWorker(body: unknown) {
  const response = await fetch(workerUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = await response.json().catch(() => null);
  return {
    status: response.status,
    cacheControl: response.headers.get("cache-control"),
    body: json,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resultSummary(result: Awaited<ReturnType<typeof postWorker>>) {
  const body = result.body as
    | {
        ok?: boolean;
        case?: {
          procedure?: { family?: { value?: string } };
          repair?: {
            reconstructionType?: { value?: string };
            reconstructionMaterial?: { value?: string };
          };
        };
        durationMs?: number;
        warnings?: string[];
        errorCode?: string;
        message?: string;
      }
    | null;

  return {
    status: result.status,
    ok: body?.ok === true,
    cacheControl: result.cacheControl,
    durationMs: body?.durationMs,
    warnings: body?.warnings ?? [],
    family: body?.case?.procedure?.family?.value,
    reconstructionType: body?.case?.repair?.reconstructionType?.value,
    reconstructionMaterial: body?.case?.repair?.reconstructionMaterial?.value,
    errorCode: body?.errorCode,
    message: body?.message,
  };
}

function isLiveSuccess(summary: ReturnType<typeof resultSummary>) {
  return (
    summary.ok &&
    summary.family === "tympanoplasty_with_ossiculoplasty" &&
    summary.reconstructionType === "bone_cement_bridge" &&
    summary.reconstructionMaterial === "otomimix" &&
    !summary.warnings.some((warning) => /fixture fallback/i.test(warning))
  );
}

async function postWorkerWithLiveRetry(body: unknown) {
  let result = await postWorker(body);
  let summary = resultSummary(result);
  let attempts = 1;

  while (requireLiveWorkersAi && attempts < 3 && !isLiveSuccess(summary)) {
    await wait(attempts * 2000);
    result = await postWorker(body);
    summary = resultSummary(result);
    attempts += 1;
  }

  return { result, summary, attempts };
}

const hero = getSyntheticCase("hero-otomimix-is-joint");
const hinted = await postWorkerWithLiveRetry({ note: hero.note, caseHint: hero.id });
const unhinted = await postWorkerWithLiveRetry({ note: hero.note });
const phiBlocked = await postWorker({ note: "Patient: Jane Sample. MRN 123456." });

const hintedSummary = hinted.summary;
const unhintedSummary = unhinted.summary;
const phiSummary = resultSummary(phiBlocked);
const hintedUsesFallback = hintedSummary.warnings.some((warning) => /fixture fallback/i.test(warning));
const liveWorkersAiExtraction = isLiveSuccess(hintedSummary) && isLiveSuccess(unhintedSummary);

const safetyOk =
  hintedSummary.status === 200 &&
  hintedSummary.ok &&
  hintedSummary.cacheControl === "no-store" &&
  typeof hintedSummary.durationMs === "number" &&
  phiSummary.status === 422 &&
  phiSummary.errorCode === "POSSIBLE_PHI" &&
  phiSummary.cacheControl === "no-store";

const report = {
  ok: safetyOk && (!requireLiveWorkersAi || liveWorkersAiExtraction),
  url: workerUrl,
  hintedSyntheticHero: hintedSummary,
  unhintedSyntheticHero: unhintedSummary,
  phiBlocked: phiSummary,
  attempts: {
    hinted: hinted.attempts,
    unhinted: unhinted.attempts,
  },
  hintedUsesFallback,
  liveWorkersAiExtraction,
  requireLiveWorkersAi,
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  process.exitCode = 1;
}
