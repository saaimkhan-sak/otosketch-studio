import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve("public/medical-art/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

for (const asset of manifest.assets) {
  const filePath = path.resolve(asset.path);
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      failures.push(`${asset.path} is not a file.`);
      continue;
    }
    const bytes = await readFile(filePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== asset.bytes) {
      failures.push(`${asset.path} byte mismatch: expected ${asset.bytes}, got ${bytes.length}.`);
    }
    if (sha256 !== asset.sha256) {
      failures.push(`${asset.path} hash mismatch.`);
    }
    if (!asset.source.startsWith("https://")) {
      failures.push(`${asset.path} is missing an HTTPS source.`);
    }
    if (!["CC BY 4.0", "Public Domain"].includes(asset.license)) {
      failures.push(`${asset.path} has an unsupported license declaration.`);
    }
  } catch (error) {
    failures.push(
      `${asset.path} missing or unreadable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        assets: manifest.assets.length,
        licenses: [...new Set(manifest.assets.map((asset) => asset.license))],
      },
      null,
      2,
    ),
  );
}
