import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  // Same generic error whether the email is unknown or the password is wrong.
  const ok = user?.passwordHash ? await verifyPassword(body.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  if (user.status === "banned") {
    return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, verified: user.isEmailVerified, role: user.role });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
