import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";

const BASE_URL = "https://otosurgeryatlas.stanford.edu";
const SITEMAP_URL = `${BASE_URL}/wp-sitemap.xml`;
const MANIFEST_PATH = path.resolve("public/atlas-assets/stanford/manifest.json");
const REPORT_JSON_PATH = path.resolve("docs/evaluation/atlas-page-reference-report.json");
const REPORT_MD_PATH = path.resolve("docs/evaluation/atlas-page-reference-report.md");
const USER_AGENT = "ai-oto-surgical-diagrammer/0.1 atlas page reference verifier";
const MAX_FETCH_ATTEMPTS = 5;
const PAGE_FETCH_CONCURRENCY = 2;

const IMAGE_EXTENSION_RE = /\.(?:jpe?g|png|gif|webp|svg)$/i;
const ABSOLUTE_IMAGE_RE = /https?:\/\/[^\s"'<>]+?\.(?:jpe?g|png|gif|webp|svg)(?:\?[^\s"'<>]*)?/gi;

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchText(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": USER_AGENT,
        },
      });
      if (response.ok) {
        return response.text();
      }

      lastError = new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
      if (!shouldRetryStatus(response.status) || attempt === MAX_FETCH_ATTEMPTS) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      if (attempt === MAX_FETCH_ATTEMPTS) {
        break;
      }
    }

    await sleep(500 * attempt);
  }

  throw lastError;
}

function locsFromXml(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeXml(match[1].trim()));
}

async function sitemapPageUrls() {
  const sitemapIndex = await fetchText(SITEMAP_URL);
  const sitemapUrls = locsFromXml(sitemapIndex);
  const pageUrlSet = new Set();

  for (const sitemapUrl of sitemapUrls) {
    const sitemap = await fetchText(sitemapUrl);
    for (const url of locsFromXml(sitemap)) {
      pageUrlSet.add(url);
    }
  }

  return [...pageUrlSet].sort();
}

function urlsFromSrcset(value) {
  return String(value)
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function urlsFromCss(value) {
  return [...String(value).matchAll(/url\((['"]?)(.*?)\1\)/gi)]
    .map((match) => match[2].trim())
    .filter(Boolean);
}

function candidateUrlsFromAttribute(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];

  return [
    text,
    ...urlsFromSrcset(text),
    ...urlsFromCss(text),
    ...[...text.matchAll(ABSOLUTE_IMAGE_RE)].map((match) => match[0]),
  ];
}

function safeDecodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function stripWordPressDerivative(pathname) {
  return pathname
    .replace(/-\d+x\d+(?=\.(?:jpe?g|png|gif|webp)$)/i, "")
    .replace(/-e\d{10,}(?=\.(?:jpe?g|png|gif|webp)$)/i, "")
    .replace(/-scaled(?=\.(?:jpe?g|png|gif|webp)$)/i, "");
}

function canonicalImageKey(rawUrl, pageUrl) {
  if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) return null;

  let parsed;
  try {
    parsed = new URL(rawUrl, pageUrl);
  } catch {
    return null;
  }

  const pathname = safeDecodePathname(parsed.pathname);
  if (!IMAGE_EXTENSION_RE.test(pathname)) return null;

  const host = parsed.hostname.toLowerCase();
  const pathKey = stripWordPressDerivative(pathname).toLowerCase();
  const looksLikeAtlasUpload =
    (host === "tobacco-img.stanford.edu" && pathKey.startsWith("/otosurgery/")) ||
    pathKey.includes("/wp-content/uploads/");

  if (!looksLikeAtlasUpload) return null;

  const uploadMatch = pathKey.match(/(?:\/otosurgery|\/wp-content\/uploads)\/(\d{4})\/(\d{2})\/(?:\d{8}\/)?([^/]+)$/);
  if (uploadMatch) {
    return `${uploadMatch[1]}/${uploadMatch[2]}/${uploadMatch[3]}`;
  }

  return `${host}${pathKey}`;
}

function pageImageReferences(html, pageUrl) {
  const dom = new JSDOM(html);
  const refs = new Map();

  const addCandidate = (candidate) => {
    const key = canonicalImageKey(candidate, pageUrl);
    if (!key) return;
    const parsed = new URL(candidate, pageUrl);
    const existing = refs.get(key);
    refs.set(key, {
      canonicalKey: key,
      sampleUrl: existing?.sampleUrl ?? parsed.href,
      pages: new Set([...(existing?.pages ?? []), pageUrl]),
    });
  };

  for (const element of dom.window.document.querySelectorAll("*")) {
    for (const attribute of element.getAttributeNames()) {
      for (const candidate of candidateUrlsFromAttribute(element.getAttribute(attribute))) {
        addCandidate(candidate);
      }
    }
  }

  for (const match of html.matchAll(ABSOLUTE_IMAGE_RE)) {
    addCandidate(match[0]);
  }

  return refs;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function markdownReport(result) {
  const lines = [
    "# Atlas Page Reference Verification",
    "",
    `Checked at: ${result.checkedAt}`,
    "",
    `- Sitemap pages crawled: ${result.sitemapPagesCrawled}`,
    `- Pages failed: ${result.failedPages.length}`,
    `- Unique page-referenced atlas image originals: ${result.uniquePageImageReferences}`,
    `- Manifest image assets: ${result.manifestAssets}`,
    `- Missing manifest originals: ${result.missingManifestReferences.length}`,
    `- Unreferenced manifest assets: ${result.unreferencedManifestAssets.length}`,
    `- Result: ${result.ok ? "PASS" : "FAIL"}`,
    "",
  ];

  if (result.missingManifestReferences.length > 0) {
    lines.push("## Missing References", "");
    for (const item of result.missingManifestReferences.slice(0, 25)) {
      lines.push(`- ${item.sampleUrl}`);
      lines.push(`  - Seen on: ${item.pages.slice(0, 3).join(", ")}`);
    }
    lines.push("");
  }

  if (result.failedPages.length > 0) {
    lines.push("## Failed Pages", "");
    for (const item of result.failedPages.slice(0, 25)) {
      lines.push(`- ${item.url}: ${item.error}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const manifestByKey = new Map();
for (const asset of manifest.assets) {
  const key = canonicalImageKey(asset.sourceUrl, manifest.source);
  if (key) manifestByKey.set(key, asset);
}

const pageUrls = await sitemapPageUrls();
const pageResults = await mapLimit(pageUrls, PAGE_FETCH_CONCURRENCY, async (url) => {
  try {
    const html = await fetchText(url);
    return {
      url,
      ok: true,
      references: [...pageImageReferences(html, url).values()].map((reference) => ({
        ...reference,
        pages: [...reference.pages],
      })),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      references: [],
    };
  }
});

const referencesByKey = new Map();
for (const pageResult of pageResults) {
  for (const reference of pageResult.references) {
    const existing = referencesByKey.get(reference.canonicalKey);
    referencesByKey.set(reference.canonicalKey, {
      canonicalKey: reference.canonicalKey,
      sampleUrl: existing?.sampleUrl ?? reference.sampleUrl,
      pages: Array.from(new Set([...(existing?.pages ?? []), ...reference.pages])).sort(),
    });
  }
}

const missingManifestReferences = [...referencesByKey.values()]
  .filter((reference) => !manifestByKey.has(reference.canonicalKey))
  .sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey));

const unreferencedManifestAssets = [...manifestByKey.entries()]
  .filter(([key]) => !referencesByKey.has(key))
  .map(([, asset]) => ({
    id: asset.id,
    title: asset.title || asset.slug,
    sourceUrl: asset.sourceUrl,
  }))
  .sort((a, b) => a.id - b.id);

const failedPages = pageResults
  .filter((pageResult) => !pageResult.ok)
  .map((pageResult) => ({
    url: pageResult.url,
    error: pageResult.error,
  }));

const result = {
  ok: failedPages.length === 0 && missingManifestReferences.length === 0,
  checkedAt: new Date().toISOString(),
  source: BASE_URL,
  sitemap: SITEMAP_URL,
  sitemapPagesCrawled: pageResults.length,
  failedPages,
  uniquePageImageReferences: referencesByKey.size,
  manifestAssets: manifest.assets.length,
  missingManifestReferences,
  unreferencedManifestAssets,
};

await writeFile(REPORT_JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(REPORT_MD_PATH, markdownReport(result));

console.log(JSON.stringify({
  ok: result.ok,
  sitemapPagesCrawled: result.sitemapPagesCrawled,
  failedPages: result.failedPages.length,
  uniquePageImageReferences: result.uniquePageImageReferences,
  manifestAssets: result.manifestAssets,
  missingManifestReferences: result.missingManifestReferences.length,
  unreferencedManifestAssets: result.unreferencedManifestAssets.length,
  json: REPORT_JSON_PATH,
  markdown: REPORT_MD_PATH,
}, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
