import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORY_LABELS, RATING_PARAMETERS, ReviewerCategory } from "@/lib/ratingParameters";
import ReportButton from "@/components/ReportButton";
import OfficialResponseForm from "@/components/OfficialResponseForm";

export const dynamic = "force-dynamic";

const paramLabel = (id: number) => RATING_PARAMETERS.find((p) => p.id === id)?.label ?? `#${id}`;
const starRow = (avg: number) => "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const inst = await prisma.institution.findUnique({ where: { slug: params.slug } });
  if (!inst) return { title: "Not found" };
  return {
    title: `${inst.name} — Employee Reviews & Ratings`,
    description: `Reviews of ${inst.name} by faculty, non-teaching staff and research scholars. Salary, management, work-life balance and more.`,
  };
}

export default async function InstitutionPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { submitted?: string };
}) {
  const inst = await prisma.institution.findUnique({ where: { slug: params.slug } });
  if (!inst) notFound();

  const reviews = await prisma.review.findMany({
    where: { institutionId: inst.id, status: "published" },
    orderBy: { createdAt: "desc" },
    include: { scores: true, response: true },
    take: 50,
  });

  const user = await getCurrentUser();
  const isRep = !!user && inst.claimedByUserId === user.id;

  const [salaries, interviews] = await Promise.all([
    prisma.salaryReport.findMany({ where: { institutionId: inst.id, status: "published" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.interviewReview.findMany({ where: { institutionId: inst.id, status: "published" }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const byCat: Record<string, Record<number, { sum: number; n: number }>> = {};
  for (const r of reviews) {
    byCat[r.category] ??= {};
    for (const s of r.scores) {
      byCat[r.category][s.parameterId] ??= { sum: 0, n: 0 };
      byCat[r.category][s.parameterId].sum += s.score;
      byCat[r.category][s.parameterId].n += 1;
    }
  }

  const monthly = salaries.filter((s) => s.currency === "INR" && s.grossMonthly != null).map((s) => Number(s.grossMonthly)).sort((a, b) => a - b);
  const medianMonthly = monthly.length ? monthly[Math.floor((monthly.length - 1) / 2)] : null;
  const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const OUTCOME_LABEL: Record<string, string> = { offer: "Offer", rejected: "Rejected", no_response: "No response", withdrew: "Withdrew" };

  const avg = inst.avgOverall != null ? Number(inst.avgOverall) : null;
  const rec = inst.recommendPct != null ? Number(inst.recommendPct) : null;

  return (
    <>
      {searchParams.submitted ? (
        <div className="notice good">
          <strong>Thanks — your submission was received.</strong> It goes live once a moderator approves it.
        </div>
      ) : null}

      <div className="masthead">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h1>{inst.name}</h1>
            <div className="loc">{[inst.city, inst.state].filter(Boolean).join(", ") || "Location not listed"}</div>
            <div className="tags">
              <span className="tag">{inst.type.replaceAll("_", " ")}</span>
              {inst.ownership ? <span className="tag">{inst.ownership.replaceAll("_", " ")}</span> : null}
              {inst.ugcRecognized ? <span className="tag">UGC recognized</span> : null}
              {inst.naacGrade ? <span className="tag">NAAC {inst.naacGrade}</span> : null}
              {inst.nirfRankOverall ? <span className="tag">NIRF #{inst.nirfRankOverall}</span> : null}
            </div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <Link className="btn" href={`/institutions/${inst.slug}/review`}>Write a review</Link>
            {inst.isClaimed ? (
              <span className="badge verified">Officially responds</span>
            ) : (
              <Link className="small muted" href={`/institutions/${inst.slug}/claim`}>Work here? Claim this profile</Link>
            )}
          </div>
        </div>
      </div>

      {avg != null && inst.reviewCount > 0 ? (
        <div className="scorecard">
          <div className="figure">
            <div className="num">{avg.toFixed(1)}</div>
            <div className="stars">{starRow(avg)}</div>
            <div className="den">out of 5</div>
          </div>
          <div>
            {rec != null ? <div className="rec"><b>{Math.round(rec)}%</b> would recommend working here</div> : null}
            <div className="meta" style={{ marginTop: 6 }}>
              Based on {inst.reviewCount} review{inst.reviewCount === 1 ? "" : "s"} from faculty, non-teaching staff and research scholars.
            </div>
          </div>
        </div>
      ) : (
        <div className="card muted">
          No reviews yet. <Link href={`/institutions/${inst.slug}/review`}>Be the first to review this employer.</Link>
        </div>
      )}

      {/* Per-category transcript */}
      {(Object.keys(byCat) as ReviewerCategory[]).map((cat) => (
        <div className="card score-block" key={cat}>
          <h3>{CATEGORY_LABELS[cat] ?? cat} — average ratings</h3>
          {Object.entries(byCat[cat]).sort((a, b) => Number(a[0]) - Number(b[0])).map(([pid, agg]) => {
            const v = agg.sum / agg.n;
            return (
              <div className="rating-row" key={pid}>
                <span className="rlabel">{paramLabel(Number(pid))}</span>
                <span className="rval">
                  <span className="meter"><span style={{ width: `${(v / 5) * 100}%` }} /></span>
                  <span className="rnum">{v.toFixed(1)}</span>
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="section-head"><h2>Reviews</h2><span className="eyebrow">{reviews.length} shown</span></div>
      {reviews.map((r) => (
        <div className="review" key={r.id}>
          <div className="rhead">
            <span className="rtitle">{r.title}</span>
            <span className="stars">{starRow(r.overallRating)}</span>
          </div>
          <div className="rmeta">
            <span>{CATEGORY_LABELS[r.category as ReviewerCategory]}</span>·
            <span>{r.designation ?? "—"}</span>·
            <span>{r.empStatus === "current" ? "Current" : "Former"}</span>·
            <span>{r.empType.replaceAll("_", " ")}</span>
            {r.badge === "employment_verified" ? <span className="badge verified">Verified employee</span> : null}
          </div>
          <div className="pc pros"><span className="k">Pros</span><span>{r.pros}</span></div>
          <div className="pc cons"><span className="k">Cons</span><span>{r.cons}</span></div>
          {r.adviceToCandidate ? <p className="advice">Advice to candidates: {r.adviceToCandidate}</p> : null}
          <div style={{ textAlign: "right", marginTop: 6 }}><ReportButton reviewId={r.id} /></div>

          {r.response && r.response.status === "published" ? (
            <div className="official">
              <div className="badge verified" style={{ marginBottom: 6 }}>Official response from {inst.name}</div>
              <div>{r.response.body}</div>
            </div>
          ) : null}
          {isRep && r.response && r.response.status === "pending" ? <p className="advice">Your response is awaiting moderation.</p> : null}
          {isRep && !r.response ? <OfficialResponseForm reviewId={r.id} /> : null}
        </div>
      ))}

      {/* Salaries */}
      <div className="section-head"><h2>Salaries</h2><Link className="small" href={`/institutions/${inst.slug}/salary`}>+ Share your salary</Link></div>
      {salaries.length === 0 ? (
        <div className="card muted small">No salary data yet. <Link href={`/institutions/${inst.slug}/salary`}>Add the first data point.</Link></div>
      ) : (
        <div className="card">
          {medianMonthly != null ? (
            <p className="stat-lead" style={{ margin: "0 0 6px" }}><b>{inr(medianMonthly)}</b> median monthly gross <span className="muted small">· {monthly.length} INR report(s)</span></p>
          ) : null}
          {salaries.slice(0, 8).map((s) => (
            <div className="datarow" key={s.id}>
              <span>{s.designation ?? "—"} <span className="muted small">· {s.category.replaceAll("_", " ")}{s.yearsExperience != null ? ` · ${s.yearsExperience}y` : ""}</span></span>
              <span className="amt">
                {s.grossMonthly != null ? (s.currency === "INR" ? `${inr(Number(s.grossMonthly))}/mo` : `${Number(s.grossMonthly).toLocaleString()} ${s.currency}/mo`) : s.annualCtc != null ? `${Number(s.annualCtc).toLocaleString()} ${s.currency}/yr` : "—"}
                {s.paidOnTime === false ? <span className="tag" style={{ marginLeft: 8, color: "var(--bad)", borderColor: "#eccac4" }}>delays</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Interviews */}
      <div className="section-head"><h2>Interview experiences</h2><Link className="small" href={`/institutions/${inst.slug}/interview`}>+ Share yours</Link></div>
      {interviews.length === 0 ? (
        <div className="card muted small">No interview experiences yet. <Link href={`/institutions/${inst.slug}/interview`}>Share the first.</Link></div>
      ) : (
        interviews.map((iv) => (
          <div className="review" key={iv.id}>
            <div className="rmeta" style={{ marginTop: 0 }}>
              <span>{iv.positionApplied ?? "—"}</span>·<span>{iv.category.replaceAll("_", " ")}</span>·
              <span>Outcome: <strong style={{ color: "var(--ink)" }}>{OUTCOME_LABEL[iv.outcome ?? ""] ?? iv.outcome ?? "—"}</strong></span>
              {iv.difficulty != null ? <span>· Difficulty {iv.difficulty}/5</span> : null}
            </div>
            {iv.processDescription ? <p style={{ margin: "6px 0 0" }}>{iv.processDescription}</p> : null}
            {iv.questionsAsked ? <p className="advice">Questions: {iv.questionsAsked}</p> : null}
          </div>
        ))
      )}
    </>
  );
}
