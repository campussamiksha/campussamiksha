import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { institutionalVerifyEmail } from "@/lib/emails";
import { isAcademicEmail, isDisposableEmail } from "@/lib/emailDomains";
import { signToken } from "@/lib/signedToken";

const schema = z.object({ slug: z.string().min(1), email: z.string().email().max(254) });

// POST /api/verification/email/start — email a badge-verification link to the
// user's institutional address. The link (below) grants the badge when clicked.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const email = body.data.email.toLowerCase();

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use your institutional email address." }, { status: 400 });
  }
  if (!isAcademicEmail(email)) {
    return NextResponse.json(
      { error: "That doesn't look like an institutional email (e.g. name@iitb.ac.in). Use document upload instead." },
      { status: 400 },
    );
  }

  const inst = await prisma.institution.findUnique({ where: { slug: body.data.slug }, select: { id: true, name: true } });
  if (!inst) return NextResponse.json({ error: "Institution not found" }, { status: 404 });

  const token = signToken({ uid: user.id, iid: inst.id, email }, 30 * 60 * 1000);
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const link = `${origin}/api/verification/email/confirm?token=${token}`;

  try {
    await sendMail(institutionalVerifyEmail(email, link, inst.name));
  } catch (err) {
    console.error("institutional verify email failed:", err);
    return NextResponse.json({ error: "Could not send email. Try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
