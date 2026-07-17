import Link from "next/link";
import type { Metadata } from "next";
import { getComparison } from "@/lib/compare";
import { RATING_PARAMETERS } from "@/lib/ratingParameters";
import CompareBar from "@/components/CompareBar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare institutions" };

const SHARED = RATING_PARAMETERS.filter((p) => p.applicableCategories.length === 3).sort((a, b) => a.displayOrder - b.displayOrder);
const starRow = (avg: number) => "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default async function ComparePage({ searchParams }: { searchParams: { i?: string | string[] } }) {
  const raw = searchParams.i;
  const slugs = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cols = await getComparison(slugs);
  const selected = cols.map((c) => ({ slug: c.inst.slug, name: c.inst.name }));

  return (
    <>
      <div className="section-head" style={{ marginTop: 4 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>Compare institutions</h1>
        <span className="eyebrow">up to 4</span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>Put institutions side by side — ratings, salary, NIRF rank and more.</p>

      <CompareBar selected={selected} />

      {cols.length < 2 ? (
        <div className="card muted">Add at least two institutions above to see them side by side.</div>
      ) : (
        <div className="cmp-wrap">
          <table className="cmp">
            <thead>
              <tr>
                <th></th>
                {cols.map((c) => (
                  <th key={c.inst.id}>
                    <Link href={`/institutions/${c.inst.slug}`}>{c.inst.name}</Link>
                    <div className="muted small" style={{ fontWeight: 400 }}>{[c.inst.city, c.inst.state].filter(Boolean).join(", ") || "—"}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Overall rating</th>
                {cols.map((c) => {
                  const a = c.inst.avgOverall != null ? Number(c.inst.avgOverall) : null;
                  return <td key={c.inst.id}>{a != null && c.reviewCount > 0 ? <><span className="stars">{starRow(a)}</span> <b>{a.toFixed(1)}</b></> : <span className="muted">Not yet reviewed</span>}</td>;
                })}
              </tr>
              <tr>
                <th>Would recommend</th>
                {cols.map((c) => <td key={c.inst.id}>{c.inst.recommendPct != null && c.reviewCount > 0 ? <b>{Math.round(Number(c.inst.recommendPct))}%</b> : "—"}</td>)}
              </tr>
              <tr>
                <th>Reviews</th>
                {cols.map((c) => <td key={c.inst.id}>{c.reviewCount || "—"}</td>)}
              </tr>
              <tr>
                <th>Median salary (₹/mo)</th>
                {cols.map((c) => <td key={c.inst.id} className="mono">{c.medianSalary != null ? inr(c.medianSalary) : "—"}</td>)}
              </tr>
              <tr>
                <th>NIRF rank</th>
                {cols.map((c) => <td key={c.inst.id}>{c.inst.nirfRankOverall ? `#${c.inst.nirfRankOverall}` : "—"}</td>)}
              </tr>
              <tr>
                <th>Type</th>
                {cols.map((c) => <td key={c.inst.id} className="small">{c.inst.type.replaceAll("_", " ")}</td>)}
              </tr>
              <tr>
                <th>UGC recognized</th>
                {cols.map((c) => <td key={c.inst.id}>{c.inst.ugcRecognized ? "Yes" : "—"}</td>)}
              </tr>

              <tr className="cmp-sec"><th colSpan={cols.length + 1}>Ratings by parameter</th></tr>
              {SHARED.map((p) => (
                <tr key={p.id}>
                  <th>{p.label}</th>
                  {cols.map((c) => {
                    const v = c.paramAvgs[p.id];
                    return <td key={c.inst.id}>{v != null ? <b>{v.toFixed(1)}</b> : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
