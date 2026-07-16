import Link from "next/link";
import { requireModerator } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const mod = await requireModerator();
  if (!mod) {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Moderator access required</h1>
        <p className="muted">You must be signed in as a moderator or admin to view this area.</p>
        <Link className="btn" href="/login">Log in</Link>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <strong>Moderation</strong>
        <nav className="small" style={{ display: "flex", gap: 14 }}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/reviews">Review queue</Link>
          <Link href="/admin/reports">Reports</Link>
          <Link href="/admin/claims">Claims</Link>
          <Link href="/admin/responses">Responses</Link>
          <Link href="/admin/verification">Verification</Link>
          <Link href="/admin/salaries">Salaries</Link>
          <Link href="/admin/interviews">Interviews</Link>
        </nav>
        <span className="small muted" style={{ marginLeft: "auto" }}>
          {mod.email} · {mod.role}
        </span>
      </div>
      {children}
    </>
  );
}
