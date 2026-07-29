export interface AtlasAssetIndexItem {
  id: number;
  title: string;
  sourceUrl: string;
  pageLink: string;
  localPath: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  keywords: string[];
}

export interface AtlasAssetIndex {
  source: string;
  builtAt: string;
  assetCount: number;
  assets: AtlasAssetIndexItem[];
}

export function localPathToPublicUrl(localPath: string) {
  return localPath.replace(/^public/, "");
}

export function atlasAssetImageUrl(asset: AtlasAssetIndexItem, imageSource = process.env.NEXT_PUBLIC_ATLAS_IMAGE_SOURCE) {
  return imageSource === "remote" ? asset.sourceUrl : localPathToPublicUrl(asset.localPath);
}

export function searchAtlasAssets(assets: AtlasAssetIndexItem[], query: string, limit = 12) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return assets.slice(0, limit);

  const terms = normalized.split(/\s+/).filter(Boolean);
  return assets
    .map((asset) => {
      const haystack = `${asset.title} ${asset.keywords.join(" ")}`.toLowerCase();
      const score = terms.reduce((total, term) => {
        if (asset.title.toLowerCase().includes(term)) return total + 4;
        if (asset.keywords.includes(term)) return total + 2;
        if (haystack.includes(term)) return total + 1;
        return total;
      }, 0);
      return { asset, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.asset.id - b.asset.id)
    .slice(0, limit)
    .map((entry) => entry.asset);
}
