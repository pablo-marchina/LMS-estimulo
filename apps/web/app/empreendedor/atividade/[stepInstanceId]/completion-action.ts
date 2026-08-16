"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { assertParticipantMutationAllowed } from "@/lib/auth/participant-context";
import { completeParticipantActivity } from "@/lib/journey-runtime/completion-runtime";

const uuid = z.string().uuid();

export async function completeParticipantActivityAction(formData: FormData) {
  await assertParticipantMutationAllowed();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");

  const journey = uuid.parse(formData.get("journey_instance_id"));
  const step = uuid.parse(formData.get("step_instance_id"));
  const key = String(formData.get("idempotency_key") || randomUUID());

  try {
    await completeParticipantActivity({
      actorUserAccountId: auth.identity.user_account_id,
      stepInstanceId: step,
      idempotencyKey: key,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.includes("REQUIRED_CONTENT_INCOMPLETE")
      ? "conteudo_pendente"
      : message.includes("ASSESSMENT_NOT_PASSED")
        ? "avaliacao_pendente"
        : message.includes("PRACTICE_COMPLETION_MANAGED_BY_REVIEW")
          ? "pratica_pendente"
          : "falha";
    redirect(`/empreendedor/jornada/${journey}?conteudo=${step}&conclusao=${code}#concluir-aula`);
  }

  redirect(`/empreendedor/jornada/${journey}?conteudo=${step}&conclusao=ok#concluir-aula`);
}
