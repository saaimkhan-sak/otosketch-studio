import { ExternalLink } from "lucide-react";
import {
  getAtlasAssetNeutralLabel,
  getAtlasPanelAsset,
  type AtlasPanel,
  type AtlasTemplateSelection,
} from "@/domain/atlasTemplates";

interface TemplateSummaryPanelProps {
  selection: Extract<AtlasTemplateSelection, { status: "ready" }>;
}

const panels: AtlasPanel[] = ["found", "repaired"];

export function TemplateSummaryPanel({ selection }: TemplateSummaryPanelProps) {
  const assets = panels.map((panel) => ({
    panel,
    asset: getAtlasPanelAsset(selection.template, panel),
  }));

  return (
    <details className="template-summary" aria-label="Sources and limitations">
      <summary>Sources &amp; limitations · {selection.template.name}</summary>
      <p className="template-review-status">Needs otologist approval</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {assets.map(({ panel, asset }) => (
          <a
            key={`${panel}-${asset.id}`}
            href={asset.pageLink}
            target="_blank"
            rel="noreferrer"
            className="template-source-link"
          >
            <span className="block font-semibold text-slate-950">
              {panel === "found" ? "Finding" : "Repair"} reference · {asset.id}
            </span>
            <span>{getAtlasAssetNeutralLabel(asset)}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
              Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
        {selection.template.limitations.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        Unlabeled reference anatomy is generic and must not be read as a documented finding.
      </p>
    </details>
  );
}
