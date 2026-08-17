"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { assertParticipantMutationAllowed } from "@/lib/auth/participant-context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";
import { utilityRatingRuntime } from "@/lib/utility-rating/runtime";

const uuid = z.string().uuid();
const integer = z.coerce.number().int().nonnegative();
const commentBody = z.string().trim().min(1).max(2000);
const moderationStatus = z.enum(["visible", "hidden"]);
const practiceReviewStatus = z.enum(["accepted", "rejected"]);
const utilityRatingValue = z.coerce.number().int().min(1).max(5);

function activityHref(journey: string, step: string, query = "", hash = "") {
  return `/empreendedor/atividade/${step}?journey=${journey}${query}${hash ? `#${hash}` : ""}`;
}

async function actorId() {
  await assertParticipantMutationAllowed();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  return auth.identity.user_account_id;
}

export async function startJourneyAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const version = integer.parse(formData.get("aggregate_version"));
  const key = String(formData.get("idempotency_key") || randomUUID());
  await journeyRuntime.startJourney(actor, journey, version, key);
  redirect(`/empreendedor/diagnostico?journey=${journey}`);
}

export async function submitDiagnosisAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await journeyRuntime.getParticipantExperience(actor, journey);
  if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
  let diagnostic = experience.diagnostic;

  if (!experience.state.d) {
    await journeyRuntime.startDiagnostic(actor, journey, diagnostic.version_id, `${baseKey}:start`);
    experience = await journeyRuntime.getParticipantExperience(actor, journey);
    if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
    diagnostic = experience.diagnostic;
  }
  const sessionId = experience.state.d?.session_id;
  if (!sessionId) throw new Error("DIAGNOSTIC_SESSION_NOT_AVAILABLE");

  for (const item of diagnostic.items) {
    const option = String(formData.get(`answer_${item.id}`) ?? "");
    if (item.is_required && !option) throw new Error("DIAGNOSTIC_REQUIRED_ANSWER_MISSING");
    if (option && item.response?.option_code !== option) {
      const revision = (item.response?.revision ?? 0) + 1;
      await journeyRuntime.recordDiagnosticResponse(actor, sessionId, item.id, option, revision, `${baseKey}:item:${item.id}:revision:${revision}`);
    }
  }

  experience = await journeyRuntime.getParticipantExperience(actor, journey);
  const aggregate = experience.state.d?.aggregate_version;
  if (aggregate === undefined) throw new Error("DIAGNOSTIC_VERSION_NOT_AVAILABLE");
  await journeyRuntime.completeDiagnostic(actor, sessionId, aggregate, `${baseKey}:complete`);
  const updated = await journeyRuntime.getParticipantExperience(actor, journey);
  const step = updated.state.s?.step_instance_id;
  redirect(step ? activityHref(journey, step) : `/empreendedor/resultado?journey=${journey}`);
}

export async function acknowledgeActivityAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await journeyRuntime.getParticipantExperience(actor, journey);
  if (!experience.activity || experience.state.s?.step_instance_id !== step) throw new Error("ACTIVITY_NOT_AVAILABLE");
  let activity = experience.activity;

  if (!experience.state.s.session_id) {
    await journeyRuntime.startActivity(actor, step, experience.state.s.aggregate_version, `${baseKey}:start`);
    experience = await journeyRuntime.getParticipantExperience(actor, journey);
    if (!experience.activity) throw new Error("ACTIVITY_NOT_AVAILABLE");
    activity = experience.activity;
  }
  const sessionId = experience.state.s?.session_id;
  if (!sessionId) throw new Error("ACTIVITY_SESSION_NOT_AVAILABLE");

  for (const section of activity.sections) {
    if (formData.get(`section_${section.code}`) === "on") {
      await journeyRuntime.acknowledgeSection(actor, sessionId, section.code, `${baseKey}:section:${section.code}`);
    }
  }
  redirect(activityHref(journey, step));
}

export async function createActivityCommentAction(formData: FormData) {
  const actor = await actorId();
  uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const body = commentBody.parse(String(formData.get("body") ?? ""));
  const key = String(formData.get("idempotency_key") || randomUUID());
  const result = await journeyRuntime.createActivityComment(actor, step, body, key);
  return result.data;
}

export async function moderateActivityCommentAction(formData: FormData) {
  const actor = await actorId();
  const organization = uuid.parse(formData.get("organization_id"));
  const comment = uuid.parse(formData.get("comment_id"));
  const status = moderationStatus.parse(formData.get("status"));
  const reason = z.string().trim().max(500).parse(String(formData.get("reason") ?? ""));
  if (status === "hidden" && !reason) throw new Error("ACTIVITY_COMMENT_MODERATION_REASON_REQUIRED");
  const key = String(formData.get("idempotency_key") || randomUUID());
  await journeyRuntime.moderateActivityComment(actor, organization, comment, status, reason, key);
  redirect(`/admin/operacao?area=comentarios&organization=${organization}&comentario=moderado#comentarios`);
}

export async function reviewPracticeSubmissionAction(formData: FormData) {
  const actor = await actorId();
  const organization = uuid.parse(formData.get("organization_id"));
  const submission = uuid.parse(formData.get("submission_id"));
  const status = practiceReviewStatus.parse(formData.get("status"));
  const feedback = z.string().trim().max(2000).parse(String(formData.get("feedback") ?? ""));
  if (status === "rejected" && !feedback) throw new Error("PRACTICE_REVIEW_FEEDBACK_REQUIRED");
  await practiceRuntime.review(
    actor,
    organization,
    submission,
    status,
    feedback,
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/admin/operacao?area=praticas&organization=${organization}&pratica=revisada#praticas`);
}

export async function rateActivityUtilityAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const rating = utilityRatingValue.parse(formData.get("rating"));
  await utilityRatingRuntime.rate(
    actor,
    step,
    rating,
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(activityHref(journey, step, "&utilidade=registrada", "utilidade"));
}

export async function submitQuickCheckAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await journeyRuntime.getParticipantExperience(actor, journey);
  let assessment = experience.assessment;
  if (!assessment?.questions.length || experience.state.s?.step_instance_id !== step) {
    throw new Error("ASSESSMENT_NOT_AVAILABLE");
  }

  if (!experience.state.q || experience.state.q.status !== "in_progress") {
    await journeyRuntime.startQuickCheck(actor, step, `${baseKey}:start`);
    experience = await journeyRuntime.getParticipantExperience(actor, journey);
    assessment = experience.assessment;
    if (!assessment?.questions.length) throw new Error("ASSESSMENT_NOT_AVAILABLE");
  }
  const attempt = experience.state.q;
  if (!attempt) throw new Error("ASSESSMENT_ATTEMPT_NOT_AVAILABLE");

  for (const question of assessment.questions) {
    if (question.response) continue;
    const field = `answer_${question.id}`;
    const answer = question.question_type === "multiple_choice"
      ? formData.getAll(field).map(String).map((value) => value.trim()).filter(Boolean).join(",")
      : String(formData.get(field) ?? "").trim();
    if (!answer) throw new Error("ASSESSMENT_ANSWER_REQUIRED");
    await journeyRuntime.recordQuickCheckAnswer(
      actor,
      attempt.attempt_id,
      question.id,
      answer,
      `${baseKey}:answer:${question.id}`
    );
  }

  experience = await journeyRuntime.getParticipantExperience(actor, journey);
  const current = experience.state.q;
  if (!current) throw new Error("ASSESSMENT_VERSION_NOT_AVAILABLE");
  await journeyRuntime.submitQuickCheck(actor, current.attempt_id, current.aggregate_version, `${baseKey}:submit`);
  const updated = await journeyRuntime.getParticipantExperience(actor, journey);
  if (updated.state.q?.passed) {
    await credentialRuntime.issue(actor, journey, step, `${baseKey}:credentials`);
    redirect(`/empreendedor/resultado?journey=${journey}&avaliacao=aprovada`);
  }
  redirect(activityHref(journey, step, "&avaliacao=reprovada", "avaliacao"));
}

export async function issueLearningCredentialsAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const stepValue = String(formData.get("step_instance_id") ?? "").trim();
  const step = stepValue ? uuid.parse(stepValue) : null;
  await credentialRuntime.issue(
    actor,
    journey,
    step,
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/empreendedor/resultado?journey=${journey}&credenciais=atualizadas`);
}

export async function publishVerticalAction(formData: FormData) {
  const actor = await actorId();
  const selection = z.string().min(1).parse(formData.get("journey_selection"));
  const separator = selection.indexOf(":");
  if (separator < 1) throw new Error("JOURNEY_SELECTION_INVALID");
  const journeyVersionId = uuid.parse(selection.slice(0, separator));
  const contentHash = z.string().min(16).parse(selection.slice(separator + 1));
  const organizationId = uuid.parse(formData.get("organization_id"));
  await journeyRuntime.publishAdminJourneyVersion(
    actor,
    organizationId,
    journeyVersionId,
    contentHash,
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/admin/operacao?area=publicacao&organization=${organizationId}&sucesso=publicacao`);
}

export async function createEnrollmentAction(formData: FormData) {
  const actor = await actorId();
  const organizationId = uuid.parse(formData.get("organization_id"));
  await journeyRuntime.createEnrollment(
    actor,
    organizationId,
    uuid.parse(formData.get("entrepreneur_id")),
    uuid.parse(formData.get("journey_version_id")),
    "operator_ui",
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/admin/operacao?area=matriculas&organization=${organizationId}&sucesso=matricula`);
}
