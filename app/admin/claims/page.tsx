import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { approveClaim, rejectClaim } from "@/lib/claims";

export const dynamic = "force-dynamic";

async function handleClaim(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  if (action === "approve") await approveClaim(id, mod.id);
  else await rejectClaim(id, mod.id);
  revalidatePath("/admin/claims");
}

export default async function ClaimsQueue() {
  const claims = await prisma.institutionClaim.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { institution: { select: { name: true } }, user: { select: { email: true } } },
    take: 100,
  });

  if (claims.length === 0) return <div className="card muted">No pending claims.</div>;

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>{claims.length} pending claim(s)</p>
      {claims.map((c) => (
        <div className="card" key={c.id}>
          <strong>{c.institution.name}</strong>
          <div className="small muted" style={{ margin: "4px 0 8px" }}>
            Requested by {c.user.email} · official email: {c.officialEmail}
            {c.designation ? ` · ${c.designation}` : ""}
          </div>
          <form action={handleClaim} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn" name="action" value="approve" type="submit">Approve</button>
            <button className="btn secondary" name="action" value="reject" type="submit">Reject</button>
          </form>
        </div>
      ))}
    </>
  );
}
