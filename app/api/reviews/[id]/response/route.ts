import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({ body: z.string().min(20).max(4000) });

// POST /api/reviews/:id/response — the institution's rep posts ONE official
// reply to a review. Guarded: caller must own (have claimed) that institution.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Response must be at least 20 characters." }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { id: true, institutionId: true, institution: { select: { claimedByUserId: true } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  if (review.institution.claimedByUserId !== user.id) {
    return NextResponse.json(
      { error: "Only the verified representative of this institution can respond." },
      { status: 403 },
    );
  }

  try {
    await prisma.reviewResponse.create({
      data: {
        reviewId: review.id,
        institutionId: review.institutionId,
        responderUserId: user.id,
        body: parsed.data.body,
        status: "pending", // moderated before it goes public
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "This review already has an official response." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save response" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
