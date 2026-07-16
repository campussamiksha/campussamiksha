/** Demo content so the live site isn't empty. Idempotent: skips if the target
 *  institution already has published reviews. Not for production. */
import { PrismaClient } from "@prisma/client";
import { parametersFor } from "../lib/ratingParameters";
import { recomputeInstitutionStats } from "../lib/aggregates";

const prisma = new PrismaClient();

async function user(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, isEmailVerified: true, maxBadge: "employment_verified", displayHandle: email.split("@")[0] },
  });
}

async function main() {
  const inst = await prisma.institution.findUnique({ where: { slug: "indian-institute-of-technology-bombay" } });
  if (!inst) throw new Error("Seed institutions first.");

  const already = await prisma.review.count({ where: { institutionId: inst.id, status: "published" } });
  if (already > 0) { console.log("Demo content already present — skipping."); return; }

  const [u1, u2, u3] = await Promise.all([
    user("demo.faculty@example.com"),
    user("demo.scholar@example.com"),
    user("demo.staff@example.com"),
  ]);

  const scores = (cat: Parameters<typeof parametersFor>[0], v: number) =>
    ({ create: parametersFor(cat).map((p) => ({ parameterId: p.id, score: v })) });

  await prisma.review.create({ data: {
    institutionId: inst.id, userId: u1.id, category: "teaching_faculty", empStatus: "former", empType: "permanent",
    designation: "Associate Professor", department: "Electrical Engineering", startYear: 2016, endYear: 2023,
    title: "Excellent research environment, heavy admin load",
    pros: "World-class labs, bright students, real research freedom and generous seed grants.",
    cons: "Administrative processes are slow and committee/admin work eats into research time.",
    adviceToCandidate: "Come for the research ecosystem; be ready to protect your own time.",
    overallRating: 4, wouldRecommend: true, badge: "employment_verified", status: "published",
    scores: scores("teaching_faculty", 4),
  }});

  await prisma.review.create({ data: {
    institutionId: inst.id, userId: u2.id, category: "research_scholar", empStatus: "current", empType: "phd_scholar",
    designation: "PhD Scholar", department: "Computer Science", startYear: 2021,
    title: "Great guide and facilities, stipend is tight for Mumbai",
    pros: "Supportive supervisor, excellent compute and lab access, strong peer group.",
    cons: "The stipend does not stretch far given Mumbai's cost of living.",
    overallRating: 3, wouldRecommend: true, badge: "email_verified", status: "published",
    scores: scores("research_scholar", 3),
  }});

  await prisma.review.create({ data: {
    institutionId: inst.id, userId: u3.id, category: "non_teaching_staff", empStatus: "former", empType: "contract",
    designation: "Lab Technician", department: "Chemistry", startYear: 2019, endYear: 2022,
    title: "Contract terms and pay parity need work",
    pros: "Good colleagues and a genuinely interesting place to work.",
    cons: "Contract staff face pay delays and limited growth compared to permanent staff.",
    overallRating: 2, wouldRecommend: false, badge: "unverified", status: "published",
    scores: scores("non_teaching_staff", 2),
  }});

  await prisma.salaryReport.create({ data: {
    institutionId: inst.id, userId: u1.id, category: "teaching_faculty", empType: "permanent",
    designation: "Associate Professor", department: "Electrical Engineering", yearsExperience: 8,
    payScale: "Academic Level 13A (7th CPC)", grossMonthly: 165000, currency: "INR", paidOnTime: true,
    badge: "employment_verified", status: "published",
  }});

  await prisma.interviewReview.create({ data: {
    institutionId: inst.id, userId: u1.id, category: "teaching_faculty", positionApplied: "Assistant Professor",
    department: "Electrical Engineering", outcome: "offer", offerAccepted: true, difficulty: 4,
    processDescription: "A research seminar to the department, followed by a panel interview with the selection committee.",
    questionsAsked: "Five-year research plan; how your work complements existing groups; teaching philosophy.",
    status: "published",
  }});

  await recomputeInstitutionStats(inst.id);
  console.log("Demo content added to IIT Bombay.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
