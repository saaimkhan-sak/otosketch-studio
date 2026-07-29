import { atlasAssetImageUrl, type AtlasAssetIndexItem } from "./atlas";
import { buildFeatureMap } from "./diagramMapping";
import { labelValue } from "./ontology";
import type { OperativeCase } from "./schema";
import type { DiagramFeature } from "./types";

type FeatureId =
  | "feature-tm"
  | "feature-malleus"
  | "feature-incus"
  | "feature-is-joint"
  | "feature-stapes"
  | "feature-reconstruction"
  | "feature-graft"
  | "feature-no-repair";

export interface AtlasTemplateAnchor {
  x: number;
  y: number;
}

export type AtlasPanel = "found" | "repaired";

export interface AtlasPanelCoverage {
  documentedUse: string[];
  referenceOnlyAnatomy: string[];
}

export interface AtlasTemplateOverlay {
  id: string;
  panel: AtlasPanel;
  kind: "bone_cement_bridge" | "tm_graft_patch";
  label: string;
  featureId?: FeatureId;
  points: AtlasTemplateAnchor[];
}

export type AtlasTemplateReviewStatus =
  | "internal_demo_qa"
  | "needs_clinician_signoff"
  | "clinician_approved";

export interface AtlasTemplateReviewMetadata {
  status: AtlasTemplateReviewStatus;
  statusLabel: string;
  reviewedBy: string;
  reviewedAtIso: string;
  notes: string[];
}

export interface AtlasTemplateCalibration {
  coordinateSystem: "source_image_pixels";
  note: string;
}

export interface AtlasDiagramTemplate {
  id: string;
  name: string;
  intendedUse: string;
  exactCoverage: string[];
  selectionRationale: string[];
  limitations: string[];
  review: AtlasTemplateReviewMetadata;
  calibration: AtlasTemplateCalibration;
  panelCoverage: Record<AtlasPanel, AtlasPanelCoverage>;
  atlasAsset: AtlasAssetIndexItem;
  panelAssets?: Partial<Record<AtlasPanel, AtlasAssetIndexItem>>;
  anchors: Partial<Record<FeatureId, AtlasTemplateAnchor>>;
  panelAnchors?: Partial<Record<AtlasPanel, Partial<Record<FeatureId, AtlasTemplateAnchor>>>>;
  overlays?: AtlasTemplateOverlay[];
}

export interface AtlasTemplateCallout {
  id: FeatureId;
  featureId?: DiagramFeature["id"];
  panel: AtlasPanel;
  label: string;
  detail: string;
  kind: "finding" | "repair" | "unknown" | "no_repair" | "status";
  representation: "source_reference" | "schematic_overlay" | "marker_only" | "status_only";
  anchor?: AtlasTemplateAnchor;
}

export type AtlasTemplateSelection =
  | {
      status: "ready";
      template: AtlasDiagramTemplate;
      imageUrl: string;
      callouts: AtlasTemplateCallout[];
      provenance: string;
      lateralityLabel: string;
      referenceOnlyAnatomy: string[];
    }
  | {
      status: "blocked";
      reason: string;
      missingTemplateKey: string;
    };

function atlasAsset(asset: AtlasAssetIndexItem): AtlasAssetIndexItem {
  return asset;
}

function internalDemoQa(notes: string[]): AtlasTemplateReviewMetadata {
  return {
    status: "internal_demo_qa",
    statusLabel: "Engineering review/QA only; template-level otologist approval is still required.",
    reviewedBy: "Engineering implementation audit (not clinical approval)",
    reviewedAtIso: "2026-06-30",
    notes,
  };
}

function needsClinicianSignoff(notes: string[]): AtlasTemplateReviewMetadata {
  return {
    status: "needs_clinician_signoff",
    statusLabel: "Unsigned overlay; template-level otologist sign-off is required.",
    reviewedBy: "Engineering implementation audit (not clinical approval)",
    reviewedAtIso: "2026-06-30",
    notes,
  };
}

const sourcePixelCalibration: AtlasTemplateCalibration = {
  coordinateSystem: "source_image_pixels",
  note: "Anchors are stored in original atlas image pixel coordinates and projected into the fitted SVG image frame.",
};

const centralPerforationAsset = atlasAsset({
  id: 1169,
  title:
    "Typical central tympanic membrane perforation. Most microsurgical tympanic membrane perforations are managed via medial grafting.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132846/5d-1.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/5d-1/",
  localPath: "public/atlas-assets/stanford/files/1169-5d-1.jpg",
  width: 1333,
  height: 1289,
  mimeType: "image/jpeg",
  keywords: ["central", "tympanic", "membrane", "perforation", "medial", "grafting"],
});

const graftInPlaceAsset = atlasAsset({
  id: 1177,
  title:
    "Replacement of the tympanomeatal flap with the graft in place. Dotted line represents the graft on the medial aspect of the tympanic membrane and under the tympanomeatal flap.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01132830/5d-24.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/tympanoplasty/5d-24/",
  localPath: "public/atlas-assets/stanford/files/1177-5d-24.jpg",
  width: 1695,
  height: 1484,
  mimeType: "image/jpeg",
  keywords: ["tympanomeatal", "flap", "graft", "tympanic", "membrane"],
});

const ossiculoplastyHandoutAsset = atlasAsset({
  id: 2122,
  title: "Ossicular chair reconstruction.",
  sourceUrl:
    "https://tobacco-img.stanford.edu/otosurgery/2020/06/01125408/16e-Ossiculoplasty-patient-handouts.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/16e-ossiculoplasty-patient-handouts/",
  localPath: "public/atlas-assets/stanford/files/2122-16e-ossiculoplasty-patient-handouts.jpg",
  width: 1190,
  height: 845,
  mimeType: "image/jpeg",
  keywords: ["ossicular", "chair", "reconstruction", "ossiculoplasty", "patient", "handout"],
});

const incusErosionAsset = atlasAsset({
  id: 1723,
  title:
    "Erosion of the long process of the incus most often occurs as a consequence of chronic otitis media or cholesteatoma.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130721/6a-4.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6a-4/",
  localPath: "public/atlas-assets/stanford/files/1723-6a-4.jpg",
  width: 1143,
  height: 1187,
  mimeType: "image/jpeg",
  keywords: ["incus", "erosion", "ossiculoplasty"],
});

const incusStapesSeparationAsset = atlasAsset({
  id: 1722,
  title: "Incudostapedial joint separation most commonly occurs after temporal bone fracture.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130723/6a-3.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6a-3/",
  localPath: "public/atlas-assets/stanford/files/1722-6a-3.jpg",
  width: 1143,
  height: 1187,
  mimeType: "image/jpeg",
  keywords: ["incudostapedial", "joint", "separation"],
});

const absentIncusAsset = atlasAsset({
  id: 1724,
  title: "Absence of a functional incus is common in chronic otitis media and cholesteatoma.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130719/6a-5.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6a-5/",
  localPath: "public/atlas-assets/stanford/files/1724-6a-5.jpg",
  width: 1143,
  height: 1187,
  mimeType: "image/jpeg",
  keywords: ["incus", "absent", "deficient"],
});

const footplateOnlyAsset = atlasAsset({
  id: 1727,
  title:
    "Absence of the entire ossicular chain except for the stapes footplate is common in cholesteatoma.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130714/6a-8.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6a-8/",
  localPath: "public/atlas-assets/stanford/files/1727-6a-8.jpg",
  width: 1143,
  height: 1187,
  mimeType: "image/jpeg",
  keywords: ["ossicular", "chain", "absent", "footplate"],
});

const porpAsset = atlasAsset({
  id: 1736,
  title:
    "Titanium partial ossicular replacement prosthesis (PORP). To discourage extrusion, autologous cartilage is interposed between the prosthesis and tympanic membrane. Many surgeons use this form of reconstruction whenever the incus is deficient regardless of the status of the malleus.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130657/6c-3.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6c-3/",
  localPath: "public/atlas-assets/stanford/files/1736-6c-3.jpg",
  width: 1143,
  height: 1187,
  mimeType: "image/jpeg",
  keywords: ["porp", "titanium", "ossiculoplasty", "cartilage"],
});

const torpAsset = atlasAsset({
  id: 1737,
  title:
    "Total ossicular replacement prosthesis (TORP). To discourage extrusion, autologous cartilage is interposed between the prosthesis and the tympanic membrane.",
  sourceUrl: "https://tobacco-img.stanford.edu/otosurgery/2020/06/01130655/6c-6.jpg",
  pageLink: "https://otosurgeryatlas.stanford.edu/otologic-surgery-atlas/ossiculoplasty/6c-6/",
  localPath: "public/atlas-assets/stanford/files/1737-6c-6.jpg",
  width: 1143,
  height: 1187,
  mimeType: "image/jpeg",
  keywords: ["torp", "titanium", "ossiculoplasty", "cartilage"],
});

export const atlasDiagramTemplates: AtlasDiagramTemplate[] = [
  {
    id: "atlas-tympanoplasty-handout",
    name: "Atlas medial-graft tympanoplasty sequence",
    intendedUse:
      "Tympanoplasty with documented tympanic membrane repair and no ossicular reconstruction.",
    exactCoverage: [
      "central tympanic membrane perforation",
      "medial graft coverage",
      "no ossicular reconstruction",
    ],
    selectionRationale: [
      "Procedure is tympanoplasty.",
      "Ossicular reconstruction is explicitly documented as none.",
      "Malleus, incus, incus-stapes joint, and stapes are intact or not documented without pathology requiring a repair template.",
      "The paired atlas views show a typical central perforation and a graft extending beyond that defect onto the tympanic membrane remnant.",
    ],
    limitations: [
      "The source views are generic reference anatomy and do not reproduce patient-specific perforation or graft geometry.",
      "The colored region highlights the graft already depicted in the repair source view; it is not a generated postoperative image.",
    ],
    review: needsClinicianSignoff([
      "The paired source views and deterministic graft highlight require otologist review before clinical use.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: {
        documentedUse: ["central perforation source reference"],
        referenceOnlyAnatomy: ["all unnumbered atlas anatomy"],
      },
      repaired: {
        documentedUse: [
          "source-depicted graft with deterministic highlight",
          "explicit no-ossicular-repair status",
        ],
        referenceOnlyAnatomy: ["all unnumbered atlas anatomy"],
      },
    },
    atlasAsset: centralPerforationAsset,
    panelAssets: {
      found: centralPerforationAsset,
      repaired: graftInPlaceAsset,
    },
    anchors: {
      "feature-tm": { x: 850, y: 650 },
      "feature-graft": { x: 950, y: 590 },
    },
    panelAnchors: {
      found: {
        "feature-tm": { x: 850, y: 650 },
      },
      repaired: {
        "feature-graft": { x: 950, y: 590 },
      },
    },
    overlays: [
      {
        id: "overlay-tympanoplasty-graft-region",
        panel: "repaired",
        kind: "tm_graft_patch",
        label: "Highlighted graft coverage extending beyond the perforation—not patient-specific",
        featureId: "feature-graft",
        points: [
          { x: 500, y: 710 },
          { x: 455, y: 360 },
          { x: 885, y: 235 },
          { x: 1225, y: 430 },
          { x: 1295, y: 925 },
          { x: 670, y: 1150 },
        ],
      },
    ],
  },
  {
    id: "atlas-incus-erosion-no-ossicular-repair",
    name: "Atlas incus erosion without ossicular repair",
    intendedUse: "Incus long-process erosion with no ossicular reconstruction documented.",
    exactCoverage: ["long-process incus erosion", "stapes present", "no ossicular reconstruction"],
    selectionRationale: [
      "Long-process incus erosion is documented.",
      "Stapes is documented as present/mobile or superstructure intact.",
      "Ossicular reconstruction is explicitly documented as none.",
    ],
    limitations: [
      "The repair panel reuses the finding reference because no ossicular repair is documented.",
      "Eardrum perforation location is a callout and not a custom TM drawing.",
    ],
    review: internalDemoQa([
      "Atlas image is unchanged; the no-repair state prevents fabricated prosthesis or cement drawing.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: {
        documentedUse: ["incus long-process erosion"],
        referenceOnlyAnatomy: ["malleus", "incus-stapes joint", "all unnumbered atlas anatomy"],
      },
      repaired: {
        documentedUse: ["explicit no-ossicular-repair status"],
        referenceOnlyAnatomy: ["entire unchanged atlas background"],
      },
    },
    atlasAsset: incusErosionAsset,
    anchors: {
      "feature-incus": { x: 520, y: 450 },
      "feature-stapes": { x: 675, y: 520 },
    },
  },
  {
    id: "atlas-is-joint-separation-no-ossicular-repair",
    name: "Atlas incus-stapes joint separation without ossicular repair",
    intendedUse: "Incudostapedial joint discontinuity with no ossicular reconstruction documented.",
    exactCoverage: [
      "incus-stapes joint discontinuity",
      "stapes present",
      "no ossicular reconstruction",
    ],
    selectionRationale: [
      "Incus-stapes joint discontinuity is documented.",
      "Stapes is documented as present/mobile or superstructure intact.",
      "No prosthesis or bone cement is documented.",
    ],
    limitations: [
      "The repair panel reuses the finding reference because no ossicular repair is documented.",
      "The image is a reference pattern, not a patient-specific spatial measurement.",
    ],
    review: internalDemoQa([
      "Atlas image is unchanged; callouts identify the documented joint finding.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: {
        documentedUse: ["incus-stapes joint discontinuity"],
        referenceOnlyAnatomy: ["malleus", "incus", "all unnumbered atlas anatomy"],
      },
      repaired: {
        documentedUse: ["explicit no-ossicular-repair status"],
        referenceOnlyAnatomy: ["entire unchanged atlas background"],
      },
    },
    atlasAsset: incusStapesSeparationAsset,
    anchors: {
      "feature-is-joint": { x: 560, y: 520 },
      "feature-stapes": { x: 675, y: 520 },
    },
  },
  {
    id: "atlas-ossiculoplasty-handout",
    name: "Atlas ossiculoplasty handout",
    intendedUse:
      "General patient-facing ossiculoplasty reference held in the registry for handout-style reconstruction views.",
    exactCoverage: ["ossiculoplasty handout", "general prosthesis reconstruction reference"],
    selectionRationale: [
      "Registry-only handout reference for future patient-facing ossiculoplasty summaries.",
      "Not selected for exact case rendering until a case-specific template rule is added.",
    ],
    limitations: [
      "General educational handout, not an exact finding or repair template.",
      "Should not be used as the primary diagram for patient-specific anatomy without an exact rule.",
    ],
    review: internalDemoQa([
      "Registry entry only; current renderer does not auto-select this template.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: { documentedUse: [], referenceOnlyAnatomy: ["entire atlas background"] },
      repaired: { documentedUse: [], referenceOnlyAnatomy: ["entire atlas background"] },
    },
    atlasAsset: ossiculoplastyHandoutAsset,
    anchors: {
      "feature-reconstruction": { x: 560, y: 345 },
      "feature-graft": { x: 390, y: 330 },
    },
  },
  {
    id: "atlas-otomimix-bone-cement-bridge",
    name: "Atlas OtoMimix bone-cement bridge overlay",
    intendedUse:
      "Incus long-process erosion with incus-stapes discontinuity repaired by documented OtoMimix bone-cement bridge.",
    exactCoverage: [
      "incus long-process erosion",
      "incus-stapes joint discontinuity",
      "mobile/intact stapes superstructure",
      "OtoMimix bone-cement bridge",
    ],
    selectionRationale: [
      "Incus long-process erosion is documented.",
      "Incus-stapes discontinuity is documented.",
      "Stapes is documented as mobile or superstructure intact.",
      "Repair type is bone-cement bridge and material is OtoMimix.",
    ],
    limitations: [
      "The repaired panel uses a deterministic overlay because no dedicated source atlas cement-bridge image is available.",
      "Overlay shape and anchors require surgeon sign-off before clinical use.",
      "This is a reference illustration, not a measurement of the actual cement volume.",
    ],
    review: needsClinicianSignoff([
      "Atlas background is unchanged.",
      "Bone-cement bridge overlay is deterministic and evidence-gated, but needs clinician review.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: {
        documentedUse: ["incus erosion", "incus-stapes discontinuity"],
        referenceOnlyAnatomy: ["malleus", "all unnumbered atlas anatomy"],
      },
      repaired: {
        documentedUse: ["deterministic OtoMimix bridge overlay"],
        referenceOnlyAnatomy: ["malleus", "all unnumbered atlas anatomy"],
      },
    },
    atlasAsset: incusErosionAsset,
    anchors: {
      "feature-tm": { x: 380, y: 560 },
      "feature-incus": { x: 520, y: 450 },
      "feature-is-joint": { x: 590, y: 505 },
      "feature-stapes": { x: 675, y: 520 },
      "feature-reconstruction": { x: 585, y: 510 },
    },
    panelAnchors: {
      repaired: {
        "feature-reconstruction": { x: 610, y: 575 },
      },
    },
    overlays: [
      {
        id: "overlay-otomimix-bridge",
        panel: "repaired",
        kind: "bone_cement_bridge",
        label: "OtoMimix bone-cement bridge",
        featureId: "feature-reconstruction",
        points: [
          { x: 512, y: 470 },
          { x: 552, y: 446 },
          { x: 620, y: 460 },
          { x: 670, y: 500 },
          { x: 648, y: 550 },
          { x: 560, y: 535 },
        ],
      },
    ],
  },
  {
    id: "atlas-porp-reference",
    name: "Atlas PORP reference",
    intendedUse: "Titanium partial ossicular replacement prosthesis with cartilage interposition.",
    exactCoverage: [
      "absent/deficient incus finding",
      "porp",
      "titanium prosthesis",
      "cartilage interposition",
    ],
    selectionRationale: [
      "Incus is absent or deficient.",
      "Stapes is mobile or superstructure intact.",
      "Repair type is PORP with titanium material.",
      "Cartilage graft/interposition is documented.",
    ],
    limitations: [
      "PORP is shown as a reference-style reconstruction, not a patient-specific prosthesis size or angle.",
      "Malleus status may be not documented; the template does not infer a normal malleus.",
    ],
    review: internalDemoQa([
      "Finding panel uses asset 1724 and repair panel uses asset 1736 with unchanged atlas images.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: {
        documentedUse: ["absent or deficient incus"],
        referenceOnlyAnatomy: ["malleus", "all unnumbered atlas anatomy"],
      },
      repaired: {
        documentedUse: ["PORP", "cartilage protection layer"],
        referenceOnlyAnatomy: ["all unnumbered atlas anatomy"],
      },
    },
    atlasAsset: porpAsset,
    panelAssets: {
      found: absentIncusAsset,
      repaired: porpAsset,
    },
    anchors: {
      "feature-tm": { x: 380, y: 560 },
      "feature-incus": { x: 520, y: 500 },
      "feature-stapes": { x: 675, y: 520 },
      "feature-reconstruction": { x: 510, y: 560 },
      "feature-graft": { x: 370, y: 565 },
    },
    panelAnchors: {
      repaired: {
        "feature-reconstruction": { x: 535, y: 550 },
        "feature-graft": { x: 365, y: 575 },
      },
    },
  },
  {
    id: "atlas-torp-reference",
    name: "Atlas TORP reference",
    intendedUse: "Titanium total ossicular replacement prosthesis with cartilage interposition.",
    exactCoverage: [
      "footplate-only finding",
      "torp",
      "titanium prosthesis",
      "cartilage interposition",
    ],
    selectionRationale: [
      "Stapes superstructure is absent with footplate-only reconstruction target.",
      "Malleus and incus are absent or not documented.",
      "Repair type is TORP with titanium material.",
      "Cartilage graft/interposition is documented.",
    ],
    limitations: [
      "TORP is shown as a reference-style reconstruction, not patient-specific prosthesis sizing.",
      "Footplate/base detail is a template match and must be confirmed in clinician review.",
    ],
    review: internalDemoQa([
      "Finding panel uses asset 1727 and repair panel uses asset 1737 with unchanged atlas images.",
    ]),
    calibration: sourcePixelCalibration,
    panelCoverage: {
      found: {
        documentedUse: ["stapes footplate-only reconstruction target"],
        referenceOnlyAnatomy: ["all unnumbered atlas anatomy"],
      },
      repaired: {
        documentedUse: ["TORP", "cartilage protection layer"],
        referenceOnlyAnatomy: ["all unnumbered atlas anatomy"],
      },
    },
    atlasAsset: torpAsset,
    panelAssets: {
      found: footplateOnlyAsset,
      repaired: torpAsset,
    },
    anchors: {
      "feature-tm": { x: 380, y: 560 },
      "feature-incus": { x: 500, y: 500 },
      "feature-stapes": { x: 700, y: 500 },
      "feature-reconstruction": { x: 535, y: 550 },
      "feature-graft": { x: 365, y: 575 },
    },
    panelAnchors: {
      repaired: {
        "feature-reconstruction": { x: 540, y: 555 },
        "feature-graft": { x: 365, y: 575 },
      },
    },
  },
];

export function getAtlasTemplateImageUrl(template: AtlasDiagramTemplate) {
  return atlasAssetImageUrl(template.atlasAsset);
}

export function getAtlasPanelAsset(template: AtlasDiagramTemplate, panel: AtlasPanel) {
  return template.panelAssets?.[panel] ?? template.atlasAsset;
}

export function getAtlasPanelImageUrl(template: AtlasDiagramTemplate, panel: AtlasPanel) {
  return atlasAssetImageUrl(getAtlasPanelAsset(template, panel));
}

export function getAtlasPanelAnchor(
  template: AtlasDiagramTemplate,
  panel: AtlasPanel,
  id: FeatureId,
) {
  return template.panelAnchors?.[panel]?.[id] ?? template.anchors[id];
}

export function getAtlasPanelProvenance(template: AtlasDiagramTemplate, panel: AtlasPanel) {
  const asset = getAtlasPanelAsset(template, panel);
  const panelLabel = panel === "found" ? "Finding panel reference" : "Repair panel reference";
  return `${panelLabel}: Stanford Oto Surgery Atlas asset ${asset.id}.`;
}

const neutralAssetLabels: Record<number, string> = {
  1169: "Reference finding: typical central eardrum perforation",
  1177: "Reference repair: medial graft covering a central perforation",
  1722: "Reference anatomy: incus-stapes separation",
  1723: "Reference anatomy: incus long-process erosion",
  1724: "Reference anatomy: absent or deficient incus",
  1727: "Reference anatomy: stapes footplate",
  1736: "Reference repair: PORP with cartilage protection",
  1737: "Reference repair: TORP with cartilage protection",
  2121: "Reference anatomy: eardrum repair",
  2122: "Reference education handout: ossiculoplasty",
};

export function getAtlasAssetNeutralLabel(asset: AtlasAssetIndexItem) {
  return neutralAssetLabels[asset.id] ?? `Generic atlas reference asset ${asset.id}`;
}

export function getAtlasPanelPresentation(
  selection: Extract<AtlasTemplateSelection, { status: "ready" }>,
  panel: AtlasPanel,
) {
  if (panel === "found") {
    return {
      title: "What was documented",
      subtitle: "Finding reference—not a patient-specific drawing",
    };
  }
  const noRepair = selection.callouts.some(
    (callout) => callout.panel === "repaired" && callout.kind === "no_repair",
  );
  const hasGraftOverlay = selection.template.overlays?.some(
    (overlay) => overlay.panel === "repaired" && overlay.kind === "tm_graft_patch",
  );
  if (noRepair && hasGraftOverlay) {
    return {
      title: "Documented eardrum repair",
      subtitle: "Graft covers the perforation; no ossicular repair documented",
    };
  }
  if (noRepair) {
    return {
      title: "After the procedure",
      subtitle: "No ossicular repair documented; reference anatomy unchanged",
    };
  }
  return {
    title: "Documented repair",
    subtitle: "Repair callout on a reference image—not a literal postoperative view",
  };
}

function getAtlasTemplateProvenance(template: AtlasDiagramTemplate) {
  const panels: AtlasPanel[] = ["found", "repaired"];
  const assetIds = Array.from(
    new Set(panels.map((panel) => getAtlasPanelAsset(template, panel).id)),
  );
  return `${template.name}; Stanford Oto Surgery Atlas assets ${assetIds.join(", ")}.`;
}

function templateForCase(operativeCase: OperativeCase) {
  const reconstruction = operativeCase.repair.reconstructionType.value;
  if (reconstruction === "bone_cement_bridge") {
    const boneCementBridgeTemplateMatches =
      operativeCase.anatomy.incus.value === "long_process_eroded" &&
      operativeCase.anatomy.incudostapedialJoint.value === "discontinuous" &&
      ["mobile", "superstructure_intact"].includes(operativeCase.anatomy.stapes.value) &&
      operativeCase.repair.reconstructionMaterial.value === "otomimix";
    if (!boneCementBridgeTemplateMatches) return null;
    return atlasDiagramTemplates.find(
      (template) => template.id === "atlas-otomimix-bone-cement-bridge",
    );
  }
  if (reconstruction === "porp") {
    const porpTemplateMatches =
      ["not_documented", "intact"].includes(operativeCase.anatomy.malleus.value) &&
      ["absent", "long_process_eroded"].includes(operativeCase.anatomy.incus.value) &&
      ["mobile", "superstructure_intact"].includes(operativeCase.anatomy.stapes.value) &&
      operativeCase.repair.reconstructionMaterial.value === "titanium" &&
      operativeCase.repair.graftType.value === "cartilage";
    if (!porpTemplateMatches) return null;
    return atlasDiagramTemplates.find((template) => template.id === "atlas-porp-reference");
  }
  if (reconstruction === "torp") {
    const torpTemplateMatches =
      ["not_documented", "absent"].includes(operativeCase.anatomy.malleus.value) &&
      ["not_documented", "absent"].includes(operativeCase.anatomy.incus.value) &&
      operativeCase.anatomy.stapes.value === "superstructure_absent" &&
      operativeCase.repair.reconstructionMaterial.value === "titanium" &&
      operativeCase.repair.graftType.value === "cartilage";
    if (!torpTemplateMatches) return null;
    return atlasDiagramTemplates.find((template) => template.id === "atlas-torp-reference");
  }
  if (
    reconstruction === "none" &&
    operativeCase.procedure.family.value === "tympanoplasty" &&
    operativeCase.anatomy.incus.value === "long_process_eroded" &&
    ["mobile", "superstructure_intact"].includes(operativeCase.anatomy.stapes.value)
  ) {
    return atlasDiagramTemplates.find(
      (template) => template.id === "atlas-incus-erosion-no-ossicular-repair",
    );
  }
  if (
    reconstruction === "none" &&
    operativeCase.procedure.family.value === "tympanoplasty" &&
    operativeCase.anatomy.incudostapedialJoint.value === "discontinuous" &&
    ["mobile", "superstructure_intact"].includes(operativeCase.anatomy.stapes.value)
  ) {
    return atlasDiagramTemplates.find(
      (template) => template.id === "atlas-is-joint-separation-no-ossicular-repair",
    );
  }
  const ossicularFindingsAreTemplateSafe =
    ["intact", "not_documented"].includes(operativeCase.anatomy.malleus.value) &&
    ["intact", "not_documented"].includes(operativeCase.anatomy.incus.value) &&
    ["intact", "not_documented"].includes(operativeCase.anatomy.incudostapedialJoint.value) &&
    ["mobile", "superstructure_intact", "not_documented"].includes(
      operativeCase.anatomy.stapes.value,
    );
  const hasDocumentedGraft =
    operativeCase.repair.graftType.value !== "none" &&
    operativeCase.repair.graftType.value !== "not_documented";

  if (
    reconstruction === "none" &&
    operativeCase.procedure.family.value === "tympanoplasty" &&
    ossicularFindingsAreTemplateSafe &&
    hasDocumentedGraft
  ) {
    return atlasDiagramTemplates.find((template) => template.id === "atlas-tympanoplasty-handout");
  }
  return null;
}

function missingTemplateKey(operativeCase: OperativeCase) {
  return [
    operativeCase.procedure.family.value,
    operativeCase.anatomy.tympanicMembrane.value,
    operativeCase.anatomy.incus.value,
    operativeCase.anatomy.incudostapedialJoint.value,
    operativeCase.anatomy.stapes.value,
    operativeCase.repair.reconstructionType.value,
    operativeCase.repair.reconstructionMaterial.value,
    operativeCase.repair.graftType.value,
  ].join("|");
}

function unsupportedReason(operativeCase: OperativeCase) {
  const reconstruction = operativeCase.repair.reconstructionType.value;
  if (reconstruction === "bone_cement_bridge") {
    return "No exact atlas overlay template matches this bone-cement reconstruction pattern.";
  }
  if (reconstruction === "cartilage_interposition") {
    return "No exact atlas template is available for cartilage interposition reconstruction.";
  }
  if (reconstruction === "unsupported" || operativeCase.procedure.family.value === "unsupported") {
    return "The extracted procedure or reconstruction is outside the reviewed diagram template library.";
  }
  if (reconstruction === "not_documented") {
    return "Reconstruction status is not documented, so the app will not choose a repair template.";
  }
  return "No exact reviewed atlas template matches this structured case.";
}

function calloutForFeature(
  feature: DiagramFeature,
  template: AtlasDiagramTemplate,
  panel: AtlasPanel,
  kind: AtlasTemplateCallout["kind"],
) {
  const id = feature.id as FeatureId;
  const isTympanicMembraneFinding = id === "feature-tm" && panel === "found";
  const isSourceDepictedCentralPerforation =
    isTympanicMembraneFinding && template.id === "atlas-tympanoplasty-handout";
  const isMobilityStatus = id === "feature-stapes" && /mobile/i.test(feature.label);
  const hasFeatureOverlay = template.overlays?.some(
    (overlay) => overlay.panel === panel && overlay.featureId === id,
  );
  const isReferenceGraft =
    id === "feature-graft" &&
    ["atlas-porp-reference", "atlas-torp-reference"].includes(template.id);
  const isReferenceProsthesis =
    id === "feature-reconstruction" &&
    ["atlas-porp-reference", "atlas-torp-reference"].includes(template.id);
  const representation: AtlasTemplateCallout["representation"] = isSourceDepictedCentralPerforation
    ? "source_reference"
    : isTympanicMembraneFinding
      ? "marker_only"
      : isMobilityStatus
        ? "status_only"
        : hasFeatureOverlay
          ? "schematic_overlay"
          : "source_reference";
  return {
    id,
    featureId: feature.id,
    panel,
    label: feature.label,
    detail: isSourceDepictedCentralPerforation
      ? "Atlas source shows a central perforation. Marker links the generic reference to this finding."
      : isTympanicMembraneFinding
        ? "Documented location—schematic marker only; not a patient-specific perforation."
        : isMobilityStatus
          ? "Mobility confirmed intraoperatively; a static image cannot depict movement."
          : hasFeatureOverlay &&
              id === "feature-graft" &&
              template.id === "atlas-tympanoplasty-handout"
            ? "Source graft covers the defect and overlaps its margins. Teal highlight marks the generic region."
            : hasFeatureOverlay && id === "feature-graft"
              ? "Schematic graft overlay. Material is documented; extent and position are generic."
              : hasFeatureOverlay
                ? "Schematic overlay; shape and volume are generic and not to scale."
                : isReferenceGraft
                  ? "Reference image depicts cartilage protection; size and position are generic."
                  : isReferenceProsthesis
                    ? "Reference image depicts the prosthesis; size and angle are generic."
                    : `${feature.support === "supported" ? "Documented" : labelValue(feature.support)} finding; marker points to matching reference anatomy, not patient geometry.`,
    kind: isMobilityStatus ? "status" : kind,
    representation,
    anchor: isMobilityStatus ? undefined : getAtlasPanelAnchor(template, panel, id),
  } satisfies AtlasTemplateCallout;
}

export function selectAtlasDiagramTemplate(operativeCase: OperativeCase): AtlasTemplateSelection {
  const template = templateForCase(operativeCase);
  if (!template) {
    return {
      status: "blocked",
      reason: unsupportedReason(operativeCase),
      missingTemplateKey: missingTemplateKey(operativeCase),
    };
  }

  const features = buildFeatureMap(operativeCase);
  const callouts: AtlasTemplateCallout[] = [];
  for (const feature of features) {
    if (feature.panel === "found") {
      const id = feature.id as FeatureId;
      if (
        (id === "feature-stapes" && /mobile/i.test(feature.label)) ||
        getAtlasPanelAnchor(template, "found", id)
      ) {
        callouts.push(calloutForFeature(feature, template, "found", "finding"));
      }
    }
    if (feature.panel === "repaired") {
      const id = feature.id as FeatureId;
      if (getAtlasPanelAnchor(template, "repaired", id)) {
        callouts.push(calloutForFeature(feature, template, "repaired", "repair"));
      }
    }
  }

  if (operativeCase.repair.reconstructionType.value === "none") {
    callouts.push({
      id: "feature-no-repair",
      panel: "repaired",
      label: "No ossicular repair documented",
      detail: "The repair panel intentionally does not draw a prosthesis or cement bridge.",
      kind: "no_repair",
      representation: "status_only",
      anchor: getAtlasPanelAnchor(template, "repaired", "feature-no-repair"),
    });
  }

  return {
    status: "ready",
    template,
    imageUrl: getAtlasTemplateImageUrl(template),
    callouts,
    provenance: getAtlasTemplateProvenance(template),
    lateralityLabel:
      operativeCase.procedure.laterality.value === "left" ||
      operativeCase.procedure.laterality.value === "right"
        ? `${operativeCase.procedure.laterality.value.toUpperCase()} EAR · GENERIC REFERENCE (NOT LATERALIZED)`
        : "GENERIC REFERENCE · NOT LATERALIZED",
    referenceOnlyAnatomy: Array.from(
      new Set([
        ...template.panelCoverage.found.referenceOnlyAnatomy,
        ...template.panelCoverage.repaired.referenceOnlyAnatomy,
      ]),
    ),
  };
}

export function getAtlasTemplateBlocker(operativeCase: OperativeCase) {
  const selection = selectAtlasDiagramTemplate(operativeCase);
  if (selection.status === "blocked") return selection.reason;
  if (selection.template.review.status === "needs_clinician_signoff") {
    return "This deterministic overlay is unsigned and requires template-level otologist approval before patient-facing review or export.";
  }
  if (selection.template.review.status === "clinician_approved") return null;
  return "This atlas template has engineering QA only and requires template-level otologist approval before patient-facing review or export.";
}
