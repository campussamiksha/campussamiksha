import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchInstitutions } from "@/lib/search";

export const dynamic = "force-dynamic";

function starRow(avg: number): string {
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

const nf = (n: number) => n.toLocaleString("en-IN");

export default async function HomePage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();

  const [institutions, instCount, reviewCount, stateRows] = await Promise.all([
    searchInstitutions(q, 25),
    prisma.institution.count(),
    prisma.review.count({ where: { status: "published" } }),
    prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(DISTINCT state) c FROM institutions WHERE state IS NOT NULL`),
  ]);
  const stateCount = Number(stateRows[0]?.c ?? 0);

  return (
    <>
      <section className="hero">
        <span className="eyebrow">Reviews by faculty · staff · scholars</span>
        <h1>Know your <em>employer</em> before you join.</h1>
        <p>
          Honest, anonymous reviews of India&rsquo;s universities, colleges and research institutes —
          pay, workload, management and research freedom, from the people who actually worked there.
        </p>
        <form className="search" action="/" method="get">
          <input name="q" defaultValue={q} placeholder="Search by name, city or state — try “IIT” or “Kerala”" aria-label="Search institutions" />
          <button className="btn" type="submit">Search</button>
        </form>
        <div className="hero-stats">
          <div><div className="n">{nf(instCount)}</div><div className="l">institutions listed</div></div>
          <div><div className="n">{stateCount}</div><div className="l">states &amp; UTs</div></div>
          <div><div className="n">{nf(reviewCount)}</div><div className="l">published reviews</div></div>
        </div>
      </section>

      <div className="section-head">
        <h2>{q ? `Results for “${q}”` : "Browse institutions"}</h2>
        <span className="eyebrow">{institutions.length} shown</span>
      </div>

      {institutions.map((inst) => {
        const avg = inst.avgOverall != null ? Number(inst.avgOverall) : null;
        return (
          <Link key={inst.id} href={`/institutions/${inst.slug}`} className="inst-card">
            <div>
              <div className="name">{inst.name}</div>
              <div className="loc">{[inst.city, inst.state].filter(Boolean).join(", ") || "Location not listed"}</div>
              <div className="tags">
                <span className="tag">{inst.type.replaceAll("_", " ")}</span>
                {inst.ugcRecognized ? <span className="tag">UGC</span> : null}
              </div>
            </div>
            <div className="inst-rating">
              {avg != null && inst.reviewCount > 0 ? (
                <>
                  <div className="stars">{starRow(avg)}</div>
                  <div className="avg">{avg.toFixed(1)}</div>
                  <div className="count">{inst.reviewCount} review{inst.reviewCount === 1 ? "" : "s"}</div>
                </>
              ) : (
                <div className="none">Not yet reviewed</div>
              )}
            </div>
          </Link>
        );
      })}

      {institutions.length === 0 && (
        <div className="card muted">No institutions match &ldquo;{q}&rdquo;. Try a name, city, or state.</div>
      )}
    </>
  );
}
