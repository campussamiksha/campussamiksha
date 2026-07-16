import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Recompute an institution's cached headline aggregates from its PUBLISHED
 * reviews. Call after any moderation action that changes what is published.
 *
 * The per-parameter, per-category breakdown shown on the profile page is
 * computed live from `review_scores` in the page query; for scale, switch that
 * to the `institution_category_stats` materialized view (see db/schema.sql) and
 * REFRESH it here as well.
 */
export async function recomputeInstitutionStats(institutionId: string): Promise<void> {
  const published = await prisma.review.findMany({
    where: { institutionId, status: "published" },
    select: { overallRating: true, wouldRecommend: true },
  });

  const count = published.length;
  const avg =
    count === 0 ? null : published.reduce((sum, r) => sum + r.overallRating, 0) / count;

  const withOpinion = published.filter((r) => r.wouldRecommend !== null);
  const recPct =
    withOpinion.length === 0
      ? null
      : (withOpinion.filter((r) => r.wouldRecommend === true).length / withOpinion.length) * 100;

  await prisma.institution.update({
    where: { id: institutionId },
    data: {
      reviewCount: count,
      avgOverall: avg === null ? null : new Prisma.Decimal(avg.toFixed(2)),
      recommendPct: recPct === null ? null : new Prisma.Decimal(recPct.toFixed(2)),
    },
  });
}
