import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { moderateReview, ReviewAction } from "@/lib/moderation";
import { CATEGORY_LABELS, RATING_PARAMETERS, ReviewerCategory } from "@/lib/ratingParameters";

export const dynamic = "force-dynamic";

const paramLabel = (id: number) => RATING_PARAMETERS.find((p) => p.id === id)?.label ?? `#${id}`;

// Server action: apply a moderation decision (guarded again server-side).
async function moderate(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const action = String(formData.get("action")) as ReviewAction;
  const note = (formData.get("note") as string) || undefined;
  await moderateReview(id, action, mod.id, note);
  revalidatePath("/admin/reviews");
}

export default async function ReviewQueue() {
  const reviews = await prisma.review.findMany({
    where: { status: { in: ["pending", "flagged"] } },
    orderBy: { createdAt: "asc" },
    include: { institution: { select: { name: true } }, scores: true },
    take: 100,
  });

  if (reviews.length === 0) {
    return <div className="card muted">Queue is clear — no pending or flagged reviews. 🎉</div>;
  }

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>{reviews.length} item(s) in queue</p>
      {reviews.map((r) => (
        <div className="card" key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <strong>{r.title}</strong>
              <div className="small muted">
                {r.institution.name} · {CATEGORY_LABELS[r.category as ReviewerCategory]} ·{" "}
                {r.designation ?? "—"} · {r.empStatus} · Overall {r.overallRating}★
                {r.status === "flagged" ? <span className="badge" style={{ marginLeft: 8, background: "#fdecec", color: "var(--bad)" }}>flagged · {r.reportCount} report(s)</span> : null}
              </div>
            </div>
          </div>

          <p style={{ margin: "8px 0 4px" }}><strong className="small" style={{ color: "var(--good)" }}>Pros:</strong> {r.pros}</p>
          <p style={{ margin: "4px 0" }}><strong className="small" style={{ color: "var(--bad)" }}>Cons:</strong> {r.cons}</p>
          {r.adviceToMgmt ? <p className="small muted" style={{ margin: "4px 0" }}>To management: {r.adviceToMgmt}</p> : null}
          {r.adviceToCandidate ? <p className="small muted" style={{ margin: "4px 0" }}>To candidates: {r.adviceToCandidate}</p> : null}

          <div className="small muted" style={{ margin: "6px 0" }}>
            {r.scores.map((s) => `${paramLabel(s.parameterId)}: ${s.score}★`).join("  ·  ")}
          </div>

          <form action={moderate} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <input type="hidden" name="id" value={r.id} />
            <input name="note" placeholder="Reason (optional)" style={{ flex: 1, minWidth: 180 }} />
            <button className="btn" name="action" value="approve" type="submit">Approve</button>
            <button className="btn secondary" name="action" value="reject" type="submit">Reject</button>
            {r.status === "flagged" ? (
              <button className="btn secondary" name="action" value="remove" type="submit" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>Remove</button>
            ) : null}
          </form>
        </div>
      ))}
    </>
  );
}
