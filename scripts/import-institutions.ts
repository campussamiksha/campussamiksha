/**
 * Bulk-import institutions from a CSV file (upsert by slug).
 *   npm run db:import -- data/institutions.sample.csv
 * or:
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     scripts/import-institutions.ts data/institutions.sample.csv
 *
 * On update, only columns present (non-empty) in the CSV are overwritten, so a
 * partial file never wipes existing data. See lib/institutionImport.ts for the
 * accepted columns and the type/ownership aliases.
 */
import { readFileSync } from "fs";
import { PrismaClient, Prisma, InstitutionType, OwnershipType } from "@prisma/client";
import { parseCsv } from "../lib/csv";
import { rowsToRecords, ImportRecord } from "../lib/institutionImport";

const prisma = new PrismaClient();

function buildData(r: ImportRecord): Prisma.InstitutionUncheckedCreateInput {
  const data: Prisma.InstitutionUncheckedCreateInput = {
    name: r.name,
    slug: r.slug,
    type: r.type as InstitutionType,
    aka: r.aka,
  };
  if (r.ownership) data.ownership = r.ownership as OwnershipType;
  if (r.establishedYear !== null) data.establishedYear = r.establishedYear;
  if (r.city !== null) data.city = r.city;
  if (r.state !== null) data.state = r.state;
  if (r.website !== null) data.website = r.website;
  if (r.naacGrade !== null) data.naacGrade = r.naacGrade;
  if (r.naacCgpa !== null) data.naacCgpa = new Prisma.Decimal(r.naacCgpa);
  if (r.nirfRankOverall !== null) data.nirfRankOverall = r.nirfRankOverall;
  if (r.ugcRecognized !== null) data.ugcRecognized = r.ugcRecognized;
  if (r.aicteApproved !== null) data.aicteApproved = r.aicteApproved;
  if (r.nbaAccredited !== null) data.nbaAccredited = r.nbaAccredited;
  if (r.payScaleType !== null) data.payScaleType = r.payScaleType;
  return data;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: import-institutions <file.csv>");
    process.exit(1);
  }

  const { records, errors } = rowsToRecords(parseCsv(readFileSync(file, "utf8")));
  console.log(`Parsed ${records.length} valid record(s), ${errors.length} skipped.`);
  for (const e of errors) console.warn(`  skip line ${e.line}: ${e.reason}`);

  let created = 0;
  let updated = 0;
  for (const r of records) {
    const data = buildData(r);
    const existing = await prisma.institution.findUnique({ where: { slug: r.slug }, select: { id: true } });
    if (existing) {
      await prisma.institution.update({ where: { slug: r.slug }, data });
      updated++;
    } else {
      await prisma.institution.create({ data });
      created++;
    }
  }

  console.log(`Done: ${created} created, ${updated} updated, ${errors.length} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
