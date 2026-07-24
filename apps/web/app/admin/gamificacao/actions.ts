"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { getAdminProductWorkspace, saveAdminProductResource } from "@/lib/admin/product-management";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullable(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function deriveCode(source: string, fallback: string) {
  const slug = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback;
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function recurrencePolicy(formData: FormData): Record<string, unknown> {
  const frequency = text(formData, "frequency") || "once";
  const maximum = positiveInteger(text(formData, "maximum_awards"), 1);
  const scope: Record<string, string> = {
    once: "participant",
    per_activity: "enrollment_activity",
    per_assessment: "enrollment_assessment",
    daily: "participant_day",
    weekly: "participant_week",
    unlimited: "event",
  };
  return {
    scope: scope[frequency] ?? "participant",
    ...(frequency === "unlimited" ? {} : { maximum }),
    transferable: false,
  };
}

function validityPolicy(formData: FormData): Record<string, unknown> {
  const mode = text(formData, "validity_mode") || "never";
  if (mode === "months") {
    return { expires: true, duration_months: positiveInteger(text(formData, "validity_months"), 12) };
  }
  return { expires: false };
}

export async function saveGamificationResourceAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("engagement.manage")) redirect(`/admin/gamificacao?organization=${organizationId}&erro=sem_permissao`);
  const resourceType = text(formData, "resource_type") as "point_rule" | "badge" | "certificate";
  const definitionId = nullable(formData, "definition_id");
  const workspace = definitionId
    ? await getAdminProductWorkspace(auth.identity.user_account_id, organizationId).catch(() => null)
    : null;
  let payload: Record<string, unknown>;

  if (resourceType === "point_rule") {
    const name = text(formData, "name");
    const existing = workspace?.point_rules.find((item) => item.definition_id === definitionId);
    payload = {
      definition_id: definitionId,
      code: existing?.code ?? deriveCode(name, `pontos_${randomUUID().slice(0, 8)}`),
      name,
      amount: Number(text(formData, "amount")),
      eligibility_rule_version_id: text(formData, "eligibility_rule_version_id"),
      recurrence_policy: recurrencePolicy(formData),
      status: text(formData, "status") || "draft",
    };
  } else if (resourceType === "badge") {
    const title = text(formData, "title");
    const name = text(formData, "name") || title;
    const existing = workspace?.badges.find((item) => item.definition_id === definitionId);
    payload = {
      definition_id: definitionId,
      code: existing?.code ?? deriveCode(name, `selo_${randomUUID().slice(0, 8)}`),
      name,
      title,
      description: text(formData, "description"),
      criteria_rule_version_id: text(formData, "criteria_rule_version_id"),
      status: text(formData, "status") || "draft",
    };
  } else if (resourceType === "certificate") {
    const name = text(formData, "name");
    const existing = workspace?.certificates.find((item) => item.definition_id === definitionId);
    payload = {
      definition_id: definitionId,
      code: existing?.code ?? deriveCode(name, `certificado_${randomUUID().slice(0, 8)}`),
      name,
      journey_version_id: text(formData, "journey_version_id"),
      requirements_rule_version_id: text(formData, "requirements_rule_version_id"),
      validity_policy: validityPolicy(formData),
      status: text(formData, "status") || "draft",
    };
  } else {
    redirect(`/admin/gamificacao?organization=${organizationId}&erro=tipo_invalido`);
  }

  try {
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType,
      payload,
      idempotencyKey: randomUUID(),
    });
  } catch {
    redirect(`/admin/gamificacao?organization=${organizationId}&erro=falha`);
  }
  redirect(`/admin/gamificacao?organization=${organizationId}&sucesso=salvo`);
}
