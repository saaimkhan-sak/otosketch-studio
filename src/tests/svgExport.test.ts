import { afterEach, describe, expect, it } from "vitest";
import { serializeDiagramPanels } from "@/lib/svgExport";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function buildPanel(viewBox: string, className: string): SVGSVGElement {
  const panel = document.createElementNS(SVG_NAMESPACE, "svg");
  panel.setAttribute("viewBox", viewBox);
  panel.classList.add("diagram-svg", className);
  panel.innerHTML = `
    <defs>
      <linearGradient id="medical-test-gradient">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#c58a4b" />
      </linearGradient>
      <filter id="medical-test-shadow"><feGaussianBlur stdDeviation="2" /></filter>
    </defs>
    <path class="medical-test-tissue" d="M10 10 H90 V70 H10 Z" />
    <text class="medical-test-label" x="20" y="40">Repair</text>
  `;
  document.body.append(panel);
  return panel;
}

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll("style[data-svg-export-test]").forEach((style) => style.remove());
});

describe("standalone SVG export", () => {
  it("inlines stylesheet-driven illustration finishes and keeps resource URLs local", () => {
    const style = document.createElement("style");
    style.dataset.svgExportTest = "true";
    style.textContent = `
      .medical-test-tissue {
        fill: url("https://example.test/diagram#medical-test-gradient");
        stroke: rgb(117, 65, 53);
        stroke-width: 3px;
        filter: url("https://example.test/diagram#medical-test-shadow");
        opacity: 0.82;
        vector-effect: non-scaling-stroke;
      }
      .medical-test-label {
        fill: rgb(23, 48, 45);
        font-family: sans-serif;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.2px;
        text-anchor: middle;
      }
    `;
    document.head.append(style);
    const panel = buildPanel("0 0 100 80", "first-panel");

    const exported = serializeDiagramPanels([panel]);

    expect(exported).toContain("fill:url(#medical-test-gradient)");
    expect(exported).toContain("filter:url(#medical-test-shadow)");
    expect(exported).toContain("stroke-width:3px");
    expect(exported).toContain("vector-effect:non-scaling-stroke");
    expect(exported).toContain("font-weight:700");
    expect(exported).not.toContain("https://example.test/diagram#");
  });

  it("stacks all panels using their viewBox dimensions in one standalone document", () => {
    const first = buildPanel("0 0 240 120", "first-panel");
    const second = buildPanel("0, 0, 200, 80", "second-panel");

    const exported = serializeDiagramPanels([first, second]);
    const parsed = new DOMParser().parseFromString(exported, "image/svg+xml");
    const root = parsed.documentElement;
    const nestedPanels = Array.from(root.children).filter((element) => element.localName === "svg");

    expect(root.getAttribute("viewBox")).toBe("0 0 240 200");
    expect(root.getAttribute("width")).toBe("240");
    expect(root.getAttribute("height")).toBe("200");
    expect(nestedPanels).toHaveLength(2);
    expect(nestedPanels[0].getAttribute("x")).toBe("0");
    expect(nestedPanels[0].getAttribute("y")).toBe("0");
    expect(nestedPanels[0].getAttribute("width")).toBe("240");
    expect(nestedPanels[0].getAttribute("height")).toBe("120");
    expect(nestedPanels[1].getAttribute("x")).toBe("0");
    expect(nestedPanels[1].getAttribute("y")).toBe("120");
    expect(nestedPanels[1].getAttribute("width")).toBe("240");
    expect(nestedPanels[1].getAttribute("height")).toBe("80");
  });

  it("returns no document when there are no diagram panels", () => {
    expect(serializeDiagramPanels([])).toBe("");
  });
});
