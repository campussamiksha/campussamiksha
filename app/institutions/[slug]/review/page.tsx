import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ResendVerification from "@/components/ResendVerification";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Write a review" };

export default async function NewReviewPage({ params }: { params: { slug: string } }) {
  const inst = await prisma.institution.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true },
  });
  if (!inst) notFound();

  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Log in to review {inst.name}</h1>
        <p className="muted">You need a verified account to post a review.</p>
        <Link className="btn" href="/login">Log in</Link>{" "}
        <Link className="btn secondary" href="/signup">Sign up</Link>
      </div>
    );
  }
  if (!user.isEmailVerified) {
    return (
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Verify your email first</h1>
        <p className="muted">
          Please verify your email address before posting. Check your inbox for the verification
          link (in development it is printed to the server console).
        </p>
        <ResendVerification />
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h1 style={{ margin: "0 0 4px" }}>Review {inst.name}</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          Your identity is never shown or shared with the institution. Please keep it honest,
          first-hand, and <strong>do not name individuals</strong> — describe roles instead
          (e.g. “the HoD”, “the accounts office”).
        </p>
      </div>
      <ReviewForm slug={inst.slug} />
    </>
  );
}
