"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

function safeUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^[0-9a-f-]{36}$/iu.test(text)) throw new Error("UUID_INVALID");
  return text;
}

export async function startOptionalDiagnosticAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const availabilityId = safeUuid(formData.get("availability_id"));
  let sessionId: string | null = null;
  let failure: string | null = null;
  try {
    const result = await extensionsRuntime.performParticipant({
      actorUserAccountId: auth.identity.user_account_id,
      action: "optional_start",
      payload: { availability_id: availabilityId },
      idempotencyKey: randomUUID(),
    });
    sessionId = typeof result.session_id === "string" ? result.session_id : null;
  } catch (error) {
    failure = error instanceof Error ? error.message.split(":",1)[0] : "OPTIONAL_START_FAILED";
  }
  if (failure || !sessionId) redirect(`/empreendedor/perfil/diagnosticos/${availabilityId}?erro=${encodeURIComponent(failure ?? "OPTIONAL_START_FAILED")}`);
  redirect(`/empreendedor/perfil/diagnosticos/${availabilityId}?sessao=${encodeURIComponent(sessionId)}`);
}

export async function completeOptionalDiagnosticAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const availabilityId = safeUuid(formData.get("availability_id"));
  const sessionId = safeUuid(formData.get("session_id"));
  const questionIds = String(formData.get("question_ids") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  let failure: string | null = null;
  try {
    for (const itemId of questionIds) {
      const optionId = String(formData.get(`question_${itemId}`) ?? "").trim();
      const textValue = String(formData.get(`text_${itemId}`) ?? "").trim();
      await extensionsRuntime.performParticipant({
        actorUserAccountId: auth.identity.user_account_id,
        action: "optional_answer",
        payload: { session_id: sessionId, item_id: itemId, item_option_id: optionId, text_value: textValue },
        idempotencyKey: `optional-answer:${sessionId}:${itemId}:${randomUUID()}`,
      });
    }
    await extensionsRuntime.performParticipant({
      actorUserAccountId: auth.identity.user_account_id,
      action: "optional_complete",
      payload: { session_id: sessionId },
      idempotencyKey: `optional-complete:${sessionId}`,
    });
    revalidatePath("/empreendedor/perfil");
  } catch (error) {
    failure = error instanceof Error ? error.message.split(":",1)[0] : "OPTIONAL_COMPLETE_FAILED";
  }
  if (failure) redirect(`/empreendedor/perfil/diagnosticos/${availabilityId}?sessao=${sessionId}&erro=${encodeURIComponent(failure)}`);
  redirect("/empreendedor/perfil?diagnostico=concluido");
}
