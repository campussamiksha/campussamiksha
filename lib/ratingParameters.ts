// Single source of truth for rating parameters — shared by the seed script and
// the frontend review form. Keeps DB seed and UI in lockstep.

export type ReviewerCategory =
  | "teaching_faculty"
  | "non_teaching_staff"
  | "research_scholar";

export interface RatingParameterDef {
  id: number;
  code: string;
  label: string;
  description: string;
  applicableCategories: ReviewerCategory[];
  isCore: boolean;
  displayOrder: number;
}

const ALL: ReviewerCategory[] = [
  "teaching_faculty",
  "non_teaching_staff",
  "research_scholar",
];

export const RATING_PARAMETERS: RatingParameterDef[] = [
  // Shared across all three categories
  { id: 1, code: "compensation", label: "Compensation & Benefits", description: "Pay, allowances, benefits relative to role", applicableCategories: ALL, isCore: true, displayOrder: 10 },
  { id: 2, code: "salary_punctuality", label: "Salary / Stipend Punctuality", description: "Is pay released on time and in full", applicableCategories: ALL, isCore: true, displayOrder: 20 },
  { id: 3, code: "management_quality", label: "Management & Administration", description: "Transparency, fairness, competence of leadership", applicableCategories: ALL, isCore: true, displayOrder: 30 },
  { id: 4, code: "work_life_balance", label: "Work–Life Balance", description: "Hours, weekend/admin load, flexibility", applicableCategories: ALL, isCore: true, displayOrder: 40 },
  { id: 5, code: "infrastructure", label: "Infrastructure & Facilities", description: "Labs, library, internet, campus, quarters", applicableCategories: ALL, isCore: true, displayOrder: 50 },
  { id: 6, code: "inclusion_safety", label: "Inclusion & Harassment Safety", description: "ICC functioning, gender/caste climate, safety", applicableCategories: ALL, isCore: true, displayOrder: 60 },
  { id: 7, code: "job_security", label: "Job Security", description: "Stability of employment / contract terms", applicableCategories: ALL, isCore: true, displayOrder: 70 },
  { id: 8, code: "leave_time_off", label: "Leave & Time Off", description: "Maternity/paternity, casual & medical leave, vacations — how generous, and how freely granted", applicableCategories: ALL, isCore: true, displayOrder: 80 },
  { id: 9, code: "benefits_welfare", label: "Benefits, Insurance & Welfare", description: "Health insurance, PF/gratuity, medical facilities, childcare and other welfare", applicableCategories: ALL, isCore: true, displayOrder: 90 },

  // Teaching faculty specific
  { id: 20, code: "teaching_workload", label: "Teaching Workload", description: "Contact hours, subjects, class sizes", applicableCategories: ["teaching_faculty"], isCore: true, displayOrder: 100 },
  { id: 21, code: "research_support", label: "Research Support & Freedom", description: "Grants, seed money, freedom of direction", applicableCategories: ["teaching_faculty"], isCore: true, displayOrder: 110 },
  { id: 22, code: "academic_freedom", label: "Academic Freedom & Autonomy", description: "Syllabus/grading/publication autonomy", applicableCategories: ["teaching_faculty"], isCore: true, displayOrder: 120 },
  { id: 23, code: "career_growth", label: "Career Growth & Promotion", description: "Promotion fairness per UGC/AICTE norms", applicableCategories: ["teaching_faculty"], isCore: true, displayOrder: 130 },
  { id: 24, code: "student_quality", label: "Student Quality & Culture", description: "Calibre and engagement of students", applicableCategories: ["teaching_faculty"], isCore: false, displayOrder: 140 },

  // Non-teaching staff specific
  { id: 40, code: "supervisor_support", label: "Supervisor Support", description: "Support and fairness from reporting officer", applicableCategories: ["non_teaching_staff"], isCore: true, displayOrder: 200 },
  { id: 41, code: "workload_fairness", label: "Workload Reasonableness", description: "Reasonableness of duties and hours", applicableCategories: ["non_teaching_staff"], isCore: true, displayOrder: 210 },
  { id: 42, code: "growth_training", label: "Growth & Training", description: "Skilling, training, advancement opportunity", applicableCategories: ["non_teaching_staff"], isCore: true, displayOrder: 220 },
  { id: 43, code: "workplace_respect", label: "Workplace Respect", description: "Dignity/respect vs. faculty & management", applicableCategories: ["non_teaching_staff"], isCore: true, displayOrder: 230 },
  { id: 44, code: "role_clarity", label: "Role Clarity", description: "Clarity of responsibilities and expectations", applicableCategories: ["non_teaching_staff"], isCore: false, displayOrder: 240 },

  // Research scholar specific
  { id: 60, code: "supervisor_guidance", label: "Supervisor / Guide Quality", description: "Mentorship, availability, fairness of guide", applicableCategories: ["research_scholar"], isCore: true, displayOrder: 300 },
  { id: 61, code: "stipend_adequacy", label: "Stipend Adequacy", description: "Is the stipend adequate for cost of living", applicableCategories: ["research_scholar"], isCore: true, displayOrder: 310 },
  { id: 62, code: "research_facilities", label: "Research Infrastructure", description: "Lab, equipment, compute, funding for work", applicableCategories: ["research_scholar"], isCore: true, displayOrder: 320 },
  { id: 63, code: "research_freedom", label: "Freedom in Research", description: "Autonomy in problem choice and methods", applicableCategories: ["research_scholar"], isCore: true, displayOrder: 330 },
  { id: 64, code: "publication_support", label: "Publication & Conference Support", description: "Support for papers, travel, funding", applicableCategories: ["research_scholar"], isCore: true, displayOrder: 340 },
  { id: 65, code: "lab_culture", label: "Lab / Group Culture", description: "Collaboration, toxicity, peer environment", applicableCategories: ["research_scholar"], isCore: false, displayOrder: 350 },
];

export function parametersFor(category: ReviewerCategory): RatingParameterDef[] {
  return RATING_PARAMETERS
    .filter((p) => p.applicableCategories.includes(category))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export const CATEGORY_LABELS: Record<ReviewerCategory, string> = {
  teaching_faculty: "Teaching Faculty",
  non_teaching_staff: "Non-Teaching Staff",
  research_scholar: "Research Scholar",
};
