import { prisma } from "./prisma";

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
  nirfRankOverall: number | null;
}

export interface SearchOpts {
  q?: string;
  state?: string;
  type?: string;
  sort?: "reviews" | "rating" | "name" | "nirf";
  take?: number;
}

const COLS = `id, name, slug, city, state, type, ownership,
  ugc_recognized AS "ugcRecognized", avg_overall AS "avgOverall", review_count AS "reviewCount",
  nirf_rank_overall AS "nirfRankOverall"`;

/**
 * Institution search with optional filters. Matches name/city/state/aka
 * (acronyms) for the query, filters by state and type, and sorts by review
 * volume, rating, or name. Params are bound, so this is injection-safe.
 */
export async function searchInstitutions(opts: SearchOpts = {}): Promise<InstitutionRow[]> {
  const { q = "", state = "", type = "", sort = "reviews", take = 25 } = opts;
  const where: string[] = [];
  const params: unknown[] = [];

  const trimmed = q.trim();
  if (trimmed) {
    params.push(`%${trimmed}%`);
    const i = params.length;
    where.push(`(name ILIKE $${i} OR city ILIKE $${i} OR state ILIKE $${i} OR array_to_string(aka, ' ') ILIKE $${i})`);
  }
  if (state) { params.push(state); where.push(`state = $${params.length}`); }
  if (type) { params.push(type); where.push(`type::text = $${params.length}`); }

  const order =
    sort === "rating" ? "avg_overall DESC NULLS LAST, review_count DESC, name ASC"
      : sort === "name" ? "name ASC"
      : sort === "nirf" ? "nirf_rank_overall ASC NULLS LAST, review_count DESC, name ASC"
      : "review_count DESC, avg_overall DESC NULLS LAST, name ASC";

  params.push(take);
  const sql =
    `SELECT ${COLS} FROM institutions` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY ${order} LIMIT $${params.length}`;

  return prisma.$queryRawUnsafe<InstitutionRow[]>(sql, ...params);
}

/** Distinct non-null states, for the location filter. */
export async function listStates(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ state: string }[]>(
    `SELECT DISTINCT state FROM institutions WHERE state IS NOT NULL AND state <> '' ORDER BY state`,
  );
  return rows.map((r) => r.state);
}
