"use client";

import { ExternalLink, Layers3 } from "lucide-react";
import Image from "next/image";
import { labelSurgeryLayer } from "@/domain/diagramLabels";
import { getMedicalArtAnchor, selectMedicalArtAsset } from "@/domain/medicalArt";
import { getActiveSurgeryLayers, type SurgeryLayer, type SurgeryPlan } from "@/domain/surgeryPlan";
import { cn } from "@/lib/cn";

interface OpenMedicalArtOverviewProps {
  plan: SurgeryPlan;
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
}

function layerTone(layer: SurgeryLayer) {
  if (layer.role === "finding") return "is-finding";
  if (layer.role === "deviation") return "is-deviation";
  return "is-procedure";
}

function lateralityLabel(plan: SurgeryPlan) {
  if (plan.laterality === "not_documented") return "Side not documented";
  return `${plan.laterality.charAt(0).toUpperCase()}${plan.laterality.slice(1)} ear`;
}

export function OpenMedicalArtOverview({
  plan,
  selectedLayerId,
  onLayerSelect,
}: OpenMedicalArtOverviewProps) {
  const asset = selectMedicalArtAsset(plan);
  const layers = getActiveSurgeryLayers(plan).filter(
    (layer) => layer.documentation === "documented",
  );
  const anchoredLayers = layers
    .map((layer) => ({ layer, anchor: getMedicalArtAnchor(asset.id, layer) }))
    .filter((item): item is { layer: SurgeryLayer; anchor: { x: number; y: number } } =>
      Boolean(item.anchor),
    )
    .slice(0, 6);

  return (
    <section className="medical-art-overview" aria-label="Open medical art anatomy overview">
      <header className="medical-art-header">
        <div>
          <p className="eyebrow">Open medical art foundation</p>
          <h3>{asset.title}</h3>
          <p>{asset.description}</p>
        </div>
        <div className="medical-art-meta">
          <span>
            <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            Deterministic overlays
          </span>
          <span>{lateralityLabel(plan)}</span>
        </div>
      </header>

      <div className="medical-art-layout">
        <figure className="medical-art-figure">
          <div className="medical-art-image-stage">
            <Image
              src={asset.localPath}
              alt={`${asset.title}, generic educational anatomy`}
              width={asset.width}
              height={asset.height}
              unoptimized
            />
            <div className="medical-art-marker-layer" aria-label="Documented anatomy markers">
              {anchoredLayers.map(({ layer, anchor }, index) => {
                const active = selectedLayerId === layer.id;
                const sameAnchorIndex = anchoredLayers
                  .slice(0, index)
                  .filter(
                    (item) => item.anchor.x === anchor.x && item.anchor.y === anchor.y,
                  ).length;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    className={cn("medical-art-marker", layerTone(layer), active && "is-active")}
                    style={{
                      left: `${anchor.x}%`,
                      top: `${anchor.y}%`,
                      marginLeft: `${sameAnchorIndex * 17}px`,
                      marginTop: `${sameAnchorIndex * 15}px`,
                    }}
                    aria-label={labelSurgeryLayer(layer)}
                    aria-pressed={active}
                    onClick={() => onLayerSelect?.(layer.id)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <figcaption>
            Generic reference anatomy. Markers indicate documented plan layers, not patient-specific
            geometry.
          </figcaption>
        </figure>

        <aside className="medical-art-legend" aria-label="Documented layers">
          <div className="medical-art-legend-heading">
            <span>Structured layers</span>
            <strong>{layers.length}</strong>
          </div>
          {layers.length > 0 ? (
            <ol>
              {layers.map((layer) => {
                const markerIndex = anchoredLayers.findIndex((item) => item.layer.id === layer.id);
                const active = selectedLayerId === layer.id;
                return (
                  <li key={layer.id}>
                    <button
                      type="button"
                      className={cn("medical-art-legend-row", active && "is-active")}
                      aria-pressed={active}
                      onClick={() => onLayerSelect?.(layer.id)}
                    >
                      <span className={cn("medical-art-legend-number", layerTone(layer))}>
                        {markerIndex >= 0 ? markerIndex + 1 : "•"}
                      </span>
                      <span>
                        <strong>{labelSurgeryLayer(layer)}</strong>
                        <small>
                          {layer.role === "finding"
                            ? "Documented finding"
                            : layer.role === "verification"
                              ? "Verification"
                              : layer.role === "deviation"
                                ? "Intraoperative change"
                                : "Procedure step"}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="medical-art-empty">
              Add a documented finding or planned step to place it on the anatomy.
            </p>
          )}
          <a href={asset.sourcePage} target="_blank" rel="noreferrer">
            {asset.attribution} · {asset.illustrationSoftware} · {asset.license}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </aside>
      </div>
    </section>
  );
}
