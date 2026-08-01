"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

const reserved = new Set(["resource_type", "return_to", "json_fields", "array_fields", "boolean_fields", "idempotency_key"]);
function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function names(formData: FormData, name: string) { return new Set(text(formData, name).split(",").map((value) => value.trim()).filter(Boolean)); }
function parseJson(raw: string, fallback: unknown) { if (!raw) return fallback; try { return JSON.parse(raw) as unknown; } catch { return fallback; } }
function checkbox(formData: FormData, name: string) { const value = text(formData, name).toLowerCase(); return ["on", "true", "1", "yes"].includes(value); }
function numeric(formData: FormData, name: string, fallback = 0) { const parsed = Number(text(formData, name)); return Number.isFinite(parsed) ? parsed : fallback; }
function lines(formData: FormData, name: string) { return text(formData, name).split("\n").map((value) => value.trim()).filter(Boolean); }
function deleteKeys(payload: JsonRecord, keys: string[]) { for (const key of keys) delete payload[key]; }

function payloadFromForm(formData: FormData): JsonRecord {
  const jsonFields = names(formData, "json_fields");
  const arrayFields = names(formData, "array_fields");
  const booleanFields = names(formData, "boolean_fields");
  const payload: JsonRecord = {};
  const fieldNames = new Set<string>();
  for (const key of formData.keys()) if (!reserved.has(key)) fieldNames.add(key);
  for (const key of fieldNames) {
    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    if (arrayFields.has(key)) { payload[key] = values.map((value) => value.trim()).filter(Boolean); continue; }
    const value = values.at(-1)?.trim() ?? "";
    if (jsonFields.has(key)) { payload[key] = parseJson(value, value.trim().startsWith("[") ? [] : {}); continue; }
    if (booleanFields.has(key)) { payload[key] = ["on", "true", "1", "yes"].includes(value.toLowerCase()); continue; }
    payload[key] = value;
  }
  const resourceType = text(formData, "resource_type");
  if (resourceType === "tracking_link") {
    payload.skip_steps = { profile: checkbox(formData, "skip_profile"), onboarding: checkbox(formData, "skip_onboarding"), diagnostic: checkbox(formData, "skip_diagnostic"), home: checkbox(formData, "skip_home") };
    deleteKeys(payload, ["skip_profile", "skip_onboarding", "skip_diagnostic", "skip_home"]);
  }
  if (resourceType === "delivery_configuration") {
    const criteria = [0, 1, 2, 3].map((index) => ({ code: `criterio_${index + 1}`, name: text(formData, `criterion_name_${index}`), description: text(formData, `criterion_description_${index}`), weight: Math.max(1, numeric(formData, `criterion_weight_${index}`, 1)) })).filter((criterion) => criterion.name);
    payload.rubric = { criteria: criteria.length ? criteria : [{ code: "qualidade", name: "Qualidade da resposta", description: "Avalie se a resposta atende ao que foi solicitado.", weight: 1 }], scale: { minimum: 0, maximum: 100 }, passing_score: numeric(formData, "passing_score", 0) };
    payload.reference_material = lines(formData, "reference_material_text").map((content, index) => ({ title: `Referência ${index + 1}`, content }));
    payload.points_configuration = { on_submit: Math.max(0, numeric(formData, "points_on_submit", 0)), on_approve: Math.max(0, numeric(formData, "points_on_approve", 0)), proportional_to_score: checkbox(formData, "points_proportional"), max_points: Math.max(0, numeric(formData, "points_maximum", 0)) };
    payload.max_file_size_bytes = Math.round(Math.max(1, numeric(formData, "max_file_size_mb", 25)) * 1024 * 1024);
    deleteKeys(payload, ["reference_material_text", "points_on_submit", "points_on_approve", "points_proportional", "points_maximum", "max_file_size_mb", ...[0, 1, 2, 3].flatMap((index) => [`criterion_name_${index}`, `criterion_description_${index}`, `criterion_weight_${index}`])]);
  }
  if (resourceType === "reward") {
    const fields = [checkbox(formData, "request_address") ? { key: "address", label: "Endereço para entrega", required: true } : null, checkbox(formData, "request_email") ? { key: "email", label: "E-mail para recebimento", required: true } : null, checkbox(formData, "request_phone") ? { key: "phone", label: "Telefone para contato", required: true } : null].filter(Boolean);
    payload.fulfillment_configuration = { instructions: text(formData, "delivery_instructions"), fields };
    deleteKeys(payload, ["request_address", "request_email", "request_phone", "delivery_instructions"]);
  }
  if (resourceType === "redemption_status") {
    payload.fulfillment_details = Object.fromEntries([["code", text(formData, "delivery_code")], ["link", text(formData, "delivery_link")], ["tracking", text(formData, "delivery_tracking")], ["instructions", text(formData, "delivery_notes")]].filter(([, value]) => value));
    deleteKeys(payload, ["delivery_code", "delivery_link", "delivery_tracking", "delivery_notes"]);
  }
  for (const field of booleanFields) if (!(field in payload)) payload[field] = false;
  return payload;
}

function safeAdminReturn(value: string) { return value.startsWith("/admin/") || value === "/admin" ? value : "/admin"; }
function errorCode(error: unknown) {
  const coded = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (/^[A-Z][A-Z0-9_]{2,127}$/u.test(coded)) return coded;
  const raw = error instanceof Error ? error.message : "EXTENSION_SAVE_FAILED";
  const semantic = raw.match(/\b([A-Z][A-Z0-9_]{2,127})\b/u)?.[1] ?? "";
  return semantic || "EXTENSION_SAVE_FAILED";
}
async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization) redirect("/admin?erro=organizacao_indisponivel");
  return { actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id };
}
export async function saveExtensionAction(formData: FormData) {
  const { actorUserAccountId, organizationId } = await authorize();
  const resourceType = text(formData, "resource_type");
  const returnTo = safeAdminReturn(text(formData, "return_to"));
  if (!resourceType) redirect(`${returnTo}?erro=tipo_obrigatorio`);

  let failureCode: string | null = null;
  try {
    await extensionsRuntime.saveAdmin({ actorUserAccountId, organizationId, resourceType, payload: payloadFromForm(formData), idempotencyKey: text(formData, "idempotency_key") || randomUUID() });
  } catch (error) {
    failureCode = errorCode(error);
  }

  if (failureCode) redirect(`${returnTo}?erro=${encodeURIComponent(failureCode)}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/empreendedor", "layout");
  redirect(`${returnTo}?sucesso=${encodeURIComponent(resourceType)}`);
}
