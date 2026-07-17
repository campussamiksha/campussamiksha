import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import VerificationUploadForm from "@/components/VerificationUploadForm";
import InstitutionalEmailVerify from "@/components/InstitutionalEmailVerify";

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
          A <strong>“Verified employee”</strong> badge tells readers your review is from someone who
          genuinely worked there. Choose the fastest way that fits you.
        </p>
      </div>

      <div className="section-head"><h3 style={{ margin: 0 }}>Fastest — verify with your institutional email</h3><span className="eyebrow">instant</span></div>
      <p className="muted small" style={{ margin: "0 2px 8px" }}>
        Have an <code>@…ac.in</code> / <code>.edu</code> address? Confirm it and get your badge
        instantly — no document, no waiting.
      </p>
      <InstitutionalEmailVerify institutions={institutions} preselect={searchParams.institution} />

      <div className="section-head"><h3 style={{ margin: 0 }}>Or — upload a document</h3></div>
      <p className="muted small" style={{ margin: "0 2px 8px" }}>
        No institutional email (e.g. former, contract or non-teaching staff)? Upload one proof
        instead. We check it, then <strong>delete it</strong> — we never store the document.
      </p>
      {pending > 0 ? (
        <div className="card muted small">You have {pending} document(s) awaiting review.</div>
      ) : null}
      <VerificationUploadForm institutions={institutions} preselect={searchParams.institution} />
    </>
  );
}
