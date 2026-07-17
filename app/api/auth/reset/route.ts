import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, pwCheck } from "@/lib/password";
import { verifyToken } from "@/lib/signedToken";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8).max(200) });

// POST /api/auth/reset — set a new password from a valid, unused reset link.
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const p = verifyToken(body.data.token) as { uid?: string; pc?: string } | null;
  if (!p?.uid || !p?.pc) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: p.uid } });
  // pwCheck mismatch ⇒ the link was already used (password changed since).
  if (!user?.passwordHash || pwCheck(user.passwordHash) !== p.pc) {
    return NextResponse.json({ error: "This reset link is invalid or has already been used." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.data.password) } });
  return NextResponse.json({ ok: true });
}
