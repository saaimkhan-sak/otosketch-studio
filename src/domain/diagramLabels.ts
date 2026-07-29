import type { SurgeryLayer } from "./surgeryPlan";

function humanize(value: string) {
  if (value === "porp") return "PORP";
  if (value === "torp") return "TORP";
  if (value === "csf_leak") return "CSF leak";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentedDetail(value: string, excluded: string[] = []) {
  return value === "not_documented" || excluded.includes(value) ? null : humanize(value);
}

function joinLabel(primary: string, ...details: Array<string | null>) {
  return [primary, ...details].filter((detail): detail is string => Boolean(detail)).join(" · ");
}

export function labelSurgeryLayer(layer: SurgeryLayer) {
  switch (layer.kind) {
    case "tm_state":
      return layer.state === "not_documented"
        ? "Eardrum state not documented"
        : `Eardrum · ${humanize(layer.state)}`;
    case "tm_perforation":
      return layer.region === "not_documented"
        ? "Eardrum perforation · location not documented"
        : `${humanize(layer.region)} eardrum perforation`;
    case "tm_graft":
      if (layer.material === "none") return "No graft placed";
      return joinLabel(
        layer.material === "not_documented"
          ? "Eardrum graft"
          : `${humanize(layer.material)} graft`,
        documentedDetail(layer.technique),
      );
    case "ossicle_state":
      return layer.state === "not_documented"
        ? `${humanize(layer.structure)} · state not documented`
        : `${humanize(layer.structure)} · ${humanize(layer.state)}`;
    case "ossicular_reconstruction":
      return layer.method === "none"
        ? "No ossicular reconstruction performed"
        : joinLabel(
            layer.method === "not_documented"
              ? "Ossicular reconstruction"
              : humanize(layer.method),
            documentedDetail(layer.material, ["not_applicable"]),
          );
    case "tympanostomy":
      return joinLabel(
        layer.action === "not_documented"
          ? "Tympanostomy details not documented"
          : humanize(layer.action),
        documentedDetail(layer.quadrant),
      );
    case "mastoid_technique":
      return layer.technique === "not_documented"
        ? "Mastoid technique not documented"
        : humanize(layer.technique);
    case "cholesteatoma_extent":
      return layer.regions.length > 0
        ? `Cholesteatoma · ${layer.regions.map(humanize).join(", ")}`
        : "Cholesteatoma extent not documented";
    case "stapes_procedure":
      return joinLabel(
        layer.technique === "not_documented" ? "Stapes procedure" : humanize(layer.technique),
        documentedDetail(layer.pistonAttachment, ["none"]),
      );
    case "cochlear_insertion":
      return joinLabel(
        layer.route === "not_documented"
          ? "Cochlear implant insertion"
          : `${humanize(layer.route)} insertion`,
        documentedDetail(layer.completion),
      );
    case "bone_conduction_implant":
      return joinLabel(
        layer.coupling === "not_documented"
          ? "Bone-conduction implant"
          : `${humanize(layer.coupling)} implant`,
        documentedDetail(layer.stage),
      );
    case "canalplasty":
      return joinLabel(
        "Canalplasty",
        documentedDetail(layer.region),
        documentedDetail(layer.result),
      );
    case "eustachian_tube_dilation":
      return joinLabel("Eustachian-tube dilation", documentedDetail(layer.result));
    case "intraoperative_deviation":
      return layer.deviation === "not_documented"
        ? "Intraoperative change · details not documented"
        : `Intraoperative change · ${humanize(layer.deviation)}`;
    case "verification_status":
      return joinLabel(
        layer.verification === "not_documented"
          ? "Verification"
          : humanize(layer.verification),
        documentedDetail(layer.result),
      );
  }
}
