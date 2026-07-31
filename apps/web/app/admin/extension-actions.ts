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

function checkbox(formData: FormData, name: string) {
  const value = text(formData, name).toLowerCase();
  return ["on", "true", "1", "yes"].includes(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 80);
}

function payloadFromForm(formData: FormData): JsonRecord {
  const resourceType = text(formData, "resource_type");
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

  if (resourceType === "tracking_link") {
    payload.skip_steps = {
      profile: checkbox(formData, "skip_profile"),
      onboarding: checkbox(formData, "skip_onboarding"),
      diagnostic: checkbox(formData, "skip_diagnostic"),
      home: checkbox(formData, "skip_home"),
    };
    delete payload.skip_profile;
    delete payload.skip_onboarding;
    delete payload.skip_diagnostic;
    delete payload.skip_home;
  }

  if (resourceType === "platform_settings") {
    const linkLabel = String(payload.institutional_link_label ?? "").trim();
    const linkUrl = String(payload.institutional_link_url ?? "").trim();
    if (linkLabel && linkUrl) payload.institutional_links = [{ label: linkLabel, url: linkUrl }];
    delete payload.institutional_link_label;
    delete payload.institutional_link_url;
  }

  if (resourceType === "optional_diagnostic") {
    const audienceType = String(payload.audience_type ?? "all") === "users" ? "users" : "all";
    const userIds = Array.isArray(payload.audience_user_ids) ? payload.audience_user_ids : [];
    payload.audience = audienceType === "users" ? { type: "users", user_ids: userIds } : { type: "all" };
    delete payload.audience_type;
    delete payload.audience_user_ids;
  }

  if (resourceType === "reward") {
    payload.code = String(payload.code || slugify(payload.name));
    payload.fulfillment_configuration = {
      instructions: String(payload.fulfillment_instructions ?? "").trim(),
      requires_address: payload.requires_address === true,
      requires_code: payload.requires_code === true,
      requires_scheduling: payload.requires_scheduling === true,
      requires_tracking: payload.requires_tracking === true,
    };
    delete payload.fulfillment_instructions;
    delete payload.requires_address;
    delete payload.requires_code;
    delete payload.requires_scheduling;
    delete payload.requires_tracking;
  }

  if (resourceType === "redemption_status") {
    payload.fulfillment_details = {
      note: String(payload.delivery_note ?? "").trim(),
      code: String(payload.delivery_code ?? "").trim(),
      tracking: String(payload.delivery_tracking ?? "").trim(),
      proof_url: String(payload.delivery_proof_url ?? "").trim(),
    };
    delete payload.delivery_note;
    delete payload.delivery_code;
    delete payload.delivery_tracking;
    delete payload.delivery_proof_url;
  }

  if (resourceType === "delivery_configuration") {
    const maxFileSizeMb = numberValue(payload.max_file_size_mb, 25);
    payload.max_file_size_bytes = Math.max(1, Math.round(maxFileSizeMb * 1024 * 1024));
    payload.rubric = {
      criteria: [{
        code: "qualidade",
        name: String(payload.rubric_name || "Qualidade da entrega"),
        weight: 1,
        description: String(payload.rubric_description || "Avalie se a entrega atende ao que foi solicitado."),
      }],
    };
    const references = String(payload.reference_material_text ?? "").split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
    payload.reference_material = references;
    payload.points_configuration = {
      on_submit: numberValue(payload.points_on_submit),
      on_approve: numberValue(payload.points_on_approve),
      proportional_to_score: payload.points_proportional === true,
      max_points: numberValue(payload.max_points),
    };
    delete payload.max_file_size_mb;
    delete payload.rubric_name;
    delete payload.rubric_description;
    delete payload.reference_material_text;
    delete payload.points_on_submit;
    delete payload.points_on_approve;
    delete payload.points_proportional;
    delete payload.max_points;
  }

  if ((resourceType === "theme" || resourceType === "b2b_group") && !payload.code && payload.name) {
    payload.code = slugify(payload.name);
  }

  for (const field of booleanFields) {
    if (!(field in payload)) payload[field] = false;
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
