import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out");
const MAX_BYTES = Number(process.env.MAX_STATIC_EXPORT_BYTES ?? 25 * 1024 * 1024);
const EXPECT_PUBLIC_WORKER_URL = process.env.EXPECT_PUBLIC_WORKER_URL;

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function directorySize(dirPath) {
  const { readdir } = await import("node:fs/promises");
  let total = 0;
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(entryPath);
    } else if (entry.isFile()) {
      total += (await stat(entryPath)).size;
    }
  }
  return total;
}

async function staticTextHaystack() {
  const { readdir } = await import("node:fs/promises");
  const chunksDir = path.join(OUT_DIR, "_next", "static");
  const parts = [];

  async function collectTextFiles(dirPath) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await collectTextFiles(entryPath);
      } else if (entry.isFile() && /\.(js|html|txt|json)$/.test(entry.name)) {
        parts.push(await readFile(entryPath, "utf8"));
      }
    }
  }

  if (existsSync(chunksDir)) {
    await collectTextFiles(chunksDir);
  }
  if (await fileExists(path.join(OUT_DIR, "index.html"))) {
    parts.push(await readFile(path.join(OUT_DIR, "index.html"), "utf8"));
  }
  return parts.join("\n");
}

const failures = [];

if (!existsSync(OUT_DIR)) {
  failures.push("Static export directory out/ does not exist. Run pnpm build:static first.");
} else {
  const requiredFiles = [
    "index.html",
    "_headers",
    "medical-art/nih/inner-ear.svg",
    "medical-art/servier/ear-cutaway.png",
    "medical-art/servier/inner-ear.png",
    "medical-art/servier/inner-ear-components/auditory-nerve.png",
    "medical-art/servier/inner-ear-components/cochlea.png",
    "medical-art/servier/inner-ear-components/eardrum.png",
    "medical-art/servier/inner-ear-components/incus.png",
    "medical-art/servier/inner-ear-components/malleus.png",
    "medical-art/servier/inner-ear-components/stapes.png",
  ];

  for (const required of requiredFiles) {
    if (!(await fileExists(path.join(OUT_DIR, required)))) {
      failures.push(`Missing required static export file: out/${required}`);
    }
  }

  const bytes = await directorySize(OUT_DIR);
  if (bytes > MAX_BYTES) {
    failures.push(`Static export is too large: ${bytes} bytes exceeds ${MAX_BYTES} bytes.`);
  }

  if (await fileExists(path.join(OUT_DIR, "_headers"))) {
    const headers = await readFile(path.join(OUT_DIR, "_headers"), "utf8");
    for (const expected of ["Content-Security-Policy:", "Referrer-Policy:", "X-Content-Type-Options:"]) {
      if (!headers.includes(expected)) {
        failures.push(`out/_headers is missing ${expected}`);
      }
    }
  }

  if (EXPECT_PUBLIC_WORKER_URL) {
    const haystack = await staticTextHaystack();
    if (!haystack.includes(EXPECT_PUBLIC_WORKER_URL)) {
      failures.push(`Static export does not include expected public Worker URL: ${EXPECT_PUBLIC_WORKER_URL}`);
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  const bytes = await directorySize(OUT_DIR);
  console.log(
    JSON.stringify(
      {
        ok: true,
        outDir: OUT_DIR,
        bytes,
        maxBytes: MAX_BYTES,
        workerUrlChecked: Boolean(EXPECT_PUBLIC_WORKER_URL),
        medicalArtReady: await fileExists(path.join(OUT_DIR, "medical-art", "nih", "inner-ear.svg")),
      },
      null,
      2,
    ),
  );
}
