import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { moderateResponse } from "@/lib/moderation";

export const dynamic = "force-dynamic";

async function handleResponse(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const action = String(formData.get("action")) as "approve" | "reject";
  await moderateResponse(id, action, mod.id);
  revalidatePath("/admin/responses");
}

export default async function ResponsesQueue() {
  const responses = await prisma.reviewResponse.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { review: { select: { title: true, cons: true, institution: { select: { name: true } } } } },
    take: 100,
  });

  if (responses.length === 0) return <div className="card muted">No pending official responses.</div>;

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>{responses.length} pending response(s)</p>
      {responses.map((r) => (
        <div className="card" key={r.id}>
          <div className="small muted">{r.review.institution.name} — in reply to “{r.review.title}”</div>
          <p className="small" style={{ margin: "4px 0", color: "var(--muted)" }}><em>Review cons:</em> {r.review.cons}</p>
          <p style={{ margin: "8px 0", borderLeft: "3px solid var(--brand)", paddingLeft: 10 }}>{r.body}</p>
          <form action={handleResponse} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="id" value={r.id} />
            <button className="btn" name="action" value="approve" type="submit">Approve</button>
            <button className="btn secondary" name="action" value="reject" type="submit">Reject</button>
          </form>
        </div>
      ))}
    </>
  );
}
