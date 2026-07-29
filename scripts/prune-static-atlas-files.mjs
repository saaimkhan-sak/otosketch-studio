import { rm, stat } from "node:fs/promises";

const atlasFilesDir = new URL("../out/atlas-assets/stanford/files/", import.meta.url);

async function directorySize(pathUrl) {
  try {
    const info = await stat(pathUrl);
    return info.isDirectory();
  } catch {
    return false;
  }
}

if (await directorySize(atlasFilesDir)) {
  await rm(atlasFilesDir, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, pruned: "out/atlas-assets/stanford/files" }, null, 2));
} else {
  console.log(JSON.stringify({ ok: true, pruned: null, reason: "Atlas files directory not present." }, null, 2));
}
