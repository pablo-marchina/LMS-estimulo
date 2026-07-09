"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { e14 } from "@/lib/e14/rpc";

const uuid = z.string().uuid();
const integer = z.coerce.number().int().nonnegative();

async function actorId() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  return auth.identity.user_account_id;
}

export async function startJourneyAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const version = integer.parse(formData.get("aggregate_version"));
  const key = String(formData.get("idempotency_key") || randomUUID());
  await e14.startJourney(actor, journey, version, key);
  redirect(`/empreendedor/diagnostico?journey=${journey}`);
}

export async function submitDiagnosisAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await e14.getParticipantExperience(actor, journey);
  if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
  let diagnostic = experience.diagnostic;

  if (!experience.state.d) {
    await e14.startDiagnostic(actor, journey, diagnostic.version_id, `${baseKey}:start`);
    experience = await e14.getParticipantExperience(actor, journey);
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
      await e14.recordDiagnosticResponse(actor, sessionId, item.id, option, revision, `${baseKey}:item:${item.id}:revision:${revision}`);
    }
  }

  experience = await e14.getParticipantExperience(actor, journey);
  const aggregate = experience.state.d?.aggregate_version;
  if (aggregate === undefined) throw new Error("DIAGNOSTIC_VERSION_NOT_AVAILABLE");
  await e14.completeDiagnostic(actor, sessionId, aggregate, `${baseKey}:complete`);
  const updated = await e14.getParticipantExperience(actor, journey);
  const step = updated.state.s?.step_instance_id;
  redirect(step ? `/empreendedor/atividade/${step}?journey=${journey}` : `/empreendedor/resultado?journey=${journey}`);
}

export async function acknowledgeActivityAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await e14.getParticipantExperience(actor, journey);
  if (!experience.activity || experience.state.s?.step_instance_id !== step) throw new Error("ACTIVITY_NOT_AVAILABLE");
  let activity = experience.activity;

  if (!experience.state.s.session_id) {
    await e14.startActivity(actor, step, experience.state.s.aggregate_version, `${baseKey}:start`);
    experience = await e14.getParticipantExperience(actor, journey);
    if (!experience.activity) throw new Error("ACTIVITY_NOT_AVAILABLE");
    activity = experience.activity;
  }
  const sessionId = experience.state.s?.session_id;
  if (!sessionId) throw new Error("ACTIVITY_SESSION_NOT_AVAILABLE");

  for (const section of activity.sections) {
    if (formData.get(`section_${section.code}`) === "on") {
      await e14.acknowledgeSection(actor, sessionId, section.code, `${baseKey}:section:${section.code}`);
    }
  }
  redirect(`/empreendedor/atividade/${step}?journey=${journey}`);
}

export async function submitQuickCheckAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await e14.getParticipantExperience(actor, journey);
  let question = experience.assessment?.questions[0];
  if (!question || experience.state.s?.step_instance_id !== step) throw new Error("ASSESSMENT_NOT_AVAILABLE");

  if (!experience.state.q || experience.state.q.status !== "in_progress") {
    await e14.startQuickCheck(actor, step, `${baseKey}:start`);
    experience = await e14.getParticipantExperience(actor, journey);
    question = experience.assessment?.questions[0];
    if (!question) throw new Error("ASSESSMENT_NOT_AVAILABLE");
  }
  const attempt = experience.state.q;
  if (!attempt) throw new Error("ASSESSMENT_ATTEMPT_NOT_AVAILABLE");
  const answer = String(formData.get("answer") ?? "");
  if (!answer) throw new Error("ASSESSMENT_ANSWER_REQUIRED");
  if (question.response && question.response.option_code !== answer) throw new Error("ASSESSMENT_ANSWER_ALREADY_RECORDED");
  if (!question.response) await e14.recordQuickCheckAnswer(actor, attempt.attempt_id, question.id, answer, `${baseKey}:answer`);
  experience = await e14.getParticipantExperience(actor, journey);
  const current = experience.state.q;
  if (!current) throw new Error("ASSESSMENT_VERSION_NOT_AVAILABLE");
  await e14.submitQuickCheck(actor, current.attempt_id, current.aggregate_version, `${baseKey}:submit`);
  const updated = await e14.getParticipantExperience(actor, journey);
  redirect(updated.state.q?.passed ? `/empreendedor/resultado?journey=${journey}` : `/empreendedor/atividade/${step}?journey=${journey}`);
}

export async function publishVerticalAction(formData: FormData) {
  const actor = await actorId();
  const selection = z.string().min(1).parse(formData.get("journey_selection"));
  const separator = selection.indexOf(":");
  if (separator < 1) throw new Error("JOURNEY_SELECTION_INVALID");
  const journeyVersionId = uuid.parse(selection.slice(0, separator));
  const contentHash = z.string().min(16).parse(selection.slice(separator + 1));
  await e14.publishVertical(
    actor,
    uuid.parse(formData.get("organization_id")),
    journeyVersionId,
    contentHash,
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/admin?organization=${formData.get("organization_id")}&sucesso=publicacao`);
}

export async function createEnrollmentAction(formData: FormData) {
  const actor = await actorId();
  await e14.createEnrollment(
    actor,
    uuid.parse(formData.get("organization_id")),
    uuid.parse(formData.get("entrepreneur_id")),
    uuid.parse(formData.get("journey_version_id")),
    "operator_ui",
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/admin?organization=${formData.get("organization_id")}&sucesso=matricula`);
}
