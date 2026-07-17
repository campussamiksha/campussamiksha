import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchInstitutions, listStates } from "@/lib/search";

export const dynamic = "force-dynamic";

function starRow(avg: number): string {
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
const nf = (n: number) => n.toLocaleString("en-IN");

const TYPES: [string, string][] = [
  ["central_university", "Central University"],
  ["state_university", "State University"],
  ["deemed_university", "Deemed University"],
  ["private_university", "Private University"],
  ["institute_of_national_importance", "Institute of National Importance"],
  ["autonomous_college", "Autonomous College"],
  ["affiliated_college", "Affiliated College"],
  ["research_institute", "Research Institute"],
  ["other", "Other"],
];
const SORTS: [string, string][] = [
  ["reviews", "Most reviewed"],
  ["rating", "Highest rated"],
  ["name", "A–Z"],
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; state?: string; type?: string; sort?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const state = searchParams.state ?? "";
  const type = searchParams.type ?? "";
  const sort = (searchParams.sort as "reviews" | "rating" | "name") || "reviews";
  const filtered = !!(q || state || type);

  const [institutions, states, instCount, reviewCount, stateRows] = await Promise.all([
    searchInstitutions({ q, state, type, sort, take: 25 }),
    listStates(),
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
          {state ? <input type="hidden" name="state" value={state} /> : null}
          {type ? <input type="hidden" name="type" value={type} /> : null}
          <button className="btn" type="submit">Search</button>
        </form>
        <div className="hero-stats">
          <div><div className="n">{nf(instCount)}</div><div className="l">institutions listed</div></div>
          <div><div className="n">{stateCount}</div><div className="l">states &amp; UTs</div></div>
          <div><div className="n">{nf(reviewCount)}</div><div className="l">published reviews</div></div>
        </div>
      </section>

      {/* Filters */}
      <form className="filterbar" action="/" method="get">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        <select name="state" defaultValue={state} aria-label="State">
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="type" defaultValue={type} aria-label="Type">
          <option value="">All types</option>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort by">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn secondary" type="submit">Apply</button>
        {filtered ? <Link className="small muted" href="/" style={{ alignSelf: "center" }}>Clear</Link> : null}
      </form>

      <div className="section-head">
        <h2>{q ? `Results for “${q}”` : filtered ? "Filtered institutions" : "Browse institutions"}</h2>
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
        <div className="card muted">No institutions match your search. Try clearing filters or a different term.</div>
      )}
    </>
  );
}
