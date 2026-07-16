import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    pending, flagged, openReports, published, pendingClaims,
    pendingResponses, pendingVerifications, pendingSalaries, pendingInterviews,
  ] = await Promise.all([
    prisma.review.count({ where: { status: "pending" } }),
    prisma.review.count({ where: { status: "flagged" } }),
    prisma.contentReport.count({ where: { resolved: false } }),
    prisma.review.count({ where: { status: "published" } }),
    prisma.institutionClaim.count({ where: { status: "pending" } }),
    prisma.reviewResponse.count({ where: { status: "pending" } }),
    prisma.verificationDocument.count({ where: { status: "pending" } }),
    prisma.salaryReport.count({ where: { status: "pending" } }),
    prisma.interviewReview.count({ where: { status: "pending" } }),
  ]);

  const Stat = ({ n, label, href }: { n: number; label: string; href: string }) => (
    <Link href={href} className="card" style={{ flex: 1, textAlign: "center", color: "inherit" }}>
      <div style={{ fontSize: 30, fontWeight: 800 }}>{n}</div>
      <div className="small muted">{label}</div>
    </Link>
  );

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Stat n={pending} label="Pending review" href="/admin/reviews" />
      <Stat n={flagged} label="Flagged" href="/admin/reviews" />
      <Stat n={openReports} label="Open reports" href="/admin/reports" />
      <Stat n={pendingClaims} label="Pending claims" href="/admin/claims" />
      <Stat n={pendingResponses} label="Pending responses" href="/admin/responses" />
      <Stat n={pendingVerifications} label="Pending verifications" href="/admin/verification" />
      <Stat n={pendingSalaries} label="Pending salaries" href="/admin/salaries" />
      <Stat n={pendingInterviews} label="Pending interviews" href="/admin/interviews" />
      <Stat n={published} label="Published" href="/admin/reviews" />
    </div>
  );
}
