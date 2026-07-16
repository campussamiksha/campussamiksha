import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { approveVerification, rejectVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

const DOC_LABEL: Record<string, string> = {
  appointment_letter: "Appointment letter",
  payslip: "Salary slip",
  id_card: "Employee ID card",
  institutional_email: "Institutional email",
};

async function handleVerification(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  if (action === "approve") await approveVerification(id, mod.id);
  else await rejectVerification(id, mod.id);
  revalidatePath("/admin/verification");
}

export default async function VerificationQueue() {
  // Names fetched separately — VerificationDocument has scalar refs, no relations.
  const docs = await prisma.verificationDocument.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const userIds = Array.from(new Set(docs.map((d) => d.userId)));
  const instIds = Array.from(new Set(docs.map((d) => d.institutionId).filter((x): x is string => !!x)));
  const [users, insts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }),
    prisma.institution.findMany({ where: { id: { in: instIds } }, select: { id: true, name: true } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u.email]));
  const instById = new Map(insts.map((i) => [i.id, i.name]));

  if (docs.length === 0) return <div className="card muted">No pending verification requests.</div>;

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>
        {docs.length} pending. Open the proof, confirm the affiliation, then decide — the file is
        deleted either way.
      </p>
      {docs.map((d) => (
        <div className="card" key={d.id}>
          <div className="small">
            <strong>{userById.get(d.userId) ?? "unknown user"}</strong>
            {" · "}{DOC_LABEL[d.docType] ?? d.docType}
            {d.institutionId ? ` · ${instById.get(d.institutionId) ?? "—"}` : " · (no institution given)"}
          </div>
          <div style={{ margin: "8px 0" }}>
            <a className="btn secondary" href={`/api/verification/${d.id}/file`} target="_blank" rel="noreferrer">
              View proof ↗
            </a>
          </div>
          <form action={handleVerification} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="id" value={d.id} />
            <button className="btn" name="action" value="approve" type="submit">Approve &amp; grant badge</button>
            <button className="btn secondary" name="action" value="reject" type="submit">Reject</button>
          </form>
        </div>
      ))}
    </>
  );
}
