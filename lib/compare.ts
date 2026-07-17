import { prisma } from "./prisma";
import type { Institution } from "@prisma/client";

export interface CompareCol {
  inst: Institution;
  paramAvgs: Record<number, number>;
  reviewCount: number;
  medianSalary: number | null;
}

/** Resolve up to 4 institutions (in the given slug order) with their aggregated
 *  per-parameter ratings and median INR monthly salary. */
export async function getComparison(slugs: string[]): Promise<CompareCol[]> {
  const wanted = slugs.slice(0, 4);
  if (wanted.length === 0) return [];

  const insts = await prisma.institution.findMany({ where: { slug: { in: wanted } } });
  const ordered = wanted.map((s) => insts.find((i) => i.slug === s)).filter((i): i is Institution => !!i);
  const ids = ordered.map((i) => i.id);
  if (ids.length === 0) return [];

  const [reviews, salaries] = await Promise.all([
    prisma.review.findMany({ where: { institutionId: { in: ids }, status: "published" }, include: { scores: true } }),
    prisma.salaryReport.findMany({
      where: { institutionId: { in: ids }, status: "published", currency: "INR", grossMonthly: { not: null } },
      select: { institutionId: true, grossMonthly: true },
    }),
  ]);

  return ordered.map((inst) => {
    const rvs = reviews.filter((r) => r.institutionId === inst.id);
    const agg: Record<number, { sum: number; n: number }> = {};
    for (const r of rvs) {
      for (const s of r.scores) {
        agg[s.parameterId] ??= { sum: 0, n: 0 };
        agg[s.parameterId].sum += s.score;
        agg[s.parameterId].n += 1;
      }
    }
    const paramAvgs: Record<number, number> = {};
    for (const [pid, a] of Object.entries(agg)) paramAvgs[Number(pid)] = a.sum / a.n;

    const monthly = salaries
      .filter((s) => s.institutionId === inst.id)
      .map((s) => Number(s.grossMonthly))
      .sort((a, b) => a - b);
    const medianSalary = monthly.length ? monthly[Math.floor((monthly.length - 1) / 2)] : null;

    return { inst, paramAvgs, reviewCount: rvs.length, medianSalary };
  });
}
