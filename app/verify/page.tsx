import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import VerificationUploadForm from "@/components/VerificationUploadForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get verified" };

export default async function VerifyPage({ searchParams }: { searchParams: { institution?: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Get a verified badge</h1>
        <p className="muted">Log in to prove your employment and earn a “Verified employee” badge.</p>
        <Link className="btn" href="/login">Log in</Link>{" "}
        <Link className="btn secondary" href="/signup">Sign up</Link>
      </div>
    );
  }

  if (user.maxBadge === "employment_verified") {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>You’re verified ✓</h1>
        <p className="muted">Your reviews carry the “Verified employee” badge. Nothing more to do.</p>
      </div>
    );
  }

  const institutions = await prisma.institution.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });

  const pending = await prisma.verificationDocument.count({
    where: { userId: user.id, status: "pending" },
  });

  return (
    <>
      <div className="card">
        <h1 style={{ margin: "0 0 4px" }}>Get a verified badge</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          Upload one document proving you work (or worked) at an institution. We verify it, delete it,
          and add a <strong>“Verified employee”</strong> badge to your reviews — a strong trust signal
          for readers. We never store the document.
        </p>
      </div>
      {pending > 0 ? (
        <div className="card muted small">You have {pending} document(s) awaiting review.</div>
      ) : null}
      <VerificationUploadForm
        institutions={institutions}
        preselect={searchParams.institution}
      />
    </>
  );
}
