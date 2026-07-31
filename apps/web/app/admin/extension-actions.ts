"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

const reserved = new Set(["resource_type", "return_to", "json_fields", "array_fields", "boolean_fields", "idempotency_key"]);

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

function safeAdminReturn(value: string) {
  return value.startsWith("/admin/") || value === "/admin" ? value : "/admin";
}

function errorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "EXTENSION_SAVE_FAILED";
  const code = raw.split(":", 1)[0]?.trim() || "EXTENSION_SAVE_FAILED";
  return /^[A-Z0-9_]+$/u.test(code) ? code : "EXTENSION_SAVE_FAILED";
}

async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  }
  const organization = administrativeOrganization(auth.identity);
  if (!organization) redirect("/admin?erro=organizacao_indisponivel");
  return { actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id };
}

export async function saveExtensionAction(formData: FormData) {
  const { actorUserAccountId, organizationId } = await authorize();
  const resourceType = text(formData, "resource_type");
  const returnTo = safeAdminReturn(text(formData, "return_to"));
  if (!resourceType) redirect(`${returnTo}?erro=tipo_obrigatorio`);

  try {
    await extensionsRuntime.saveAdmin({
      actorUserAccountId,
      organizationId,
      resourceType,
      payload: payloadFromForm(formData),
      idempotencyKey: text(formData, "idempotency_key") || randomUUID(),
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/empreendedor", "layout");
    redirect(`${returnTo}?sucesso=${encodeURIComponent(resourceType)}`);
  } catch (error) {
    redirect(`${returnTo}?erro=${encodeURIComponent(errorCode(error))}`);
  }
}
