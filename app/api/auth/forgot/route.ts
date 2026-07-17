import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { passwordResetEmail } from "@/lib/emails";
import { signToken } from "@/lib/signedToken";
import { pwCheck } from "@/lib/password";

const schema = z.object({ email: z.string().email() });

// POST /api/auth/forgot — email a reset link. Always returns ok (never reveals
// whether an account exists).
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (user?.passwordHash) {
    const token = signToken({ uid: user.id, pc: pwCheck(user.passwordHash) }, 30 * 60 * 1000);
    const origin = process.env.APP_URL || new URL(req.url).origin;
    try {
      await sendMail(passwordResetEmail(user.email, `${origin}/reset?token=${token}`));
    } catch (err) {
      console.error("password reset email failed:", err);
    }
  }
  return NextResponse.json({ ok: true });
}
