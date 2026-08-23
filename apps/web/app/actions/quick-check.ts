"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { assertParticipantMutationAllowed } from "@/lib/auth/participant-context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { completeParticipantActivity } from "@/lib/journey-runtime/completion-runtime";
import type { AssessmentQuestion } from "@/lib/journey-runtime/contracts";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();

function activityHref(journey: string, step: string, query = "", hash = "") {
  return `/empreendedor/atividade/${step}?journey=${journey}${query}${hash ? `#${hash}` : ""}`;
}

function quickCheckAnswer(formData: FormData, question: AssessmentQuestion) {
  const field = `answer_${question.id}`;
  return question.question_type === "multiple_choice"
    ? formData.getAll(field).map(String).map((value) => value.trim()).filter(Boolean).join(",")
    : String(formData.get(field) ?? "").trim();
}

function quickCheckError(journey: string, step: string) {
  redirect(activityHref(journey, step, "&avaliacao=erro", "avaliacao"));
}

async function actorId() {
  await assertParticipantMutationAllowed();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  return auth.identity.user_account_id;
}

async function refreshOrFail(actor: string, journey: string, step: string) {
  try {
    return await journeyRuntime.getParticipantExperience(actor, journey);
  } catch (error) {
    console.error("QUICK_CHECK_REFRESH_FAILED", {
      journey_instance_id: journey,
      step_instance_id: step,
      error_name: error instanceof Error ? error.name : "unknown",
    });
    quickCheckError(journey, step);
  }
}

export async function submitQuickCheckAction(formData: FormData) {
  const actor = await actorId();
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());
  let experience = await refreshOrFail(actor, journey, step);
  let assessment = experience.assessment;

  if (!assessment?.questions.length || experience.state.s?.step_instance_id !== step) {
    redirect(activityHref(journey, step, "&avaliacao=indisponivel", "avaliacao"));
  }

  const submittedAnswers = new Map<string, string>();
  for (const question of assessment.questions) {
    if (question.response) continue;
    const answer = quickCheckAnswer(formData, question);
    if (!answer) redirect(activityHref(journey, step, "&avaliacao=resposta_pendente", "avaliacao"));
    submittedAnswers.set(question.id, answer);
  }

  if (!experience.state.q || experience.state.q.status !== "in_progress") {
    try {
      await journeyRuntime.startQuickCheck(actor, step, `${baseKey}:start`);
    } catch (error) {
      console.info("QUICK_CHECK_START_RECONCILE", {
        journey_instance_id: journey,
        step_instance_id: step,
        error_name: error instanceof Error ? error.name : "unknown",
      });
    }
    experience = await refreshOrFail(actor, journey, step);
    assessment = experience.assessment;
    if (!assessment?.questions.length || !experience.state.q) {
      quickCheckError(journey, step);
    }
  }

  let attempt = experience.state.q;
  if (!attempt) quickCheckError(journey, step);

  for (const question of assessment.questions) {
    if (question.response) continue;
    const answer = submittedAnswers.get(question.id) ?? quickCheckAnswer(formData, question);
    if (!answer) redirect(activityHref(journey, step, "&avaliacao=resposta_pendente", "avaliacao"));

    try {
      await journeyRuntime.recordQuickCheckAnswer(
        actor,
        attempt.attempt_id,
        question.id,
        answer,
        `${baseKey}:answer:${question.id}`,
      );
    } catch (error) {
      const latest = await refreshOrFail(actor, journey, step);
      const persisted = latest.assessment?.questions.find((candidate) => candidate.id === question.id)?.response;
      if (!persisted) {
        console.error("QUICK_CHECK_ANSWER_FAILED", {
          journey_instance_id: journey,
          step_instance_id: step,
          question_id: question.id,
          error_name: error instanceof Error ? error.name : "unknown",
        });
        quickCheckError(journey, step);
      }
      experience = latest;
      assessment = latest.assessment ?? assessment;
      attempt = latest.state.q ?? attempt;
    }
  }

  experience = await refreshOrFail(actor, journey, step);
  const current = experience.state.q;
  if (!current) quickCheckError(journey, step);

  let updated = experience;
  if (current.status === "in_progress") {
    try {
      await journeyRuntime.submitQuickCheck(actor, current.attempt_id, current.aggregate_version, `${baseKey}:submit`);
    } catch (error) {
      console.info("QUICK_CHECK_SUBMIT_RECONCILE", {
        journey_instance_id: journey,
        step_instance_id: step,
        error_name: error instanceof Error ? error.name : "unknown",
      });
    }
    updated = await refreshOrFail(actor, journey, step);
    if (!updated.state.q || updated.state.q.status === "in_progress") {
      quickCheckError(journey, step);
    }
  }

  if (updated.state.q?.passed) {
    try {
      await credentialRuntime.issue(actor, journey, step, `${baseKey}:credentials`);
    } catch (error) {
      console.error("QUICK_CHECK_CREDENTIAL_ISSUANCE_FAILED", {
        journey_instance_id: journey,
        step_instance_id: step,
        error_name: error instanceof Error ? error.name : "unknown",
      });
    }

    let activityCompleted = false;
    try {
      const completion = await completeParticipantActivity({
        actorUserAccountId: actor,
        stepInstanceId: step,
        idempotencyKey: `${baseKey}:complete-after-assessment`,
      });
      activityCompleted = completion.status === "completed";
    } catch (error) {
      console.error("QUICK_CHECK_POST_COMPLETION_FAILED", {
        journey_instance_id: journey,
        step_instance_id: step,
        error_name: error instanceof Error ? error.name : "unknown",
      });
    }

    if (activityCompleted) redirect(`/empreendedor/jornada/${journey}?conclusao=ok`);
    redirect(activityHref(journey, step, "&avaliacao=aprovada", "avaliacao"));
  }

  redirect(activityHref(journey, step, "&avaliacao=reprovada", "avaliacao"));
}
