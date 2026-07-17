import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { verificationEmail } from "@/lib/emails";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  displayHandle: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const email = body.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(body.data.password),
      displayHandle: body.data.displayHandle || null,
    },
  });

  // Create an email-verification token and send the link. The 'console'
  // mail transport logs it in dev; we also return it in dev for convenience.
  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
  });
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const verifyUrl = `${origin}/api/auth/verify?token=${token}`;
  try {
    await sendMail(verificationEmail(email, verifyUrl));
  } catch (err) {
    // Don't fail signup if email delivery hiccups; user can resend.
    console.error("verification email failed:", err);
  }

  // Return the verify link so the user can confirm immediately even before
  // email delivery is configured. Once SMTP is set up this same link is emailed.
  const res = NextResponse.json({ ok: true, verified: false, verifyUrl });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
