const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const SVG_PRESENTATION_PROPERTIES = [
  "alignment-baseline",
  "baseline-shift",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "dominant-baseline",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "isolation",
  "letter-spacing",
  "lighting-color",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "mix-blend-mode",
  "opacity",
  "paint-order",
  "pointer-events",
  "shape-rendering",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "text-anchor",
  "text-decoration",
  "text-rendering",
  "vector-effect",
  "visibility",
  "white-space",
  "word-spacing",
] as const;

interface SvgPanelSize {
  width: number;
  height: number;
}

function positiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readPanelSize(panel: SVGSVGElement): SvgPanelSize {
  const viewBox = panel
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value));

  if (
    viewBox?.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return {
    width: positiveNumber(panel.getAttribute("width")) ?? 980,
    height: positiveNumber(panel.getAttribute("height")) ?? 620,
  };
}

function localizeSvgResourceReferences(value: string): string {
  return value.replace(/url\((['"]?)[^#)]*#([^'"\s)]+)\1\)/g, "url(#$2)");
}

function inlineComputedPresentationStyles(source: SVGSVGElement, clone: SVGSVGElement): void {
  const sourceElements: Element[] = [source, ...source.querySelectorAll("*")];
  const clonedElements: Element[] = [clone, ...clone.querySelectorAll("*")];

  sourceElements.forEach((sourceElement, index) => {
    const clonedElement = clonedElements[index];
    if (!clonedElement) return;

    const computed = window.getComputedStyle(sourceElement);
    const declarations = SVG_PRESENTATION_PROPERTIES.flatMap((property) => {
      const value = computed.getPropertyValue(property).trim();
      return value ? [`${property}:${localizeSvgResourceReferences(value)}`] : [];
    });

    if (computed.display === "none") declarations.push("display:none");

    const existingStyle = clonedElement.getAttribute("style")?.trim();
    if (existingStyle) declarations.unshift(existingStyle.replace(/;$/, ""));
    if (declarations.length > 0) clonedElement.setAttribute("style", declarations.join(";"));
  });
}

/**
 * Creates a detached, self-contained SVG document from the rendered diagram panels.
 * The source diagrams rely on the application stylesheet, so every computed SVG
 * presentation property is copied inline before serialization.
 */
export function serializeDiagramPanels(panels: SVGSVGElement[]): string {
  if (panels.length === 0) return "";

  const serializer = new XMLSerializer();
  const panelSizes = panels.map(readPanelSize);
  const panelWidth = Math.max(...panelSizes.map((panel) => panel.width));
  const totalHeight = panelSizes.reduce((sum, panel) => sum + panel.height, 0);
  const root = document.createElementNS(SVG_NAMESPACE, "svg");
  root.setAttribute("viewBox", `0 0 ${panelWidth} ${totalHeight}`);
  root.setAttribute("width", String(panelWidth));
  root.setAttribute("height", String(totalHeight));

  let y = 0;
  panels.forEach((panel, index) => {
    const clone = panel.cloneNode(true) as SVGSVGElement;
    inlineComputedPresentationStyles(panel, clone);
    clone.setAttribute("x", "0");
    clone.setAttribute("y", String(y));
    clone.setAttribute("width", String(panelWidth));
    clone.setAttribute("height", String(panelSizes[index].height));
    y += panelSizes[index].height;
    root.append(clone);
  });

  return `${serializer.serializeToString(root)}\n`;
}
