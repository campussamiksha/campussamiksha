import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { moderateReview, resolveReport } from "@/lib/moderation";

export const dynamic = "force-dynamic";

// Resolve a report; optionally remove the reported review in the same action.
async function handleReport(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  const reportId = String(formData.get("reportId"));
  const reviewId = formData.get("reviewId") ? String(formData.get("reviewId")) : null;
  const action = String(formData.get("action")); // "dismiss" | "remove"

  if (action === "remove" && reviewId) {
    await moderateReview(reviewId, "remove", mod.id, "Removed after report");
  }
  await resolveReport(reportId, mod.id);
  revalidatePath("/admin/reports");
}

export default async function ReportsQueue() {
  const reports = await prisma.contentReport.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Pull the reported reviews' text for context (reports may target other types too).
  const reviewIds = reports.map((r) => r.reviewId).filter((x): x is string => !!x);
  const reviews = reviewIds.length
    ? await prisma.review.findMany({
        where: { id: { in: reviewIds } },
        include: { institution: { select: { name: true } } },
      })
    : [];
  const reviewById = new Map(reviews.map((r) => [r.id, r]));

  if (reports.length === 0) {
    return <div className="card muted">No open reports.</div>;
  }

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>{reports.length} open report(s)</p>
      {reports.map((rep) => {
        const rev = rep.reviewId ? reviewById.get(rep.reviewId) : null;
        return (
          <div className="card" key={rep.id}>
            <div className="small">
              <span className="badge" style={{ background: "#fdecec", color: "var(--bad)" }}>{rep.reason}</span>{" "}
              {rep.details ? <span className="muted">— {rep.details}</span> : null}
            </div>
            {rev ? (
              <div style={{ marginTop: 8 }}>
                <strong>{rev.title}</strong>
                <div className="small muted">{rev.institution.name} · status: {rev.status}</div>
                <p className="small" style={{ margin: "6px 0" }}><em>Cons:</em> {rev.cons}</p>
              </div>
            ) : (
              <div className="small muted" style={{ marginTop: 8 }}>Target is not a review (salary/interview) — open directly.</div>
            )}

            <form action={handleReport} style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="hidden" name="reportId" value={rep.id} />
              {rep.reviewId ? <input type="hidden" name="reviewId" value={rep.reviewId} /> : null}
              <button className="btn secondary" name="action" value="dismiss" type="submit">Dismiss report</button>
              {rep.reviewId ? (
                <button className="btn" name="action" value="remove" type="submit" style={{ background: "var(--bad)" }}>Remove review</button>
              ) : null}
            </form>
          </div>
        );
      })}
    </>
  );
}
