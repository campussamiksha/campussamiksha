/**
 * Enrich institutions with the NIRF "Overall" rank (top 200) from nirfindia.org,
 * and add any top-ranked institution missing from the directory.
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-nirf.ts [--write]
 */
import { PrismaClient, InstitutionType } from "@prisma/client";
import { slugify } from "../lib/institutionImport";

const prisma = new PrismaClient();
const YEAR = "2025";
const PAGES = ["OverallRanking.html", "OverallRanking150.html", "OverallRanking200.html"];

async function fetchRanked(): Promise<{ name: string; rank: number }[]> {
  const seen = new Set<string>();
  const out: { name: string; rank: number }[] = [];
  for (const page of PAGES) {
    const html = await (await fetch(`https://www.nirfindia.org/Rankings/${YEAR}/${page}`)).text();
    const re = /<td>\s*(IR-O-[A-Z0-9-]+)\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*</g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(html))) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const name = m[2].replace(/\s+/g, " ").trim();
      if (name) { out.push({ name, rank: out.length + 1 }); n++; }
    }
    console.log(`  ${page}: +${n}`);
  }
  return out;
}

// Candidate slugs to catch "&"↔"and", "(…)" parentheticals, and trailing "-City"/", City".
function candidateSlugs(name: string): string[] {
  const c = new Set<string>();
  c.add(slugify(name));
  const clean = name.replace(/&/g, "and").replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  c.add(slugify(clean));
  c.add(slugify(clean.replace(/[-,]\s*[A-Za-z. ]+$/, "").trim()));
  return [...c].filter(Boolean);
}

function inferType(name: string): InstitutionType {
  if (/institute of technology|\bIIT\b|\bNIT\b|\bIIIT\b|indian institute of science|iiser|all india institute of medical|\bAIIMS\b|national institute of|school of mines/i.test(name))
    return "institute_of_national_importance";
  if (/university|vidyapeeth|vishwavidyalaya|academy of higher education/i.test(name)) return "deemed_university";
  if (/college/i.test(name)) return "affiliated_college";
  return "other";
}

async function main() {
  const write = process.argv.includes("--write");
  console.log(`Fetching NIRF ${YEAR} Overall…`);
  const ranked = await fetchRanked();
  console.log(`Total ${ranked.length} ranked.`);

  let updated = 0, created = 0;
  const creates: string[] = [];
  for (const r of ranked) {
    let inst: { id: string } | null = null;
    for (const slug of candidateSlugs(r.name)) {
      inst = await prisma.institution.findUnique({ where: { slug }, select: { id: true } });
      if (inst) break;
    }
    // Note: only exact slug-variant equality is used — a loose "contains" match
    // falsely collapses multi-campus institutions (IIT/NIT/AIIMS/…) onto one row.
    if (inst) {
      updated++;
      if (write) await prisma.institution.update({ where: { id: inst.id }, data: { nirfRankOverall: r.rank } });
    } else {
      created++;
      creates.push(`#${r.rank} ${r.name}`);
      if (write) {
        await prisma.institution.create({
          data: { name: r.name, slug: slugify(r.name), aka: ["NIRF"], type: inferType(r.name), nirfRankOverall: r.rank, country: "India" },
        });
      }
    }
  }

  console.log(`\n${write ? "Wrote" : "Would"}: ${updated} ranked (existing), ${created} created (missing top institutions).`);
  if (!write && creates.length) console.log("To be created:\n  " + creates.slice(0, 60).join("\n  "));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
