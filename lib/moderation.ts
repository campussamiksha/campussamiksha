import { ModerationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { recomputeInstitutionStats } from "./aggregates";

export type ReviewAction = "approve" | "reject" | "remove" | "restore";

const ACTION_STATUS: Record<ReviewAction, ModerationStatus> = {
  approve: "published",
  reject: "rejected",
  remove: "removed",
  restore: "published",
};

/**
 * Apply a moderation decision to a review: update its status, write an audit
 * log entry, and refresh the institution's aggregates so ratings reflect only
 * what is currently published.
 */
export async function moderateReview(
  reviewId: string,
  action: ReviewAction,
  actorUserId: string,
  note?: string,
) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: ACTION_STATUS[action],
      moderatedBy: actorUserId,
      moderatedAt: new Date(),
    },
    select: { id: true, institutionId: true },
  });

  await prisma.moderationLog.create({
    data: {
      actorUserId,
      action,
      targetType: "review",
      targetId: reviewId,
      note: note ?? null,
    },
  });

  await recomputeInstitutionStats(review.institutionId);
  return review;
}

/** Mark a content report resolved (optionally after acting on its target). */
export async function resolveReport(reportId: string, actorUserId: string) {
  await prisma.contentReport.update({
    where: { id: reportId },
    data: { resolved: true, resolvedBy: actorUserId },
  });
}

/** Approve or reject a salary report. */
export async function moderateSalary(
  id: string,
  action: "approve" | "reject",
  actorUserId: string,
) {
  await prisma.salaryReport.update({
    where: { id },
    data: { status: action === "approve" ? "published" : "rejected" },
  });
  await prisma.moderationLog.create({
    data: { actorUserId, action: `${action}_salary`, targetType: "salary_report", targetId: id },
  });
}

/** Approve or reject an interview experience. */
export async function moderateInterview(
  id: string,
  action: "approve" | "reject",
  actorUserId: string,
) {
  await prisma.interviewReview.update({
    where: { id },
    data: { status: action === "approve" ? "published" : "rejected" },
  });
  await prisma.moderationLog.create({
    data: { actorUserId, action: `${action}_interview`, targetType: "interview_review", targetId: id },
  });
}

/** Approve or reject an institution's official response to a review. */
export async function moderateResponse(
  responseId: string,
  action: "approve" | "reject",
  actorUserId: string,
) {
  await prisma.reviewResponse.update({
    where: { id: responseId },
    data: { status: action === "approve" ? "published" : "rejected" },
  });
  await prisma.moderationLog.create({
    data: {
      actorUserId,
      action: `${action}_response`,
      targetType: "review_response",
      targetId: responseId,
    },
  });
}
