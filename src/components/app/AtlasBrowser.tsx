"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImageIcon, Search } from "lucide-react";
import {
  atlasAssetImageUrl,
  searchAtlasAssets,
  type AtlasAssetIndex,
  type AtlasAssetIndexItem,
} from "@/domain/atlas";
import { FieldLabel, Input } from "@/components/ui/Field";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; index: AtlasAssetIndex }
  | { status: "error"; message: string };

function AtlasAssetCard({ asset }: { asset: AtlasAssetIndexItem }) {
  const imageUrl = atlasAssetImageUrl(asset);
  return (
    <article className="atlas-card">
      <a href={asset.pageLink} target="_blank" rel="noreferrer" className="atlas-thumb-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`Atlas source asset ${asset.id}`} className="atlas-thumb" loading="lazy" />
      </a>
      <div className="min-w-0 space-y-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{asset.title}</h3>
        <p className="text-xs text-slate-600">
          {asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Dimensions unavailable"}
        </p>
        <a
          href={asset.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950"
        >
          Source image
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function AtlasBrowser() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("tympanoplasty ossiculoplasty");

  useEffect(() => {
    let active = true;
    fetch("/atlas-assets/stanford/index.json")
      .then((response) => {
        if (!response.ok) throw new Error("Atlas index could not be loaded.");
        return response.json() as Promise<AtlasAssetIndex>;
      })
      .then((index) => {
        if (active) setLoadState({ status: "ready", index });
      })
      .catch((error) => {
        if (active) {
          setLoadState({
            status: "error",
            message: error instanceof Error ? error.message : "Atlas index could not be loaded.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(() => {
    if (loadState.status !== "ready") return [];
    return searchAtlasAssets(loadState.index.assets, query, 10);
  }, [loadState, query]);

  return (
    <section className="surface p-5">
      <details>
        <summary className="cursor-pointer list-none">
          <span className="section-heading">Browse Stanford atlas references</span>
          {loadState.status === "ready" ? (
            <span className="ml-2 text-xs text-slate-600">
              {loadState.index.assetCount.toLocaleString()} scraped diagrams
            </span>
          ) : null}
        </summary>
        <div className="atlas-search-row mt-4">
          <p className="max-w-md text-sm text-slate-600">
            Search source captions for provenance only. Captions may name causes or anatomy that are not documented in the current case and must never be treated as case claims.
          </p>
          <div className="min-w-0 space-y-2">
            <FieldLabel htmlFor="atlas-search">Search atlas</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input
                id="atlas-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {loadState.status === "loading" ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            Loading atlas index
          </div>
        ) : null}

        {loadState.status === "error" ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {loadState.message}
          </p>
        ) : null}

        {loadState.status === "ready" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {results.length > 0 ? (
              results.map((asset) => <AtlasAssetCard key={asset.id} asset={asset} />)
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                No atlas matches.
              </p>
            )}
          </div>
        ) : null}
      </details>
    </section>
  );
}
