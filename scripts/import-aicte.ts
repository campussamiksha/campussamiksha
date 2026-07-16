/**
 * Transform the AICTE approved-institutes dump (array-of-arrays JSON from the
 * AICTE dashboard endpoint) into institution rows, write a reusable CSV, and
 * (optionally) bulk-load into the DB.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-aicte.ts <raw.json> [--import]
 *
 * Source columns: [0]=AICTE id, [1]=name, [2]=address, [3]=district,
 * [4]=ownership category, [5]=women, [6]=minority, [7]=app id.
 * Caveats: no state field in the source; institution type is inferred from the
 * ownership category; names are as AICTE stores them (upper-case).
 */
import { readFileSync, writeFileSync } from "fs";
import { PrismaClient, Prisma, InstitutionType, OwnershipType } from "@prisma/client";
import { slugify } from "../lib/institutionImport";

// AICTE ownership category -> [our type, our ownership]
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

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

async function main() {
  const file = process.argv[2];
  const doImport = process.argv.includes("--import");
  if (!file) { console.error("Usage: import-aicte <raw.json> [--import]"); process.exit(1); }

  const raw: string[][] = JSON.parse(readFileSync(file, "utf8"));
  const used = new Set<string>();
  const rows: Prisma.InstitutionCreateManyInput[] = [];
  let unmapped = 0;

  for (const r of raw) {
    const aicteId = String(r[0] ?? "").trim();
    const name = String(r[1] ?? "").trim();
    const district = String(r[3] ?? "").trim();
    const category = String(r[4] ?? "").trim();
    if (!name) continue;

    const [type, ownership] = MAP[category] ?? (["other", null] as [InstitutionType, OwnershipType | null]);
    if (!MAP[category]) unmapped++;

    // Unique, stable slug (append AICTE id when the plain slug collides).
    let slug = slugify(name);
    if (used.has(slug)) slug = `${slug}-${slugify(aicteId)}`;
    used.add(slug);

    rows.push({
      name,
      slug,
      aka: aicteId ? [aicteId] : [],
      type,
      ownership: ownership ?? undefined,
      city: district || undefined,
    });
  }

  // Write a reusable CSV artifact.
  const header = "name,type,ownership,city,aka,slug";
  const lines = rows.map((r) =>
    [r.name, r.type, r.ownership ?? "", r.city ?? "", (r.aka as string[]).join(";"), r.slug]
      .map((v) => csvCell(String(v))).join(","),
  );
  writeFileSync("data/aicte-institutions.csv", [header, ...lines].join("\n") + "\n");
  console.log(`Wrote data/aicte-institutions.csv (${rows.length} rows, ${unmapped} with unmapped category → 'other').`);

  if (!doImport) { console.log("Dry run — pass --import to load into the DB."); return; }

  const prisma = new PrismaClient();
  let inserted = 0;
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await prisma.institution.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    inserted += res.count;
    process.stdout.write(`  loaded ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log(`\nInserted ${inserted} new institutions (existing slugs skipped).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
