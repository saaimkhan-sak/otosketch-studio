import { ExternalLink, LockKeyhole } from "lucide-react";
import type { AtlasUsageRights } from "@/domain/atlasUsage";
import type { ProcedureAtlasSelection } from "@/domain/procedureAtlas";

interface ProcedureAtlasSummaryProps {
  selection: ProcedureAtlasSelection;
  authorized: boolean;
  rights: AtlasUsageRights;
}

export function ProcedureAtlasSummary({
  selection,
  authorized,
  rights,
}: ProcedureAtlasSummaryProps) {
  const uniqueAssets = Array.from(
    new Map(
      Object.values(selection.panels).map((panel) => [panel.asset.id, panel.asset] as const),
    ).values(),
  );

  return (
    <>
      {!authorized ? (
        <aside className="atlas-rights-notice" role="note" aria-label="Stanford atlas usage status">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          <div>
            <strong>
              {rights === "clinic_permission"
                ? "Stanford background awaiting clinical sign-off"
                : "Stanford background is prepared but not embedded"}
            </strong>
            <p>
              {rights === "clinic_permission"
                ? selection.review.statusLabel
                : `Public and clinic display stays on the original deterministic view. Current rights state: ${rights.replaceAll("_", " ")}.`}
            </p>
          </div>
        </aside>
      ) : null}
      <details className="template-summary" aria-label="Sources and limitations">
      <summary>Sources &amp; limitations · {selection.procedureLabel}</summary>
      <p className="template-review-status">Needs otologist and rights approval</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {uniqueAssets.map((asset) => (
          <a
            key={asset.id}
            href={asset.pageLink}
            target="_blank"
            rel="noreferrer"
            className="template-source-link"
          >
            <span className="block font-semibold text-slate-950">Stanford source · {asset.id}</span>
            <span>{asset.title}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
              Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{selection.coverageNote}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        The source remains generic and non-lateralized. Only labeled overlays come from the structured
        plan, and no unselected anatomy is inferred. Until authorized, the preview uses original
        composable vector templates.
      </p>
      </details>
    </>
  );
}
