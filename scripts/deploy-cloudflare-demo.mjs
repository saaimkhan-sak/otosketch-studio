import { spawn } from "node:child_process";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const projectName =
  process.env.CLOUDFLARE_PAGES_PROJECT_NAME ?? process.env.PAGES_PROJECT_NAME ?? "ai-oto-surgical-diagrammer";
const compatibilityDate = process.env.CLOUDFLARE_PAGES_COMPATIBILITY_DATE ?? "2026-06-27";
const extractionEndpoint = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL?.trim() || "/api/extract";
const requireLiveWorkersAi = process.env.REQUIRE_LIVE_WORKERS_AI === "true";

function commandString(cmd, commandArgs) {
  return [cmd, ...commandArgs]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

function run(cmd, commandArgs, options = {}) {
  const executable = cmd === "pnpm" ? "corepack" : cmd;
  const executableArgs = cmd === "pnpm" ? ["pnpm", ...commandArgs] : commandArgs;
  const display = commandString(executable, executableArgs);
  if (dryRun) {
    return Promise.resolve({ status: 0, output: "", display });
  }

  return new Promise((resolve) => {
    const child = spawn(executable, executableArgs, {
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      output += chunk.toString();
    });
    child.on("close", (status) => resolve({ status: status ?? 1, output, display }));
  });
}

function parsePagesUrl(output) {
  return output.match(/https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pages\.dev\b/i)?.[0] ?? null;
}

function productionPagesUrl() {
  return `https://${projectName}.pages.dev`;
}

function requireSuccess(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed with status ${result.status}.`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertAuthenticated() {
  const result = await run("pnpm", ["exec", "wrangler", "whoami"]);
  if (dryRun) return result;

  const authenticated =
    result.status === 0 && !/not authenticated/i.test(result.output) && /Account Name|User ID|You are logged in/i.test(result.output);
  if (!authenticated) {
    throw new Error("Wrangler is not authenticated. Run `pnpm exec wrangler login`, then retry.");
  }
  return result;
}

async function fetchWithRetry(url, options = {}, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
  throw lastError;
}

async function ensurePagesProject() {
  const list = await run("pnpm", ["exec", "wrangler", "pages", "project", "list"]);
  if (list.status === 0 && list.output.includes(projectName)) {
    return list;
  }

  const result = await run("pnpm", [
    "exec",
    "wrangler",
    "pages",
    "project",
    "create",
    projectName,
    "--production-branch",
    "main",
    "--compatibility-date",
    compatibilityDate,
  ]);
  if (result.status === 0 || /already exists|project.*exists/i.test(result.output)) {
    return result;
  }
  throw new Error(`Pages project setup failed with status ${result.status}.`);
}

function absoluteExtractionUrl(pagesUrl) {
  return new URL(extractionEndpoint, pagesUrl).href;
}

async function runWithRetry(label, commandFactory, attempts = 3) {
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await commandFactory();
    if (result.status === 0) return result;
    if (attempt < attempts) {
      await sleep(attempt * 2000);
    }
  }
  requireSuccess(result, label);
  return result;
}

const plan = [
  "Check Wrangler authentication.",
  "Build the lightweight static Pages artifact with the same-origin extraction endpoint embedded.",
  "Verify the static artifact size, headers, atlas index, and extraction endpoint.",
  "Smoke-test the static artifact locally.",
  "Compile the Pages Function that reuses the safe Cloudflare extraction Worker handler.",
  "Create the Cloudflare Pages project if it does not already exist.",
  "Deploy out/ and functions/ to Cloudflare Pages.",
  requireLiveWorkersAi
    ? "Verify live Workers AI extraction at the persistent Pages Function endpoint with no fixture fallback."
    : "Verify the persistent Pages Function endpoint safety path, including no-store responses and PHI blocking.",
  "Verify Pages reachability.",
];

try {
  if (dryRun) {
    const plannedCommands = [
      commandString("pnpm", ["exec", "wrangler", "whoami"]),
      `NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL=${extractionEndpoint} pnpm build:static:remote-atlas`,
      `EXPECT_PUBLIC_WORKER_URL=${extractionEndpoint} pnpm verify:static`,
      "pnpm verify:static:runtime",
      commandString("pnpm", [
        "exec",
        "wrangler",
        "pages",
        "functions",
        "build",
        "functions",
        "--compatibility-date",
        compatibilityDate,
        "--build-output-directory",
        "out",
      ]),
      commandString("pnpm", [
        "exec",
        "wrangler",
        "pages",
        "project",
        "create",
        projectName,
        "--production-branch",
        "main",
        "--compatibility-date",
        compatibilityDate,
      ]),
      commandString("pnpm", ["exec", "wrangler", "pages", "deploy", "out", "--project-name", projectName, "--branch", "main"]),
      requireLiveWorkersAi
        ? "CLOUDFLARE_WORKER_EXTRACT_URL=<pages-url>/api/extract REQUIRE_LIVE_WORKERS_AI=true pnpm verify:worker"
        : "CLOUDFLARE_WORKER_EXTRACT_URL=<pages-url>/api/extract pnpm verify:worker",
      "GET <pages-url>",
      commandString("pnpm", ["exec", "wrangler", "deploy", "--config", "worker/wrangler.toml", "--keep-vars"]),
      "Optional standalone Worker deploy still requires a registered workers.dev subdomain.",
    ];
    console.log(JSON.stringify({ ok: true, dryRun: true, projectName, extractionEndpoint, plan, plannedCommands }, null, 2));
    process.exit(0);
  }

  await assertAuthenticated();

  const staticBuild = await run("pnpm", ["build:static:remote-atlas"], {
    env: {
      NEXT_PUBLIC_CLOUDFLARE_WORKER_EXTRACT_URL: extractionEndpoint,
    },
  });
  requireSuccess(staticBuild, "Static Pages build");

  const staticVerify = await run("pnpm", ["verify:static"], {
    env: {
      EXPECT_PUBLIC_WORKER_URL: extractionEndpoint,
    },
  });
  requireSuccess(staticVerify, "Static export verification");

  const runtimeVerify = await run("pnpm", ["verify:static:runtime"]);
  requireSuccess(runtimeVerify, "Static runtime verification");

  const functionsBuild = await run("pnpm", [
    "exec",
    "wrangler",
    "pages",
    "functions",
    "build",
    "functions",
    "--compatibility-date",
    compatibilityDate,
    "--build-output-directory",
    "out",
    "--output-routes-path",
    ".wrangler/pages-functions-routes.json",
    "--outdir",
    ".wrangler/pages-functions-build",
  ]);
  requireSuccess(functionsBuild, "Pages Functions build");

  await ensurePagesProject();

  const pagesDeploy = await run("pnpm", ["exec", "wrangler", "pages", "deploy", "out", "--project-name", projectName, "--branch", "main"]);
  requireSuccess(pagesDeploy, "Pages deploy");

  const deploymentUrl = parsePagesUrl(pagesDeploy.output);
  const pagesUrl = process.env.CLOUDFLARE_PAGES_URL ?? productionPagesUrl();

  const extractionUrl = absoluteExtractionUrl(pagesUrl);
  await runWithRetry("Pages Function extraction verification", () =>
    run("pnpm", ["verify:worker"], {
      env: {
        CLOUDFLARE_WORKER_EXTRACT_URL: extractionUrl,
        ...(requireLiveWorkersAi ? { REQUIRE_LIVE_WORKERS_AI: "true" } : {}),
      },
    }),
  );

  const pageResponse = await fetchWithRetry(pagesUrl);

  console.log(
    JSON.stringify(
      {
        ok: true,
        pagesUrl,
        deploymentUrl,
        extractionUrl,
        pagesStatus: pageResponse.status,
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
        dryRun,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
