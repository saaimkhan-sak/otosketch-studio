import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasBrowser } from "@/components/app/AtlasBrowser";
import {
  atlasAssetImageUrl,
  localPathToPublicUrl,
  searchAtlasAssets,
  type AtlasAssetIndexItem,
} from "@/domain/atlas";

const assets: AtlasAssetIndexItem[] = [
  {
    id: 1,
    title: "Tympanoplasty",
    sourceUrl: "https://example.test/tympanoplasty.png",
    pageLink: "https://example.test/page",
    localPath: "public/atlas-assets/stanford/files/1-tympanoplasty.png",
    width: 800,
    height: 600,
    mimeType: "image/png",
    keywords: ["tympanoplasty", "eardrum"],
  },
  {
    id: 2,
    title: "Ossicular chain reconstruction",
    sourceUrl: "https://example.test/ossicles.png",
    pageLink: "https://example.test/page-2",
    localPath: "public/atlas-assets/stanford/files/2-ossicles.png",
    width: 640,
    height: 480,
    mimeType: "image/png",
    keywords: ["ossiculoplasty", "incus", "stapes"],
  },
];

describe("atlas helpers", () => {
  it("converts public asset paths to browser URLs", () => {
    expect(localPathToPublicUrl("public/atlas-assets/stanford/files/example.png")).toBe(
      "/atlas-assets/stanford/files/example.png",
    );
  });

  it("can use remote source images for lightweight static deployments", () => {
    expect(atlasAssetImageUrl(assets[0], "remote")).toBe("https://example.test/tympanoplasty.png");
    expect(atlasAssetImageUrl(assets[0], "local")).toBe("/atlas-assets/stanford/files/1-tympanoplasty.png");
  });

  it("searches by title and keywords", () => {
    expect(searchAtlasAssets(assets, "incus")).toHaveLength(1);
    expect(searchAtlasAssets(assets, "incus")[0].title).toMatch(/Ossicular/);
  });
});

describe("AtlasBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and filters the scraped atlas index", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "https://otosurgeryatlas.stanford.edu",
          builtAt: new Date().toISOString(),
          assetCount: assets.length,
          assets,
        }),
      })),
    );

    render(<AtlasBrowser />);
    expect(await screen.findByText("Tympanoplasty")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search atlas"));
    await user.type(screen.getByLabelText("Search atlas"), "incus");
    expect(await screen.findByText("Ossicular chain reconstruction")).toBeInTheDocument();
    expect(screen.queryByText("Tympanoplasty")).not.toBeInTheDocument();
  });
});
