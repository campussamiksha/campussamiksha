import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/verify?token=... — marks the email verified and upgrades badge.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        isEmailVerified: true,
        // Only raise the badge if the user hasn't already reached a higher tier.
        maxBadge: "email_verified",
      },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return NextResponse.redirect(new URL("/?verified=1", req.url), { status: 303 });
}
