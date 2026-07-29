import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://otosurgeryatlas.stanford.edu";
const MEDIA_ENDPOINT = `${BASE_URL}/wp-json/wp/v2/media`;
const MANIFEST_PATH = path.resolve("public/atlas-assets/stanford/manifest.json");

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ai-oto-surgical-diagrammer/0.1 asset inventory verifier",
    },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  return {
    json: await response.json(),
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? "1"),
    total: Number(response.headers.get("x-wp-total") ?? "0"),
  };
}

async function fetchAllMedia() {
  const first = await fetchJson(`${MEDIA_ENDPOINT}?per_page=100&page=1`);
  const media = [...first.json];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const result = await fetchJson(`${MEDIA_ENDPOINT}?per_page=100&page=${page}`);
    media.push(...result.json);
  }
  return {
    media,
    total: first.total,
    totalPages: first.totalPages,
  };
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const { media, total, totalPages } = await fetchAllMedia();
const remoteImages = media.filter((item) => item.media_type === "image" && (item.source_url || item.guid?.rendered));

const localIds = new Set(manifest.assets.map((asset) => asset.id));
const remoteIds = new Set(remoteImages.map((asset) => asset.id));
const missingLocalIds = [...remoteIds].filter((id) => !localIds.has(id));
const extraLocalIds = [...localIds].filter((id) => !remoteIds.has(id));

const result = {
  ok: missingLocalIds.length === 0 && extraLocalIds.length === 0 && manifest.failed === 0,
  source: BASE_URL,
  remoteTotalMedia: total,
  remoteTotalPages: totalPages,
  remoteImageAssets: remoteImages.length,
  localManifestAssets: manifest.assets.length,
  failedDownloads: manifest.failed,
  missingLocalIds,
  extraLocalIds,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
