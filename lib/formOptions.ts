import type { ReviewerCategory } from "./ratingParameters";

// Employment-type options per reviewer category (shared by review/salary forms).
export const EMP_TYPES: Record<ReviewerCategory, [string, string][]> = {
  teaching_faculty: [
    ["permanent", "Permanent"],
    ["tenure_track", "Tenure track"],
    ["contract", "Contract"],
    ["adhoc_guest", "Ad-hoc / Guest"],
    ["visiting", "Visiting"],
    ["other", "Other"],
  ],
  non_teaching_staff: [
    ["permanent", "Permanent"],
    ["contract", "Contract"],
    ["project_staff", "Project staff"],
    ["other", "Other"],
  ],
  research_scholar: [
    ["phd_scholar", "PhD scholar"],
    ["postdoc", "Postdoc"],
    ["project_staff", "Project JRF/SRF/RA"],
    ["other", "Other"],
  ],
};

export const INTERVIEW_OUTCOMES: [string, string][] = [
  ["offer", "Received an offer"],
  ["rejected", "Rejected"],
  ["no_response", "No response / ghosted"],
  ["withdrew", "Withdrew"],
];

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
