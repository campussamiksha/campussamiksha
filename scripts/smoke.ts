/**
 * End-to-end smoke test against a live Postgres. Exercises the real lib
 * functions (moderation, aggregates, claims) — not HTTP — on throwaway data,
 * then cleans up. Run with:
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/smoke.ts
 */
import { prisma } from "../lib/prisma";
import { moderateReview, moderateResponse, resolveReport } from "../lib/moderation";
import { approveClaim } from "../lib/claims";
import { parametersFor } from "../lib/ratingParameters";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}` + (extra !== undefined ? `  (got: ${JSON.stringify(extra)})` : ""));
  }
}

const facultyScores = () =>
  parametersFor("teaching_faculty").map((p) => ({ parameterId: p.id, score: 4 }));

async function main() {
  const stamp = Date.now();

  const admin = await prisma.user.findUnique({ where: { email: "admin@campussamiksha.local" } });
  if (!admin) throw new Error("Admin not seeded — run `prisma db seed` first.");

  // --- Fixtures: throwaway institution + two verified reviewers + a rep ---
  const inst = await prisma.institution.create({
    data: { name: `SMOKE TEST INSTITUTE ${stamp}`, slug: `smoke-${stamp}`, type: "private_university" },
  });
  const rev1 = await prisma.user.create({ data: { email: `r1-${stamp}@t.local`, isEmailVerified: true } });
  const rev2 = await prisma.user.create({ data: { email: `r2-${stamp}@t.local`, isEmailVerified: true } });
  const rep = await prisma.user.create({ data: { email: `rep-${stamp}@t.local`, isEmailVerified: true } });

  console.log("\n[1] Review submission + moderation + aggregate math");
  const r1 = await prisma.review.create({
    data: {
      institutionId: inst.id, userId: rev1.id, category: "teaching_faculty",
      empStatus: "former", empType: "permanent", title: "Good place", pros: "x".repeat(25),
      cons: "y".repeat(25), overallRating: 4, wouldRecommend: true, status: "pending",
      scores: { create: facultyScores() },
    },
  });
  const r2 = await prisma.review.create({
    data: {
      institutionId: inst.id, userId: rev2.id, category: "teaching_faculty",
      empStatus: "current", empType: "contract", title: "Not great", pros: "x".repeat(25),
      cons: "y".repeat(25), overallRating: 2, wouldRecommend: false, status: "pending",
      scores: { create: parametersFor("teaching_faculty").map((p) => ({ parameterId: p.id, score: 2 })) },
    },
  });

  let i = await prisma.institution.findUniqueOrThrow({ where: { id: inst.id } });
  check("pending reviews do not affect aggregates", i.reviewCount === 0 && i.avgOverall === null, {
    reviewCount: i.reviewCount, avgOverall: i.avgOverall,
  });

  await moderateReview(r1.id, "approve", admin.id);
  i = await prisma.institution.findUniqueOrThrow({ where: { id: inst.id } });
  check("after 1 approval: count=1, avg=4.00, recommend=100%",
    i.reviewCount === 1 && Number(i.avgOverall) === 4 && Number(i.recommendPct) === 100,
    { count: i.reviewCount, avg: i.avgOverall, rec: i.recommendPct });

  await moderateReview(r2.id, "approve", admin.id);
  i = await prisma.institution.findUniqueOrThrow({ where: { id: inst.id } });
  check("after 2 approvals: count=2, avg=3.00, recommend=50%",
    i.reviewCount === 2 && Number(i.avgOverall) === 3 && Number(i.recommendPct) === 50,
    { count: i.reviewCount, avg: i.avgOverall, rec: i.recommendPct });

  const r1state = await prisma.review.findUniqueOrThrow({ where: { id: r1.id } });
  check("approved review is published + audit logged", r1state.status === "published", r1state.status);
  const log = await prisma.moderationLog.count({ where: { targetId: r1.id, action: "approve" } });
  check("moderation_log has approve entry", log === 1, log);

  console.log("\n[2] Institution claim -> approval -> rep promotion");
  const claim = await prisma.institutionClaim.create({
    data: { institutionId: inst.id, userId: rep.id, officialEmail: `hr-${stamp}@inst.ac.in`, status: "pending" },
  });
  await approveClaim(claim.id, admin.id);
  i = await prisma.institution.findUniqueOrThrow({ where: { id: inst.id } });
  const repAfter = await prisma.user.findUniqueOrThrow({ where: { id: rep.id } });
  check("institution marked claimed + owner recorded", i.isClaimed && i.claimedByUserId === rep.id,
    { isClaimed: i.isClaimed, owner: i.claimedByUserId });
  check("claimant promoted to institution_rep", repAfter.role === "institution_rep", repAfter.role);

  console.log("\n[3] Right of reply -> moderation");
  const resp = await prisma.reviewResponse.create({
    data: { reviewId: r1.id, institutionId: inst.id, responderUserId: rep.id, body: "z".repeat(30), status: "pending" },
  });
  await moderateResponse(resp.id, "approve", admin.id);
  const respAfter = await prisma.reviewResponse.findUniqueOrThrow({ where: { id: resp.id } });
  check("official response published after moderation", respAfter.status === "published", respAfter.status);
  const dup = await prisma.reviewResponse
    .create({ data: { reviewId: r1.id, institutionId: inst.id, body: "second".repeat(5), status: "pending" } })
    .then(() => "created")
    .catch((e) => (e?.code === "P2002" ? "blocked" : "othererr"));
  check("one-response-per-review enforced by DB", dup === "blocked", dup);

  console.log("\n[4] Report -> flag -> remove -> aggregates recomputed");
  await prisma.contentReport.create({
    data: { reviewId: r2.id, reporterUserId: rev1.id, reason: "names_individual" },
  });
  await prisma.review.update({ where: { id: r2.id }, data: { reportCount: { increment: 1 }, status: "flagged" } });
  await moderateReview(r2.id, "remove", admin.id);
  i = await prisma.institution.findUniqueOrThrow({ where: { id: inst.id } });
  check("after removing the 2-star review: count=1, avg=4.00, recommend=100%",
    i.reviewCount === 1 && Number(i.avgOverall) === 4 && Number(i.recommendPct) === 100,
    { count: i.reviewCount, avg: i.avgOverall, rec: i.recommendPct });

  const rep2 = await prisma.contentReport.findFirstOrThrow({ where: { reviewId: r2.id } });
  await resolveReport(rep2.id, admin.id);
  const rep2after = await prisma.contentReport.findUniqueOrThrow({ where: { id: rep2.id } });
  check("content report marked resolved", rep2after.resolved === true, rep2after.resolved);

  // --- Cleanup (cascade removes reviews/scores/response/claims) ---
  await prisma.institution.delete({ where: { id: inst.id } });
  await prisma.user.deleteMany({ where: { id: { in: [rev1.id, rev2.id, rep.id] } } });

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
