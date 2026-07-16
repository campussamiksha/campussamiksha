import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { moderateInterview } from "@/lib/moderation";

export const dynamic = "force-dynamic";

async function handle(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  await moderateInterview(String(formData.get("id")), String(formData.get("action")) as "approve" | "reject", mod.id);
  revalidatePath("/admin/interviews");
}

export default async function InterviewQueue() {
  const rows = await prisma.interviewReview.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { institution: { select: { name: true } } },
    take: 100,
  });

  if (rows.length === 0) return <div className="card muted">No pending interview experiences.</div>;

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>{rows.length} pending interview experience(s)</p>
      {rows.map((iv) => (
        <div className="card" key={iv.id}>
          <div className="small">
            <strong>{iv.institution.name}</strong> · {iv.positionApplied ?? "—"} · {iv.category.replaceAll("_", " ")} ·
            {" "}Outcome: {iv.outcome ?? "—"}{iv.difficulty != null ? ` · Difficulty ${iv.difficulty}/5` : ""}
          </div>
          {iv.processDescription ? <p style={{ margin: "6px 0" }}>{iv.processDescription}</p> : null}
          {iv.questionsAsked ? <p className="small muted" style={{ margin: "4px 0" }}>Questions: {iv.questionsAsked}</p> : null}
          <form action={handle} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="id" value={iv.id} />
            <button className="btn" name="action" value="approve" type="submit">Approve</button>
            <button className="btn secondary" name="action" value="reject" type="submit">Reject</button>
          </form>
        </div>
      ))}
    </>
  );
}
