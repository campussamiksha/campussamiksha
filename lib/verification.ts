import { prisma } from "./prisma";
import { deleteFile } from "./storage";

/**
 * Verification proofs are transient by design: reviewed, then the file is
 * deleted. Only the OUTCOME persists — a badge on the user (and their reviews).
 * `storageRef` is nulled whenever the file is gone (decision or expiry).
 */

async function purgeFile(storageRef: string | null) {
  if (storageRef) await deleteFile(storageRef);
}

/** Approve: grant the employment_verified badge, upgrade the user's reviews for
 *  the proven institution, log the action, and delete the stored file. */
export async function approveVerification(docId: string, actorUserId: string) {
  const doc = await prisma.verificationDocument.findUniqueOrThrow({ where: { id: docId } });

  await prisma.$transaction([
    prisma.user.update({ where: { id: doc.userId }, data: { maxBadge: "employment_verified" } }),
    prisma.review.updateMany({
      where: {
        userId: doc.userId,
        ...(doc.institutionId ? { institutionId: doc.institutionId } : {}),
      },
      data: { badge: "employment_verified" },
    }),
    prisma.verificationDocument.update({
      where: { id: docId },
      data: { status: "approved", reviewedBy: actorUserId, reviewedAt: new Date(), storageRef: null },
    }),
    prisma.moderationLog.create({
      data: { actorUserId, action: "approve_verification", targetType: "verification_document", targetId: docId },
    }),
  ]);

  await purgeFile(doc.storageRef); // delete the actual file — badge already granted
}

/** Reject: no badge; delete the stored file; log. */
export async function rejectVerification(docId: string, actorUserId: string) {
  const doc = await prisma.verificationDocument.findUniqueOrThrow({ where: { id: docId } });

  await prisma.$transaction([
    prisma.verificationDocument.update({
      where: { id: docId },
      data: { status: "rejected", reviewedBy: actorUserId, reviewedAt: new Date(), storageRef: null },
    }),
    prisma.moderationLog.create({
      data: { actorUserId, action: "reject_verification", targetType: "verification_document", targetId: docId },
    }),
  ]);

  await purgeFile(doc.storageRef);
}

/** Retention sweep: delete files for still-pending proofs past their expiry. */
export async function purgeExpired(): Promise<number> {
  const expired = await prisma.verificationDocument.findMany({
    where: { status: "pending", expiresAt: { lt: new Date() }, storageRef: { not: null } },
  });
  for (const doc of expired) {
    await purgeFile(doc.storageRef);
    await prisma.verificationDocument.update({
      where: { id: doc.id },
      data: { status: "expired", storageRef: null },
    });
  }
  return expired.length;
}
