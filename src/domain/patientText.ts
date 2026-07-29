import type { OperativeCase } from "./schema";

export function generatePatientTitle(operativeCase: OperativeCase) {
  const side = operativeCase.procedure.laterality.value;
  const sideText = side === "left" || side === "right" ? `${side} ` : "";

  if (operativeCase.repair.reconstructionType.value === "bone_cement_bridge") {
    return `Your ${sideText}eardrum surgery included repair of a small hearing-bone connection`;
  }
  if (operativeCase.repair.reconstructionType.value === "porp") {
    return `Your ${sideText}middle ear surgery included a partial hearing-bone prosthesis`;
  }
  if (operativeCase.repair.reconstructionType.value === "torp") {
    return `Your ${sideText}middle ear surgery included a total hearing-bone prosthesis`;
  }
  return `Your ${sideText}ear surgery visual summary`;
}

export function generatePatientExplanation(operativeCase: OperativeCase): string[] {
  const lines = [
    "This simplified reference illustration shows the eardrum and the small hearing bones behind it.",
  ];

  if (operativeCase.anatomy.tympanicMembrane.value.startsWith("perforation")) {
    lines.push("The finding panel shows a documented opening in the eardrum.");
  }

  if (operativeCase.anatomy.incus.value === "long_process_eroded") {
    lines.push("Part of the incus is shown as worn away because that was documented in the note.");
  }

  if (operativeCase.anatomy.incudostapedialJoint.value === "discontinuous") {
    lines.push("The finding panel shows a gap where the incus normally connects with the stapes.");
  }

  if (operativeCase.repair.reconstructionType.value === "bone_cement_bridge") {
    lines.push("The repair panel shows bone cement bridging the hearing-bone connection.");
  }

  if (operativeCase.repair.reconstructionType.value === "porp") {
    lines.push(
      "The repair panel shows a partial prosthesis used to reconnect the hearing pathway.",
    );
  }

  if (operativeCase.repair.reconstructionType.value === "torp") {
    lines.push(
      "The repair panel shows a total prosthesis used to connect the eardrum area to the inner hearing bone base.",
    );
  }

  const graftType = operativeCase.repair.graftType.value;
  if (graftType === "temporalis_fascia") {
    lines.push(
      "The highlighted medical-art region shows how the documented fascia covers the eardrum perforation and overlaps its margins; it remains a generic reference, not patient-specific geometry.",
    );
  } else if (
    graftType === "cartilage" &&
    ["porp", "torp"].includes(operativeCase.repair.reconstructionType.value)
  ) {
    lines.push(
      "The repair reference depicts a protective cartilage layer over the prosthesis; its size and position are generic.",
    );
  } else if (graftType === "perichondrium") {
    lines.push("The repair panel marks the documented perichondrium used in the repair.");
  } else if (graftType !== "not_documented" && graftType !== "none") {
    lines.push("The repair panel marks the documented graft material in its repair context.");
  }

  lines.push(
    "Only labeled callouts are case-specific; the professional medical-art anatomy is generic reference material and is not documented by the note.",
  );
  lines.push("This not-to-scale educational illustration must be reviewed with the surgeon.");
  return lines;
}

export function generateDiagramAltText(operativeCase: OperativeCase) {
  return generatePatientExplanation(operativeCase).join(" ");
}
