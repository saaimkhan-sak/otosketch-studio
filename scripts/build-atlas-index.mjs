import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = path.resolve("public/atlas-assets/stanford/manifest.json");
const INDEX_PATH = path.resolve("public/atlas-assets/stanford/index.json");

function words(value) {
  return Array.from(
    new Set(
      String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 3),
    ),
  ).slice(0, 80);
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const assets = manifest.assets.map((asset) => {
  const searchableText = [
    asset.title,
    asset.altText,
    asset.caption,
    asset.description,
    asset.slug,
  ].join(" ");
  return {
    id: asset.id,
    title: asset.title || asset.slug,
    sourceUrl: asset.sourceUrl,
    pageLink: asset.pageLink,
    localPath: asset.localPath,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    keywords: words(searchableText),
  };
});

const index = {
  source: manifest.source,
  builtAt: new Date().toISOString(),
  assetCount: assets.length,
  assets,
};

await writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Wrote ${assets.length} atlas index entries to ${INDEX_PATH}`);
