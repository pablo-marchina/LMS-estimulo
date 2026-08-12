"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

const reserved = new Set(["action_type", "return_to", "json_fields", "array_fields", "boolean_fields", "idempotency_key"]);

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function names(formData: FormData, name: string) {
  return new Set(text(formData, name).split(",").map((value) => value.trim()).filter(Boolean));
}

function parseJson(raw: string, fallback: unknown) {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as unknown; } catch { return fallback; }
}

function payloadFromForm(formData: FormData): JsonRecord {
  const jsonFields = names(formData, "json_fields");
  const arrayFields = names(formData, "array_fields");
  const booleanFields = names(formData, "boolean_fields");
  const payload: JsonRecord = {};
  const fieldNames = new Set<string>();
  for (const key of formData.keys()) if (!reserved.has(key)) fieldNames.add(key);

  for (const key of fieldNames) {
    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    if (arrayFields.has(key)) {
      payload[key] = values.map((value) => value.trim()).filter(Boolean);
      continue;
    }
    const value = values.at(-1)?.trim() ?? "";
    if (jsonFields.has(key)) {
      payload[key] = parseJson(value, value.trim().startsWith("[") ? [] : {});
      continue;
    }
    if (booleanFields.has(key)) {
      payload[key] = ["on", "true", "1", "yes"].includes(value.toLowerCase());
      continue;
    }
    payload[key] = value;
  }
  return payload;
}

function safeReturn(value: string) {
  return value.startsWith("/empreendedor/") || value === "/empreendedor" ? value : "/empreendedor";
}

function errorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "EXTENSION_ACTION_FAILED";
  const code = raw.split(":", 1)[0]?.trim() || "EXTENSION_ACTION_FAILED";
  return /^[A-Z0-9_]+$/u.test(code) ? code : "EXTENSION_ACTION_FAILED";
}

export async function performExtensionAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const action = text(formData, "action_type");
  const returnTo = safeReturn(text(formData, "return_to"));
  if (!action) redirect(`${returnTo}?erro=acao_obrigatoria`);

  let destination: string;
  try {
    await extensionsRuntime.performParticipant({
      actorUserAccountId: auth.identity.user_account_id,
      action,
      payload: payloadFromForm(formData),
      idempotencyKey: text(formData, "idempotency_key") || randomUUID(),
    });
    revalidatePath("/empreendedor", "layout");
    revalidatePath("/admin", "layout");
    destination = `${returnTo}?sucesso=${encodeURIComponent(action)}`;
  } catch (error) {
    destination = `${returnTo}?erro=${encodeURIComponent(errorCode(error))}`;
  }

  redirect(destination);
}
