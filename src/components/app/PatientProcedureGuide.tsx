import { CircleHelp, ClipboardList, MessageCircleQuestion, Target } from "lucide-react";
import {
  generatePreoperativePatientGuide,
  type PreoperativePatientGuide,
} from "@/domain/preoperativeEducation";
import type { SurgeryPlan } from "@/domain/surgeryPlan";

interface PatientProcedureGuideProps {
  plan: SurgeryPlan;
  compact?: boolean;
}

const sections: Array<{
  key: keyof Pick<
    PreoperativePatientGuide,
    "goals" | "plannedSteps" | "whatToExpect" | "questions"
  >;
  title: string;
  icon: typeof Target;
}> = [
  { key: "goals", title: "Goal", icon: Target },
  { key: "plannedSteps", title: "What is planned", icon: ClipboardList },
  { key: "whatToExpect", title: "What to expect", icon: CircleHelp },
  { key: "questions", title: "Ask your surgeon", icon: MessageCircleQuestion },
];

export function PatientProcedureGuide({ plan, compact = false }: PatientProcedureGuideProps) {
  const guide = generatePreoperativePatientGuide(plan);

  return (
    <section
      className={compact ? "preop-guide is-compact" : "preop-guide"}
      aria-labelledby={compact ? undefined : "preop-guide-title"}
    >
      {!compact ? (
        <header className="preop-guide-header">
          <div>
            <p className="eyebrow">Clinic discussion guide</p>
            <h3 id="preop-guide-title">{guide.title}</h3>
          </div>
          <span>Educational preview</span>
        </header>
      ) : null}

      <div className="preop-guide-grid">
        {sections.map(({ key, title, icon: Icon }) => (
          <article key={key} className="preop-guide-card">
            <h4>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {title}
            </h4>
            <ul>
              {guide[key].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="preop-change-notice" role="note">
        <strong>Plan may change during surgery.</strong>
        <span>{guide.limitations.join(" ")}</span>
      </div>
    </section>
  );
}

