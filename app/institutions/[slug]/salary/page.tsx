import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ResendVerification from "@/components/ResendVerification";
import SalaryForm from "@/components/SalaryForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share your salary" };

export default async function SalaryPage({ params }: { params: { slug: string } }) {
  const inst = await prisma.institution.findUnique({
    where: { slug: params.slug },
    select: { name: true, slug: true },
  });
  if (!inst) notFound();

  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Log in to share a salary for {inst.name}</h1>
        <Link className="btn" href="/login">Log in</Link>{" "}
        <Link className="btn secondary" href="/signup">Sign up</Link>
      </div>
    );
  }
  if (!user.isEmailVerified) {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Verify your email first</h1>
        <p className="muted">Please verify your email before contributing salary data.</p>
        <ResendVerification />
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h1 style={{ margin: "0 0 4px" }}>Share your salary at {inst.name}</h1>
        <p className="muted small" style={{ marginTop: 0 }}>Anonymous and aggregated — never linked to you.</p>
      </div>
      <SalaryForm slug={inst.slug} />
    </>
  );
}
