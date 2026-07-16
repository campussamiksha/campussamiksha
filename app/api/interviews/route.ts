import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  slug: z.string().min(1),
  category: z.enum(["teaching_faculty", "non_teaching_staff", "research_scholar"]),
  positionApplied: z.string().max(120).optional(),
  department: z.string().max(120).optional(),
  outcome: z.enum(["offer", "rejected", "no_response", "withdrew"]),
  offerAccepted: z.boolean().nullish(),
  difficulty: z.number().int().min(1).max(5).nullish(),
  processDescription: z.string().max(4000).optional(),
  questionsAsked: z.string().max(4000).optional(),
});

// Reuse the review guardrail: block phone numbers / emails in free text.
function looksLikePersonalData(text: string): boolean {
  return /\b\d{10}\b/.test(text) || /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(text);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!user.isEmailVerified) return NextResponse.json({ error: "Verify your email first." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parsed.data;

  const blob = [b.processDescription, b.questionsAsked].filter(Boolean).join(" ");
  if (looksLikePersonalData(blob)) {
    return NextResponse.json(
      { error: "Please remove phone numbers / emails and do not identify individuals." },
      { status: 400 },
    );
  }

  const inst = await prisma.institution.findUnique({ where: { slug: b.slug }, select: { id: true } });
  if (!inst) return NextResponse.json({ error: "Institution not found" }, { status: 404 });

  await prisma.interviewReview.create({
    data: {
      institutionId: inst.id,
      userId: user.id,
      category: b.category,
      positionApplied: b.positionApplied ?? null,
      department: b.department ?? null,
      outcome: b.outcome,
      offerAccepted: b.offerAccepted ?? null,
      difficulty: b.difficulty ?? null,
      processDescription: b.processDescription ?? null,
      questionsAsked: b.questionsAsked ?? null,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
