import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  reason: z.enum(["defamation", "names_individual", "fake", "spam", "abuse", "other"]),
  details: z.string().max(2000).optional(),
});

// POST /api/reviews/:id/report — flag a published review for moderator attention.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in to report." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const review = await prisma.review.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.contentReport.create({
      data: {
        reviewId: review.id,
        reporterUserId: user.id,
        reason: body.data.reason,
        details: body.data.details ?? null,
      },
    }),
    prisma.review.update({
      where: { id: review.id },
      data: {
        reportCount: { increment: 1 },
        // A published review under report becomes 'flagged' for re-review.
        ...(review.status === "published" ? { status: "flagged" as const } : {}),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
