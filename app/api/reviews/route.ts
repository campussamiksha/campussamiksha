import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parametersFor, ReviewerCategory } from "@/lib/ratingParameters";

const scoreSchema = z.object({
  parameterId: z.number().int(),
  score: z.number().int().min(1).max(5),
});

const bodySchema = z.object({
  slug: z.string().min(1),
  category: z.enum(["teaching_faculty", "non_teaching_staff", "research_scholar"]),
  empStatus: z.enum(["current", "former"]),
  empType: z.enum([
    "permanent", "tenure_track", "contract", "adhoc_guest",
    "visiting", "postdoc", "phd_scholar", "project_staff", "other",
  ]),
  designation: z.string().max(120).nullish(),
  department: z.string().max(120).nullish(),
  startYear: z.number().int().min(1950).max(2100).nullish(),
  endYear: z.number().int().min(1950).max(2100).nullish(),
  title: z.string().min(5).max(120),
  pros: z.string().min(20).max(4000),
  cons: z.string().min(20).max(4000),
  adviceToMgmt: z.string().max(4000).nullish(),
  adviceToCandidate: z.string().max(4000).nullish(),
  overallRating: z.number().int().min(1).max(5),
  wouldRecommend: z.boolean().nullish(),
  scores: z.array(scoreSchema).min(1),
});

// Lightweight guardrail: block obvious contact info / doxxing. Real moderation
// (naming individuals, defamation) is a human review step; this is a first filter.
function looksLikePersonalData(text: string): boolean {
  const phone = /\b\d{10}\b/;
  const email = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/;
  return phone.test(text) || email.test(text);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to post a review." }, { status: 401 });
  }
  if (!user.isEmailVerified) {
    return NextResponse.json({ error: "Please verify your email before posting." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parsed.data;

  if (b.endYear && b.startYear && b.endYear < b.startYear) {
    return NextResponse.json({ error: "End year cannot be before start year." }, { status: 400 });
  }

  const blob = [b.title, b.pros, b.cons, b.adviceToMgmt, b.adviceToCandidate].filter(Boolean).join(" ");
  if (looksLikePersonalData(blob)) {
    return NextResponse.json(
      { error: "Please remove phone numbers / email addresses and do not identify individuals." },
      { status: 400 },
    );
  }

  // Only accept scores for parameters valid for this reviewer category.
  const allowed = new Set(parametersFor(b.category as ReviewerCategory).map((p) => p.id));
  const scores = b.scores.filter((s) => allowed.has(s.parameterId));
  if (scores.length === 0) {
    return NextResponse.json({ error: "No valid ratings for this reviewer type." }, { status: 400 });
  }

  const inst = await prisma.institution.findUnique({ where: { slug: b.slug }, select: { id: true } });
  if (!inst) return NextResponse.json({ error: "Institution not found" }, { status: 404 });

  try {
    const review = await prisma.review.create({
      data: {
        institutionId: inst.id,
        userId: user.id,
        badge: user.maxBadge, // carry the reviewer's verification tier onto the review
        category: b.category as ReviewerCategory,
        empStatus: b.empStatus,
        empType: b.empType,
        designation: b.designation ?? null,
        department: b.department ?? null,
        startYear: b.startYear ?? null,
        endYear: b.endYear ?? null,
        title: b.title,
        pros: b.pros,
        cons: b.cons,
        adviceToMgmt: b.adviceToMgmt ?? null,
        adviceToCandidate: b.adviceToCandidate ?? null,
        overallRating: b.overallRating,
        wouldRecommend: b.wouldRecommend ?? null,
        status: "pending", // enters moderation queue
        scores: { create: scores.map((s) => ({ parameterId: s.parameterId, score: s.score })) },
      },
    });
    return NextResponse.json({ ok: true, id: review.id, status: "pending" }, { status: 201 });
  } catch (e: unknown) {
    // Unique constraint → user already reviewed this institution.
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "You have already reviewed this institution." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save review" }, { status: 500 });
  }
}
