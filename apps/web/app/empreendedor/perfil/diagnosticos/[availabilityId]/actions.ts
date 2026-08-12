"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertParticipantMutationAllowed, requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

const uuidSchema = z.string().uuid();
const optionalAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  itemId: z.string().uuid(),
  optionId: z.string().uuid().nullable().optional(),
  textValue: z.string().trim().max(4000).optional().default(""),
});

function safeUuid(value: FormDataEntryValue | null) {
  return uuidSchema.parse(String(value ?? "").trim());
}

export async function startOptionalDiagnosticAction(formData: FormData) {
  await assertParticipantMutationAllowed();
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

export async function saveOptionalDiagnosticAnswerAction(input: z.infer<typeof optionalAnswerSchema>) {
  await assertParticipantMutationAllowed();
  const parsed = optionalAnswerSchema.parse(input);
  if (!parsed.optionId && !parsed.textValue) throw new Error("OPTIONAL_ANSWER_REQUIRED");
  const auth = await requireParticipantContext();
  await extensionsRuntime.performParticipant({
    actorUserAccountId: auth.identity.user_account_id,
    action: "optional_answer",
    payload: {
      session_id: parsed.sessionId,
      item_id: parsed.itemId,
      item_option_id: parsed.optionId ?? "",
      text_value: parsed.textValue,
    },
    idempotencyKey: `optional-answer:${parsed.sessionId}:${parsed.itemId}:${randomUUID()}`,
  });
  return { ok: true as const };
}

export async function completeOptionalDiagnosticAction(formData: FormData) {
  await assertParticipantMutationAllowed();
  const auth = await requireParticipantContext();
  const availabilityId = safeUuid(formData.get("availability_id"));
  const sessionId = safeUuid(formData.get("session_id"));
  const questionIds = String(formData.get("question_ids") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  let failure: string | null = null;
  try {
    for (const itemId of questionIds) {
      const optionId = String(formData.get(`question_${itemId}`) ?? "").trim();
      const textValue = String(formData.get(`text_${itemId}`) ?? "").trim();
      if (!optionId && !textValue) continue;
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
  redirect("/empreendedor/perfil/diagnostico?diagnostico=concluido");
}
