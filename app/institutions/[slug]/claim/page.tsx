import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ClaimForm from "@/components/ClaimForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Claim this profile" };

export default async function ClaimPage({ params }: { params: { slug: string } }) {
  const inst = await prisma.institution.findUnique({
    where: { slug: params.slug },
    select: { name: true, slug: true, isClaimed: true },
  });
  if (!inst) notFound();

  const user = await getCurrentUser();

  return (
    <>
      <div className="card">
        <h1 style={{ margin: "0 0 4px" }}>Claim {inst.name}</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          Represent this institution? Claiming lets you post one official response per review —
          a right of reply, not the ability to edit or hide honest feedback.
        </p>
      </div>

      {inst.isClaimed ? (
        <div className="card muted">This profile has already been claimed.</div>
      ) : !user ? (
        <div className="card">
          <p>Please log in with the account you want to manage this profile from.</p>
          <Link className="btn" href="/login">Log in</Link>{" "}
          <Link className="btn secondary" href="/signup">Sign up</Link>
        </div>
      ) : (
        <ClaimForm slug={inst.slug} />
      )}
    </>
  );
}
