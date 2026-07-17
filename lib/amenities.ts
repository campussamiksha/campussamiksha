// Factual amenities a reviewer can confirm as available or not (as opposed to
// rateable opinions). Stored on each review as { [code]: boolean } — true =
// available, false = not available, key absent = not answered. Aggregated on
// the institution page as "reported available by X of Y reviewers".
export interface Amenity {
  code: string;
  label: string;
}

export const AMENITIES: Amenity[] = [
  { code: "campus_accommodation", label: "Campus accommodation / staff quarters" },
  { code: "health_insurance", label: "Health insurance" },
  { code: "on_campus_medical", label: "On-campus medical / health centre" },
  { code: "childcare", label: "Childcare / crèche" },
  { code: "transport", label: "Transport / shuttle" },
  { code: "canteen_mess", label: "Canteen / mess" },
  { code: "sports_gym", label: "Sports / gym" },
];

export const AMENITY_CODES = new Set(AMENITIES.map((a) => a.code));
export const amenityLabel = (code: string) =>
  AMENITIES.find((a) => a.code === code)?.label ?? code;
