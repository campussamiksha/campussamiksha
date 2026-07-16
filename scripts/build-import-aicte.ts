/**
 * Build the AICTE institution directory with states + title-cased names, from
 * the AICTE dashboard endpoint, and (optionally) load it.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     scripts/build-import-aicte.ts <2024-25-raw.json> [--import]
 *
 * Strategy: pull 2026-27 per-state (authoritative state per institute), build a
 * district→state map from that same data, then union in any 2024-25-only
 * institutes with their state inferred from the district map. Names/cities are
 * title-cased while preserving acronyms (IIT, dotted initials like A.M.C.).
 */
import { readFileSync, writeFileSync } from "fs";
import { PrismaClient, Prisma, InstitutionType, OwnershipType } from "@prisma/client";
import { slugify } from "../lib/institutionImport";

const YEAR_LATEST = "2026-2027";
const BASE = "https://facilities.aicte-india.org/dashboard/pages";
const HEADERS = { "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/approvedinstitutes.php` };

const MAP: Record<string, [InstitutionType, OwnershipType | null]> = {
  "Central University": ["central_university", "government"],
  "State Government University": ["state_university", "government"],
  "State Private University": ["private_university", "private_unaided"],
  "Deemed to be University(Pvt)": ["deemed_university", "trust_society"],
  "Deemed to be University(Govt)": ["deemed_university", "government"],
  "Private-Self Financing": ["affiliated_college", "private_unaided"],
  "Government": ["affiliated_college", "government"],
  "Govt aided": ["affiliated_college", "government_aided"],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Title-casing that preserves acronyms ----
const SMALL = new Set(["of", "and", "the", "for", "in", "at", "to", "on", "a", "an", "&"]);
const FORCE_TITLE = new Set(["GOVT", "GOVT.", "DR", "DR.", "ST", "ST.", "MR", "MRS", "SMT", "SHRI"]);

function titleWord(w: string, isFirst: boolean): string {
  if (!w) return w;
  const core = w.replace(/[^A-Za-z]/g, "");
  const lower = w.toLowerCase();
  if (/^[A-Za-z](\.[A-Za-z])+\.?$/.test(w)) return w.toUpperCase();           // dotted acronym A.M.C.
  if (!isFirst && SMALL.has(lower)) return lower;                              // small words
  if (FORCE_TITLE.has(w.toUpperCase())) return lower.replace(/\b[a-z]/g, (m) => m.toUpperCase());
  if (core.length >= 2 && core.length <= 4 && /^[A-Z.&()/-]+$/.test(w)) return w; // short all-caps → acronym
  return lower.replace(/\b[a-z]/g, (m) => m.toUpperCase());                    // normal title case
}

function titleCase(name: string): string {
  return name.trim().replace(/\s+/g, " ").split(" ").map((w, i) => titleWord(w, i === 0)).join(" ");
}

async function fetchStates(year: string): Promise<string[]> {
  const html = await (await fetch(`${BASE}/approvedinstitutes.php?q=${year}`, { headers: HEADERS })).text();
  const i = html.indexOf('id="state"');
  const seg = html.slice(i, html.indexOf("</select>", i));
  const states = [...seg.matchAll(/<option[^>]*>([^<]+)<\/option>/g)]
    .map((m) => m[1].trim())
    .filter((s) => s && !s.includes("--All--"));
  return Array.from(new Set(states));
}

async function fetchState(year: string, state: string): Promise<string[][]> {
  const u = `${BASE}/php/approvedinstituteserver.php?method=fetchdata&year=${year}` +
    `&program=1&level=1&institutiontype=1&Women=1&Minority=1&state=${encodeURIComponent(state)}&course=1`;
  const txt = await (await fetch(u, { headers: HEADERS })).text();
  try { return JSON.parse(txt) ?? []; } catch { return []; }
}

interface Rec { aicteId: string; name: string; district: string; category: string; state: string | null; }

async function main() {
  // Optional 2024-25 raw file to union in (skipped if omitted or a flag).
  const rawFile = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
  const doImport = process.argv.includes("--import");

  // 1) Pull 2026-27 per state → authoritative state + district map.
  const states = await fetchStates(YEAR_LATEST);
  console.log(`States: ${states.length}. Pulling ${YEAR_LATEST} per state…`);
  const byId = new Map<string, Rec>();
  const districtVotes = new Map<string, Map<string, number>>();
  for (const st of states) {
    const rows = await fetchState(YEAR_LATEST, st);
    for (const r of rows) {
      const id = String(r[0] ?? "").trim();
      if (!id || byId.has(id)) continue;
      const district = String(r[3] ?? "").trim();
      byId.set(id, { aicteId: id, name: String(r[1] ?? "").trim(), district, category: String(r[4] ?? "").trim(), state: st });
      if (district) {
        const d = district.toUpperCase();
        if (!districtVotes.has(d)) districtVotes.set(d, new Map());
        const m = districtVotes.get(d)!;
        m.set(st, (m.get(st) ?? 0) + 1);
      }
    }
    process.stdout.write(`  ${st}: ${rows.length}\n`);
    await sleep(150);
  }
  const districtToState = new Map<string, string>();
  for (const [d, m] of districtVotes) {
    districtToState.set(d, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }

  // 2) Union in 2024-25-only institutes, inferring state from the district map.
  let added24 = 0;
  if (rawFile) {
    const raw: string[][] = JSON.parse(readFileSync(rawFile, "utf8"));
    for (const r of raw) {
      const id = String(r[0] ?? "").trim();
      if (!id || byId.has(id)) continue;
      const district = String(r[3] ?? "").trim();
      byId.set(id, {
        aicteId: id, name: String(r[1] ?? "").trim(), district, category: String(r[4] ?? "").trim(),
        state: districtToState.get(district.toUpperCase()) ?? null,
      });
      added24++;
    }
  }

  // 3) Build final records (title-cased, typed, unique slugs).
  const used = new Set<string>();
  const rows: Prisma.InstitutionCreateManyInput[] = [];
  let noState = 0;
  for (const rec of byId.values()) {
    if (!rec.name) continue;
    const [type, ownership] = MAP[rec.category] ?? (["other", null] as [InstitutionType, OwnershipType | null]);
    let slug = slugify(rec.name);
    if (used.has(slug)) slug = `${slug}-${slugify(rec.aicteId)}`;
    used.add(slug);
    if (!rec.state) noState++;
    rows.push({
      name: titleCase(rec.name), slug, aka: [rec.aicteId], type,
      ownership: ownership ?? undefined,
      city: rec.district ? titleCase(rec.district) : undefined,
      state: rec.state ?? undefined,
    });
  }

  const header = "name,type,ownership,city,state,aka,slug";
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [header, ...rows.map((r) =>
    [r.name, r.type, r.ownership ?? "", r.city ?? "", r.state ?? "", (r.aka as string[]).join(";"), r.slug]
      .map((v) => cell(String(v))).join(","))].join("\n") + "\n";
  writeFileSync("data/aicte-institutions.csv", csv);
  console.log(`\nBuilt ${rows.length} institutions (${byId.size - added24} from ${YEAR_LATEST}, ${added24} added from 2024-25, ${noState} without state).`);
  console.log("Wrote data/aicte-institutions.csv");

  if (!doImport) { console.log("Dry run — pass --import to load."); return; }

  const prisma = new PrismaClient();
  // Replace previous AICTE-imported rows (aka holds an AICTE id like '1-1234'),
  // but never touch any institution that already has user content.
  const del = await prisma.$executeRawUnsafe(`
    DELETE FROM institutions i
    WHERE EXISTS (SELECT 1 FROM unnest(i.aka) a WHERE a ~ '^[0-9]+-[0-9]+$')
      AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.institution_id = i.id)
      AND NOT EXISTS (SELECT 1 FROM salary_reports s WHERE s.institution_id = i.id)
      AND NOT EXISTS (SELECT 1 FROM interview_reviews v WHERE v.institution_id = i.id)`);
  console.log(`Removed ${del} prior AICTE rows.`);

  let inserted = 0;
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await prisma.institution.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    inserted += res.count;
    process.stdout.write(`  loaded ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log(`\nInserted ${inserted} institutions.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
