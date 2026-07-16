import { prisma } from "./prisma";

/**
 * Approve an institution claim: mark the institution claimed, record the owning
 * user, and promote that user to `institution_rep` so they can post official
 * responses. Ownership is per-institution (via institutions.claimedByUserId);
 * the role just gates the ability.
 */
export async function approveClaim(claimId: string, actorUserId: string) {
  const claim = await prisma.institutionClaim.update({
    where: { id: claimId },
    data: { status: "approved", reviewedBy: actorUserId },
  });

  await prisma.$transaction([
    prisma.institution.update({
      where: { id: claim.institutionId },
      data: { isClaimed: true, claimedByUserId: claim.userId },
    }),
    prisma.user.update({ where: { id: claim.userId }, data: { role: "institution_rep" } }),
    prisma.moderationLog.create({
      data: { actorUserId, action: "approve_claim", targetType: "institution_claim", targetId: claimId },
    }),
  ]);

  return claim;
}

export async function rejectClaim(claimId: string, actorUserId: string) {
  await prisma.institutionClaim.update({
    where: { id: claimId },
    data: { status: "rejected", reviewedBy: actorUserId },
  });
  await prisma.moderationLog.create({
    data: { actorUserId, action: "reject_claim", targetType: "institution_claim", targetId: claimId },
  });
}
