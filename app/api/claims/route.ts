import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  slug: z.string().min(1),
  officialEmail: z.string().email().max(254),
  designation: z.string().max(120).optional(),
});

// POST /api/claims — a logged-in user requests ownership of an institution page.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in to claim a profile." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const inst = await prisma.institution.findUnique({
    where: { slug: body.data.slug },
    select: { id: true, isClaimed: true },
  });
  if (!inst) return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  if (inst.isClaimed) {
    return NextResponse.json({ error: "This profile has already been claimed." }, { status: 409 });
  }

  try {
    await prisma.institutionClaim.create({
      data: {
        institutionId: inst.id,
        userId: user.id,
        officialEmail: body.data.officialEmail.toLowerCase(),
        designation: body.data.designation ?? null,
        status: "pending",
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "You already have a claim on this institution." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not submit claim" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
