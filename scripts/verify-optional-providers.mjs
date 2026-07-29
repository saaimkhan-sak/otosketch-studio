import { spawnSync } from "node:child_process";

async function checkOllama() {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      return { available: false, reason: `HTTP ${response.status}` };
    }
    const body = await response.json();
    return {
      available: true,
      baseUrl,
      models: Array.isArray(body.models) ? body.models.map((model) => model.name).slice(0, 20) : [],
    };
  } catch (error) {
    return {
      available: false,
      baseUrl,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkCloudflareWorker() {
  const url = process.env.CLOUDFLARE_WORKER_EXTRACT_URL;
  if (!url) {
    return { configured: false, reason: "CLOUDFLARE_WORKER_EXTRACT_URL is not set." };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: "Synthetic operative note. Left tympanoplasty. The tympanic membrane was intact.",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json().catch(() => null);
    return {
      configured: true,
      reachable: true,
      status: response.status,
      responseOk: response.ok,
      ok: body?.ok === true,
      message: body?.message ?? null,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkWranglerAuth() {
  const result = spawnSync("pnpm", ["exec", "wrangler", "whoami"], {
    encoding: "utf8",
    timeout: 15_000,
  });
  const output = `${result.stdout}${result.stderr}`;
  return {
    authenticated: result.status === 0 && !/not authenticated/i.test(output) && /Account Name|User ID|You are logged in/i.test(output),
    exitCode: result.status,
    output: output.trim().slice(0, 1000),
  };
}

const report = {
  checkedAt: new Date().toISOString(),
  ollama: await checkOllama(),
  cloudflareWorker: await checkCloudflareWorker(),
  wrangler: checkWranglerAuth(),
};

console.log(JSON.stringify(report, null, 2));
