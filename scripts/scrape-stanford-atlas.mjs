import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = "https://otosurgeryatlas.stanford.edu";
const MEDIA_ENDPOINT = `${BASE_URL}/wp-json/wp/v2/media`;
const OUT_DIR = path.resolve("public/atlas-assets/stanford");
const FILES_DIR = path.join(OUT_DIR, "files");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const limit = args.has("limit") ? Number(args.get("limit")) : Number.POSITIVE_INFINITY;
const dryRun = args.get("dry-run") === "true";

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFilePart(value) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function extensionFromUrl(url, mimeType) {
  const parsed = new URL(url);
  const ext = path.extname(parsed.pathname).replace(/[^.\w]/g, "");
  if (ext) return ext.toLowerCase();
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/svg+xml") return ".svg";
  return ".bin";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ai-oto-surgical-diagrammer/0.1 asset provenance scraper",
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
  const firstUrl = `${MEDIA_ENDPOINT}?per_page=100&page=1`;
  const first = await fetchJson(firstUrl);
  const media = [...first.json];
  const totalPages = first.totalPages;

  for (let page = 2; page <= totalPages; page += 1) {
    const pageUrl = `${MEDIA_ENDPOINT}?per_page=100&page=${page}`;
    const result = await fetchJson(pageUrl);
    media.push(...result.json);
  }

  return {
    media: media.slice(0, Number.isFinite(limit) ? limit : media.length),
    total: first.total,
    totalPages,
  };
}

async function existingManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    const result = await stat(filePath);
    return result.isFile() && result.size > 0;
  } catch {
    return false;
  }
}

async function downloadFile(url, destination) {
  if (await fileExists(destination)) {
    const bytes = await readFile(destination);
    return {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      skipped: true,
    };
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ai-oto-surgical-diagrammer/0.1 asset provenance scraper",
    },
  });
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  await writeFile(destination, bytes);
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    skipped: false,
  };
}

function assetFromMedia(item) {
  const sourceUrl = item.source_url || item.guid?.rendered;
  const mimeType = item.mime_type || "";
  const title = stripHtml(item.title?.rendered);
  const slug = item.slug || sanitizeFilePart(title) || `media-${item.id}`;
  const ext = extensionFromUrl(sourceUrl, mimeType);
  const fileName = `${item.id}-${sanitizeFilePart(slug) || "asset"}${ext}`;
  const relativePath = `public/atlas-assets/stanford/files/${fileName}`;

  return {
    id: item.id,
    slug,
    title,
    altText: item.alt_text ?? "",
    caption: stripHtml(item.caption?.rendered),
    description: stripHtml(item.description?.rendered),
    mimeType,
    mediaType: item.media_type,
    sourceUrl,
    pageLink: item.link,
    localPath: relativePath,
    width: item.media_details?.width ?? null,
    height: item.media_details?.height ?? null,
    date: item.date_gmt ?? item.date ?? null,
  };
}

async function main() {
  await mkdir(FILES_DIR, { recursive: true });
  const priorManifest = await existingManifest();
  const { media, total, totalPages } = await fetchAllMedia();
  const imageMedia = media.filter((item) => item.media_type === "image" && (item.source_url || item.guid?.rendered));
  const assets = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of imageMedia) {
    const asset = assetFromMedia(item);
    const destination = path.resolve(asset.localPath);
    try {
      if (!dryRun) {
        const result = await downloadFile(asset.sourceUrl, destination);
        asset.bytes = result.bytes;
        asset.sha256 = result.sha256;
        if (result.skipped) skipped += 1;
        else downloaded += 1;
      }
      assets.push(asset);
      process.stdout.write(
        `${dryRun ? "would download" : "asset"} ${assets.length}/${imageMedia.length}: ${asset.title || asset.slug}\n`,
      );
    } catch (error) {
      failed += 1;
      assets.push({
        ...asset,
        error: error instanceof Error ? error.message : String(error),
      });
      process.stderr.write(`failed ${asset.sourceUrl}: ${asset.error}\n`);
    }
  }

  const manifest = {
    source: BASE_URL,
    sourceApi: MEDIA_ENDPOINT,
    permissionNote: "User stated they have permission to scrape these atlas diagrams/assets.",
    scrapedAt: new Date().toISOString(),
    totalMediaReportedByApi: total,
    totalPagesReportedByApi: totalPages,
    imageAssetsFound: imageMedia.length,
    downloaded,
    skippedExisting: skipped,
    failed,
    previousScrapeAt: priorManifest?.scrapedAt ?? null,
    assets,
  };

  if (!dryRun) {
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  process.stdout.write(
    `Done. Found ${imageMedia.length} image assets. Downloaded ${downloaded}, skipped ${skipped}, failed ${failed}.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
