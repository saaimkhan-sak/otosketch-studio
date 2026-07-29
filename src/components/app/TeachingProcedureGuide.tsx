import { GraduationCap } from "lucide-react";
import {
  getActiveSurgeryLayers,
  labelSurgeryProcedure,
  type SurgeryPlan,
} from "@/domain/surgeryPlan";
import { labelSurgeryLayer } from "@/components/diagram/ComposedSurgeryDiagram";

interface TeachingProcedureGuideProps {
  plan: SurgeryPlan;
}

export function TeachingProcedureGuide({ plan }: TeachingProcedureGuideProps) {
  const procedure =
    plan.procedureFamilies === "not_documented"
      ? "Procedure not documented"
      : plan.procedureFamilies.map(labelSurgeryProcedure).join(" + ");
  const layers = getActiveSurgeryLayers(plan).filter(
    (layer) => layer.documentation === "documented",
  );
  const findings = layers.filter((layer) => layer.role === "finding");
  const actions = layers.filter((layer) => layer.role === "action");
  const checks = layers.filter(
    (layer) => layer.role === "verification" || layer.role === "deviation",
  );

  const sections = [
    {
      title: "Orient to the anatomy",
      description:
        findings.length > 0
          ? findings.map(labelSurgeryLayer)
          : ["Review the generic anatomy and confirm the operative side."],
    },
    {
      title: "Follow the operative sequence",
      description:
        actions.length > 0
          ? actions.map(labelSurgeryLayer)
          : ["Add documented procedure steps to build the walkthrough."],
    },
    {
      title: "Close with checks and variations",
      description:
        checks.length > 0
          ? checks.map(labelSurgeryLayer)
          : ["Discuss common variations without presenting them as documented facts."],
    },
  ];

  return (
    <section className="teaching-guide" aria-labelledby="teaching-guide-title">
      <header>
        <div>
          <p className="eyebrow">Teaching walkthrough</p>
          <h3 id="teaching-guide-title">{procedure}</h3>
          <p>
            A structured sequence for trainees. This supports explanation and rehearsal; it does not
            direct clinical care.
          </p>
        </div>
        <span>
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          Faculty-led
        </span>
      </header>
      <ol>
        {sections.map((section, index) => (
          <li key={section.title}>
            <span>{index + 1}</span>
            <div>
              <h4>{section.title}</h4>
              <ul>
                {section.description.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
