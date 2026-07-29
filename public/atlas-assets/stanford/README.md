# Stanford Oto Surgery Atlas Assets

This folder contains a reproducible scrape of image assets from:

https://otosurgeryatlas.stanford.edu/

The user stated they have permission to scrape these diagrams/assets.

- `manifest.json` records source metadata, captions, dimensions, source URLs, local paths, and checksums.
- `index.json` is a compact searchable index derived from the manifest.
- `files/` contains the downloaded image binaries and is ignored by git because the scrape is about 999 MB.

Regenerate with:

```bash
pnpm scrape:atlas
pnpm index:atlas
pnpm verify:artifacts
pnpm verify:atlas:remote
pnpm verify:atlas:pages
```
