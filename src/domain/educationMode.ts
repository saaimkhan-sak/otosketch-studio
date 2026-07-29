export type EducationMode = "postoperative_summary" | "preoperative_education";

export const educationModeLabels: Record<EducationMode, string> = {
  postoperative_summary: "Completed procedure",
  preoperative_education: "Upcoming procedure",
};

