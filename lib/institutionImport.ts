// Pure mapping from CSV rows to institution records — no DB, so it is unit
// testable. The importer script (scripts/import-institutions.ts) does the I/O
// and upserts. Recognised CSV headers (case-insensitive):
//   name, type, ownership, city, state, aka, established_year, website,
//   naac_grade, naac_cgpa, nirf_rank_overall, ugc_recognized, aicte_approved,
//   nba_accredited, pay_scale_type
// `aka` (alternate names / acronyms) is split on ';' or '|'.

export interface ImportRecord {
  name: string;
  slug: string;
  aka: string[];
  type: string;
  ownership: string | null;
  establishedYear: number | null;
  city: string | null;
  state: string | null;
  website: string | null;
  naacGrade: string | null;
  naacCgpa: number | null;
  nirfRankOverall: number | null;
  ugcRecognized: boolean | null;
  aicteApproved: boolean | null;
  nbaAccredited: boolean | null;
  payScaleType: string | null;
}

export interface ImportError {
  line: number; // 1-based line in the source file
  reason: string;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const TYPE_VALUES = new Set([
  "central_university", "state_university", "deemed_university", "private_university",
  "institute_of_national_importance", "autonomous_college", "affiliated_college",
  "research_institute", "other",
]);
const TYPE_ALIASES: Record<string, string> = {
  iit: "institute_of_national_importance", iim: "institute_of_national_importance",
  nit: "institute_of_national_importance", iiit: "institute_of_national_importance",
  iiser: "institute_of_national_importance", aiims: "institute_of_national_importance",
  ini: "institute_of_national_importance",
  central: "central_university", state: "state_university", deemed: "deemed_university",
  private: "private_university", autonomous: "autonomous_college",
  affiliated: "affiliated_college", research: "research_institute",
};
const OWNERSHIP_VALUES = new Set([
  "government", "government_aided", "private_unaided", "autonomous", "trust_society",
]);
const OWNERSHIP_ALIASES: Record<string, string> = {
  govt: "government", public: "government", aided: "government_aided",
  private: "private_unaided", trust: "trust_society", society: "trust_society",
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "_");
}

function mapType(raw: string): string | null {
  const n = norm(raw);
  if (TYPE_VALUES.has(n)) return n;
  const base = n.replace(/_(university|college|institute)$/, "");
  return TYPE_ALIASES[n] ?? TYPE_ALIASES[base] ?? null;
}

function mapOwnership(raw: string): string | null {
  if (!raw.trim()) return null;
  const n = norm(raw);
  if (OWNERSHIP_VALUES.has(n)) return n;
  return OWNERSHIP_ALIASES[n] ?? null;
}

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === "") return null;
  if (["true", "yes", "y", "1"].includes(v)) return true;
  if (["false", "no", "n", "0"].includes(v)) return false;
  return null;
}

function parseIntOrNull(raw: string): number | null {
  const v = raw.trim();
  if (v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(raw: string): number | null {
  const v = raw.trim();
  if (v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function splitAka(raw: string): string[] {
  return raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
}

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function rowsToRecords(rows: string[][]): { records: ImportRecord[]; errors: ImportError[] } {
  const records: ImportRecord[] = [];
  const errors: ImportError[] = [];
  if (rows.length === 0) return { records, errors };

  const header = rows[0].map((h) => norm(h));
  const idx = (name: string) => header.indexOf(name);
  const iName = idx("name");
  const iType = idx("type");
  if (iName < 0 || iType < 0) {
    return { records, errors: [{ line: 1, reason: "CSV must have 'name' and 'type' columns" }] };
  }

  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i] : "");

  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const line = ri + 1;
    const name = cell(r, iName).trim();
    if (!name) { errors.push({ line, reason: "missing name" }); continue; }

    const type = mapType(cell(r, iType));
    if (!type) { errors.push({ line, reason: `unrecognised type "${cell(r, iType).trim()}"` }); continue; }

    records.push({
      name,
      slug: slugify(name),
      aka: splitAka(cell(r, idx("aka"))),
      type,
      ownership: mapOwnership(cell(r, idx("ownership"))),
      establishedYear: parseIntOrNull(cell(r, idx("established_year"))),
      city: orNull(cell(r, idx("city"))),
      state: orNull(cell(r, idx("state"))),
      website: orNull(cell(r, idx("website"))),
      naacGrade: orNull(cell(r, idx("naac_grade"))),
      naacCgpa: parseFloatOrNull(cell(r, idx("naac_cgpa"))),
      nirfRankOverall: parseIntOrNull(cell(r, idx("nirf_rank_overall"))),
      ugcRecognized: parseBool(cell(r, idx("ugc_recognized"))),
      aicteApproved: parseBool(cell(r, idx("aicte_approved"))),
      nbaAccredited: parseBool(cell(r, idx("nba_accredited"))),
      payScaleType: orNull(cell(r, idx("pay_scale_type"))),
    });
  }

  return { records, errors };
}
