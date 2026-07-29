import { ExternalLink, LockKeyhole } from "lucide-react";
import type { AtlasUsageRights } from "@/domain/atlasUsage";
import {
  getAtlasPanelAsset,
  type AtlasTemplateSelection,
} from "@/domain/atlasTemplates";

interface AtlasRightsNoticeProps {
  selection: Extract<AtlasTemplateSelection, { status: "ready" }>;
  rights: AtlasUsageRights;
}

export function AtlasRightsNotice({ selection, rights }: AtlasRightsNoticeProps) {
  const assets = ["found", "repaired"] as const;
  const uniqueAssets = Array.from(
    new Map(
      assets.map((panel) => {
        const asset = getAtlasPanelAsset(selection.template, panel);
        return [asset.id, asset] as const;
      }),
    ).values(),
  );

  return (
    <aside className="atlas-rights-notice" role="note" aria-label="Stanford atlas usage status">
      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
      <div>
        <strong>Stanford background is prepared but not embedded</strong>
        <p>
          Public and clinic display stays on the original deterministic view until documented
          permission covers this use. Current rights state: {rights.replaceAll("_", " ")}.
        </p>
        <div className="atlas-rights-links">
          {uniqueAssets.map((asset) => (
            <a key={asset.id} href={asset.pageLink} target="_blank" rel="noreferrer">
              View source {asset.id} <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
