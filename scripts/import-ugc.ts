/**
 * Enrich the directory with UGC-recognised universities from ugc.gov.in's
 * Getuniversity_details endpoint. Upserts by slug: updates type/ownership/UGC
 * status on existing entries, and creates the (many) universities missing from
 * the AICTE technical list.
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-ugc.ts [--write]
 */
import { PrismaClient, InstitutionType, OwnershipType } from "@prisma/client";
import { slugify } from "../lib/institutionImport";

const prisma = new PrismaClient();

// unitypeID → [our type, ownership]
const MAP: Record<number, [InstitutionType, OwnershipType | null]> = {
  1: ["central_university", "government"],
  2: ["state_university", "government"],
  3: ["private_university", "private_unaided"],
  4: ["deemed_university", null],
  6: ["institute_of_national_importance", null],
};

async function fetchType(id: number): Promise<Record<string, string>[]> {
  const u = `https://www.ugc.gov.in/universitydetails/Getuniversity_details?unitypeID=${id}`;
  const j = await (await fetch(u, { headers: { "X-Requested-With": "XMLHttpRequest" } })).json();
  return (j.List as Record<string, string>[]) || [];
}

const cleanName = (s: string) => String(s || "").replace(/[“”]/g, '"').replace(/^["']+|["']+$/g, "").replace(/\s+/g, " ").trim();
const year = (s: string) => { const m = /(\d{4})/.exec(String(s || "")); return m ? parseInt(m[1], 10) : null; };

async function main() {
  const write = process.argv.includes("--write");
  let updated = 0, created = 0;

  for (const [idStr, [type, ownership]] of Object.entries(MAP)) {
    const list = await fetchType(Number(idStr));
    console.log(`  type ${idStr} (${type}): ${list.length}`);
    for (const r of list) {
      const name = cleanName(r.uni_name);
      const slug = slugify(name);
      if (!name || !slug) continue;
      const state = String(r.state || "").replace(/\s+/g, " ").trim() || null;
      const website = String(r.url || "").trim() && /\./.test(r.url) ? String(r.url).trim() : null;
      const estd = year(r.ESTD);
      const aishe = String(r.AIshe_code || "").trim();

      const existing = await prisma.institution.findUnique({
        where: { slug },
        select: { id: true, state: true, website: true, establishedYear: true, aka: true },
      });

      if (existing) {
        updated++;
        if (write) {
          const aka = aishe && !existing.aka.includes(aishe) ? [...existing.aka, aishe] : existing.aka;
          await prisma.institution.update({
            where: { id: existing.id },
            data: {
              type, ugcRecognized: true,
              ...(ownership ? { ownership } : {}),
              ...(existing.state ? {} : state ? { state } : {}),
              ...(existing.website ? {} : website ? { website } : {}),
              ...(existing.establishedYear ? {} : estd ? { establishedYear: estd } : {}),
              aka,
            },
          });
        }
      } else {
        created++;
        if (write) {
          await prisma.institution.create({
            data: {
              name, slug, type, ugcRecognized: true, country: "India",
              ownership: ownership ?? undefined,
              state: state ?? undefined,
              website: website ?? undefined,
              establishedYear: estd ?? undefined,
              aka: aishe ? [aishe] : ["UGC"],
            },
          });
        }
      }
    }
  }

  console.log(`\n${write ? "Wrote" : "Would"}: ${updated} updated (existing), ${created} created (universities missing from directory).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
