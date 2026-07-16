import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { moderateSalary } from "@/lib/moderation";

export const dynamic = "force-dynamic";

async function handle(formData: FormData) {
  "use server";
  const mod = await requireModerator();
  if (!mod) throw new Error("Forbidden");
  await moderateSalary(String(formData.get("id")), String(formData.get("action")) as "approve" | "reject", mod.id);
  revalidatePath("/admin/salaries");
}

export default async function SalaryQueue() {
  const rows = await prisma.salaryReport.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { institution: { select: { name: true } } },
    take: 100,
  });

  if (rows.length === 0) return <div className="card muted">No pending salary reports.</div>;

  return (
    <>
      <p className="small muted" style={{ margin: "4px 2px 10px" }}>{rows.length} pending salary report(s)</p>
      {rows.map((s) => (
        <div className="card" key={s.id}>
          <div className="small">
            <strong>{s.institution.name}</strong> · {s.designation ?? "—"} · {s.category.replaceAll("_", " ")} · {s.empType.replaceAll("_", " ")}
            {s.yearsExperience != null ? ` · ${s.yearsExperience}y` : ""}
          </div>
          <div className="small muted" style={{ margin: "4px 0 8px" }}>
            {s.grossMonthly != null ? `${Number(s.grossMonthly).toLocaleString()} ${s.currency}/mo` : ""}
            {s.annualCtc != null ? `  ${Number(s.annualCtc).toLocaleString()} ${s.currency}/yr` : ""}
            {s.payScale ? ` · ${s.payScale}` : ""}
            {s.paidOnTime === false ? " · reported delays" : s.paidOnTime === true ? " · on time" : ""}
          </div>
          <form action={handle} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="id" value={s.id} />
            <button className="btn" name="action" value="approve" type="submit">Approve</button>
            <button className="btn secondary" name="action" value="reject" type="submit">Reject</button>
          </form>
        </div>
      ))}
    </>
  );
}
