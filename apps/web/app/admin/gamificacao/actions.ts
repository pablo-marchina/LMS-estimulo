"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAdminProductWorkspace, saveAdminProductResource } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function deriveCode(source: string, fallback: string) { const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback; }
function positiveInteger(value: string, fallback: number) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function boundedRatio(value: string, fallback: number) { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? Math.min(.8, Math.max(.15, parsed / 100)) : fallback; }
function recurrencePolicy(formData: FormData): Record<string, unknown> {
  const frequency = text(formData, "frequency") || "once";
  const maximum = positiveInteger(text(formData, "maximum_awards"), 1);
  const scope: Record<string, string> = { once: "participant", per_activity: "enrollment_activity", per_assessment: "enrollment_assessment", per_path: "path", per_journey: "journey", daily: "participant_day", weekly: "participant_week", unlimited: "event" };
  const eventName = text(formData, "trigger_event");
  if (!eventName) throw new Error("POINT_TRIGGER_REQUIRED");
  return { scope: scope[frequency] ?? "participant", ...(frequency === "unlimited" ? {} : { maximum }), transferable: false, trigger: { event_name: eventName } };
}
function validityPolicy(formData: FormData): Record<string, unknown> { return text(formData, "validity_mode") === "months" ? { expires: true, duration_months: positiveInteger(text(formData, "validity_months"), 12) } : { expires: false }; }

export async function saveGamificationResourceAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("engagement.manage")) redirect("/admin/gamificacao?erro=sem_permissao");
  const organizationId = organization.organization_id;
  const resourceType = text(formData, "resource_type") as "point_rule" | "badge" | "certificate";
  const typeQuery = resourceType === "badge" ? "selos" : resourceType === "certificate" ? "certificados" : "pontos";
  const definitionId = nullable(formData, "definition_id");
  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organizationId).catch(() => null);
  let payload: Record<string, unknown>;
  let requestedCertificateStatus = "draft";

  if (resourceType === "point_rule") {
    const name = text(formData, "name"); const existing = workspace?.point_rules.find((item) => item.definition_id === definitionId);
    payload = { definition_id: definitionId, code: existing?.code ?? deriveCode(name, `pontos_${randomUUID().slice(0,8)}`), name, amount: Number(text(formData, "amount")), eligibility_rule_version_id: text(formData, "eligibility_rule_version_id"), recurrence_policy: recurrencePolicy(formData), status: text(formData, "status") || "draft" };
  } else if (resourceType === "badge") {
    const title = text(formData, "title"); const name = text(formData, "name") || title; const existing = workspace?.badges.find((item) => item.definition_id === definitionId);
    payload = { definition_id: definitionId, code: existing?.code ?? deriveCode(name, `selo_${randomUUID().slice(0,8)}`), name, title, description: text(formData, "description"), criteria_rule_version_id: text(formData, "criteria_rule_version_id"), status: text(formData, "status") || "draft" };
  } else if (resourceType === "certificate") {
    const name = text(formData, "name"); const existing = workspace?.certificates.find((item) => item.definition_id === definitionId); requestedCertificateStatus = text(formData, "status") || "draft";
    payload = { definition_id: definitionId, code: existing?.code ?? deriveCode(name, `certificado_${randomUUID().slice(0,8)}`), name, journey_version_id: text(formData, "journey_version_id"), requirements_rule_version_id: text(formData, "requirements_rule_version_id"), validity_policy: validityPolicy(formData), status: "draft" };
  } else redirect("/admin/gamificacao?erro=tipo_invalido");

  try {
    const result = await saveAdminProductResource({ actorUserAccountId: auth.identity.user_account_id, organizationId, resourceType, payload, idempotencyKey: randomUUID() });
    if (resourceType === "certificate") {
      const certificateVersionId = String(result.version_id ?? "");
      if (!certificateVersionId) throw new Error("CERTIFICATE_VERSION_NOT_RETURNED");
      await extendedCredentialRuntime.configureCertificate({ actorUserAccountId: auth.identity.user_account_id, organizationId, certificateVersionId, templateFileObjectId: nullable(formData, "template_file_object_id"), templateLayout: { name_y: boundedRatio(text(formData, "name_y_percent"), .53), journey_y: boundedRatio(text(formData, "journey_y_percent"), .40), text_color: ["primary","white"].includes(text(formData, "text_color")) ? text(formData, "text_color") : "primary" }, idempotencyKey: randomUUID() });
      if (requestedCertificateStatus === "published") await extendedCredentialRuntime.publishCertificate({ actorUserAccountId: auth.identity.user_account_id, organizationId, certificateVersionId, idempotencyKey: randomUUID() });
    }
  } catch { redirect(`/admin/gamificacao?tipo=${typeQuery}&erro=falha`); }
  redirect(`/admin/gamificacao?tipo=${typeQuery}&sucesso=salvo`);
}
