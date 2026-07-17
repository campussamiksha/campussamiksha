import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/signedToken";

// GET /api/verification/email/confirm?token=... — clicked from the institutional
// inbox. Grants the Verified-employee badge to the requesting user and upgrades
// their reviews for that institution. The token embeds the user id, so it grants
// only to the person who requested it.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const p = verifyToken(token) as { uid?: string; iid?: string; email?: string } | null;
  if (!p?.uid || !p?.iid) {
    return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: p.uid }, data: { maxBadge: "employment_verified" } }),
    prisma.review.updateMany({
      where: { userId: p.uid, institutionId: p.iid },
      data: { badge: "employment_verified" },
    }),
    prisma.moderationLog.create({
      data: { actorUserId: p.uid, action: "institutional_email_verified", targetType: "user", targetId: p.uid, note: p.email ?? null },
    }),
  ]);

  return NextResponse.redirect(new URL("/verify?verified=1", req.url), { status: 303 });
}
