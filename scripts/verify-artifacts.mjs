import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = path.resolve("public/atlas-assets/stanford/manifest.json");
const INDEX_PATH = path.resolve("public/atlas-assets/stanford/index.json");

async function sha256(filePath) {
  const bytes = await readFile(filePath);
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const index = JSON.parse(await readFile(INDEX_PATH, "utf8"));
const failures = [];

if (manifest.assets.length !== 1140) {
  failures.push(`Expected 1140 manifest assets, found ${manifest.assets.length}.`);
}

if (index.assetCount !== manifest.assets.length || index.assets.length !== manifest.assets.length) {
  failures.push(
    `Index count mismatch: index assetCount=${index.assetCount}, index assets=${index.assets.length}, manifest assets=${manifest.assets.length}.`,
  );
}

for (const asset of manifest.assets) {
  const filePath = path.resolve(asset.localPath);
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      failures.push(`${asset.localPath} is not a file.`);
      continue;
    }
    const actual = await sha256(filePath);
    if (asset.bytes && actual.bytes !== asset.bytes) {
      failures.push(`${asset.localPath} byte mismatch: expected ${asset.bytes}, got ${actual.bytes}.`);
    }
    if (asset.sha256 && actual.sha256 !== asset.sha256) {
      failures.push(`${asset.localPath} hash mismatch.`);
    }
  } catch (error) {
    failures.push(`${asset.localPath} missing or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 50), failureCount: failures.length }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        manifestAssets: manifest.assets.length,
        indexAssets: index.assets.length,
        failedDownloads: manifest.failed,
        source: manifest.source,
      },
      null,
      2,
    ),
  );
}
