import { prisma } from "./prisma";

// Shape returned to the home page / search API. avgOverall comes back as a
// Prisma Decimal (or null); callers Number() it.
export interface InstitutionRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  type: string;
  ownership: string | null;
  ugcRecognized: boolean | null;
  avgOverall: unknown;
  reviewCount: number;
}

const COLS = `id, name, slug, city, state, type, ownership,
  ugc_recognized AS "ugcRecognized", avg_overall AS "avgOverall", review_count AS "reviewCount"`;

/**
 * Institution search. Crucially also matches the `aka` acronyms/alternate names
 * (e.g. "IIT", "IITB") — searching only name/city would miss the most common way
 * people look these up. ILIKE is case-insensitive; params are bound, not
 * interpolated, so this is injection-safe.
 */
export async function searchInstitutions(q: string, take = 25): Promise<InstitutionRow[]> {
  const trimmed = q.trim();
  if (!trimmed) {
    return prisma.$queryRawUnsafe<InstitutionRow[]>(
      `SELECT ${COLS} FROM institutions ORDER BY review_count DESC, name ASC LIMIT $1`,
      take,
    );
  }
  const like = `%${trimmed}%`;
  return prisma.$queryRawUnsafe<InstitutionRow[]>(
    `SELECT ${COLS} FROM institutions
     WHERE name ILIKE $1 OR city ILIKE $1 OR state ILIKE $1 OR array_to_string(aka, ' ') ILIKE $1
     ORDER BY review_count DESC, name ASC LIMIT $2`,
    like,
    take,
  );
}
