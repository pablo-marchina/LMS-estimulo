"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";

const uuid = z.string().uuid();
const moderationStatus = z.enum(["visible", "hidden"]);
const practiceReviewStatus = z.enum(["accepted", "rejected"]);

async function actorId() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  return auth.identity.user_account_id;
}

export async function publishOperationJourneyAction(formData: FormData) {
  const actor = await actorId();
  const selection = z.string().min(1).parse(formData.get("journey_selection"));
  const separator = selection.indexOf(":");
  if (separator < 1) throw new Error("JOURNEY_SELECTION_INVALID");
  const organization = uuid.parse(formData.get("organization_id"));
  await journeyRuntime.publishVertical(
    actor,
    organization,
    uuid.parse(selection.slice(0, separator)),
    z.string().min(16).parse(selection.slice(separator + 1)),
    String(formData.get("idempotency_key") || randomUUID()),
  );
  redirect(`/admin/operacao?organization=${organization}&sucesso=publicacao`);
}

export async function createOperationEnrollmentAction(formData: FormData) {
  const actor = await actorId();
  const organization = uuid.parse(formData.get("organization_id"));
  await journeyRuntime.createEnrollment(
    actor,
    organization,
    uuid.parse(formData.get("entrepreneur_id")),
    uuid.parse(formData.get("journey_version_id")),
    "operator_ui",
    String(formData.get("idempotency_key") || randomUUID()),
  );
  redirect(`/admin/operacao?organization=${organization}&sucesso=matricula`);
}

export async function moderateOperationCommentAction(formData: FormData) {
  const actor = await actorId();
  const organization = uuid.parse(formData.get("organization_id"));
  const status = moderationStatus.parse(formData.get("status"));
  const reason = z.string().trim().max(500).parse(String(formData.get("reason") ?? ""));
  if (status === "hidden" && !reason) throw new Error("ACTIVITY_COMMENT_MODERATION_REASON_REQUIRED");
  await journeyRuntime.moderateActivityComment(
    actor,
    organization,
    uuid.parse(formData.get("comment_id")),
    status,
    reason,
    String(formData.get("idempotency_key") || randomUUID()),
  );
  redirect(`/admin/operacao?organization=${organization}&comentario=moderado#comentarios`);
}

export async function reviewOperationPracticeAction(formData: FormData) {
  const actor = await actorId();
  const organization = uuid.parse(formData.get("organization_id"));
  const status = practiceReviewStatus.parse(formData.get("status"));
  const feedback = z.string().trim().max(2000).parse(String(formData.get("feedback") ?? ""));
  if (status === "rejected" && !feedback) throw new Error("PRACTICE_REVIEW_FEEDBACK_REQUIRED");
  await practiceRuntime.review(
    actor,
    organization,
    uuid.parse(formData.get("submission_id")),
    status,
    feedback,
    String(formData.get("idempotency_key") || randomUUID()),
  );
  redirect(`/admin/operacao?organization=${organization}&pratica=revisada#praticas`);
}
