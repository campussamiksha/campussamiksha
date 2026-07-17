import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { verificationEmail } from "@/lib/emails";

// POST /api/auth/resend-verification — re-issue and re-send the verify link.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (user.isEmailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  // Replace any outstanding tokens with a fresh one.
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
  });

  const origin = process.env.APP_URL || new URL(req.url).origin;
  const verifyUrl = `${origin}/api/auth/verify?token=${token}`;
  try {
    await sendMail(verificationEmail(user.email, verifyUrl));
  } catch (err) {
    console.error("verification email failed:", err);
    return NextResponse.json({ error: "Could not send email. Try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, verifyUrl });
}
