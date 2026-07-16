import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const schema = z
  .object({
    slug: z.string().min(1),
    category: z.enum(["teaching_faculty", "non_teaching_staff", "research_scholar"]),
    empType: z.enum([
      "permanent", "tenure_track", "contract", "adhoc_guest",
      "visiting", "postdoc", "phd_scholar", "project_staff", "other",
    ]),
    designation: z.string().max(120).optional(),
    department: z.string().max(120).optional(),
    yearsExperience: z.number().int().min(0).max(60).nullish(),
    payScale: z.string().max(120).optional(),
    grossMonthly: z.number().positive().max(100_000_000).nullish(),
    annualCtc: z.number().positive().max(1_000_000_000).nullish(),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
    paidOnTime: z.boolean().nullish(),
  })
  .refine((d) => d.grossMonthly != null || d.annualCtc != null, {
    message: "Enter monthly gross or annual CTC (at least one).",
  });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!user.isEmailVerified) return NextResponse.json({ error: "Verify your email first." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parsed.data;

  const inst = await prisma.institution.findUnique({ where: { slug: b.slug }, select: { id: true } });
  if (!inst) return NextResponse.json({ error: "Institution not found" }, { status: 404 });

  await prisma.salaryReport.create({
    data: {
      institutionId: inst.id,
      userId: user.id,
      category: b.category,
      empType: b.empType,
      designation: b.designation ?? null,
      department: b.department ?? null,
      yearsExperience: b.yearsExperience ?? null,
      payScale: b.payScale ?? null,
      grossMonthly: b.grossMonthly ?? null,
      annualCtc: b.annualCtc ?? null,
      currency: b.currency,
      paidOnTime: b.paidOnTime ?? null,
      badge: user.maxBadge,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
