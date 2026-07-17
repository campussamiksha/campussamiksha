/**
 * Comprehensive directory fill from AISHE data (npm: aishe-institutions-list).
 * Adds institutions missing from the AICTE/UGC set; skips slug-matches to avoid
 * duplicating existing (richer) entries. Type inferred from the AISHE code
 * prefix (C=college, S=standalone, R=R&D, U=university).
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     scripts/import-aishe.ts <institutions.json> [--write]
 */
import { readFileSync } from "fs";
import { PrismaClient, InstitutionType } from "@prisma/client";
import { slugify } from "../lib/institutionImport";

const prisma = new PrismaClient();

function typeFor(aisheCode: string): InstitutionType {
  const p = (aisheCode || "").charAt(0).toUpperCase();
  if (p === "R") return "research_institute";
  if (p === "U") return "deemed_university"; // new universities not already in the UGC set (best-effort)
  return "affiliated_college"; // C (college) and S (standalone) — teaching institutions
}

// Acronym-preserving title case (same approach as the AICTE importer).
const SMALL = new Set(["of", "and", "the", "for", "in", "at", "to", "on", "a", "an", "&"]);
function titleWord(w: string, first: boolean): string {
  if (!w) return w;
  const core = w.replace(/[^A-Za-z]/g, "");
  const lower = w.toLowerCase();
  if (/^[A-Za-z](\.[A-Za-z])+\.?$/.test(w)) return w.toUpperCase();
  if (!first && SMALL.has(lower)) return lower;
  if (core.length >= 2 && core.length <= 4 && /^[A-Z.&()/-]+$/.test(w)) return w;
  return lower.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}
const titleCase = (s: string) => s.trim().replace(/\s+/g, " ").split(" ").map((w, i) => titleWord(w, i === 0)).join(" ");

async function main() {
  const file = process.argv[2];
  const write = process.argv.includes("--write");
  if (!file) { console.error("Usage: import-aishe <institutions.json> [--write]"); process.exit(1); }

  const raw: { aishe_code: string; name: string; state: string; district?: string }[] = JSON.parse(readFileSync(file, "utf8"));
  console.log(`AISHE records: ${raw.length}`);

  // Existing slugs → skip AISHE rows that already have an entry.
  const existing = new Set((await prisma.institution.findMany({ select: { slug: true } })).map((r) => r.slug));
  console.log(`Existing institutions: ${existing.size}`);

  const used = new Set<string>();
  const rows: { name: string; slug: string; aka: string[]; type: InstitutionType; state?: string; city?: string; country: string }[] = [];
  let skipped = 0;
  for (const r of raw) {
    const name = titleCase(String(r.name || ""));
    if (!name) continue;
    const base = slugify(name);
    if (!base) continue;
    if (existing.has(base)) { skipped++; continue; }
    const slug = used.has(base) ? `${base}-${slugify(r.aishe_code)}` : base;
    used.add(slug);
    rows.push({
      name, slug, aka: r.aishe_code ? [r.aishe_code] : [],
      type: typeFor(r.aishe_code),
      state: r.state ? r.state.replace(/\s+/g, " ").trim() : undefined,
      city: r.district ? titleCase(String(r.district)) : undefined,
      country: "India",
    });
  }

  console.log(`New to add: ${rows.length} | skipped (already present): ${skipped}`);
  if (!write) { console.log("Dry run — pass --write to insert."); await prisma.$disconnect(); return; }

  let inserted = 0;
  const CHUNK = 2000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await prisma.institution.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    inserted += res.count;
    process.stdout.write(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log(`\nInserted ${inserted} institutions.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
