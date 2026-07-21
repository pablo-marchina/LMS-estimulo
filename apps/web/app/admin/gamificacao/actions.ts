"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { saveAdminProductResource } from "@/lib/admin/product-management";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function json(formData: FormData, name: string, fallback: unknown) { const value = text(formData, name); return value ? JSON.parse(value) as unknown : fallback; }

export async function saveGamificationResourceAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("engagement.manage")) redirect(`/admin/gamificacao?organization=${organizationId}&erro=sem_permissao`);
  const resourceType = text(formData, "resource_type") as "point_rule" | "badge" | "certificate";
  let payload: Record<string, unknown>;

  try {
    if (resourceType === "point_rule") {
      payload = { definition_id: nullable(formData, "definition_id"), code: text(formData, "code"), name: text(formData, "name"), amount: Number(text(formData, "amount")), eligibility_rule_version_id: text(formData, "eligibility_rule_version_id"), recurrence_policy: json(formData, "recurrence_policy", {}), status: text(formData, "status") || "draft" };
    } else if (resourceType === "badge") {
      payload = { definition_id: nullable(formData, "definition_id"), code: text(formData, "code"), name: text(formData, "name"), title: text(formData, "title"), description: text(formData, "description"), criteria_rule_version_id: text(formData, "criteria_rule_version_id"), status: text(formData, "status") || "draft" };
    } else if (resourceType === "certificate") {
      payload = { definition_id: nullable(formData, "definition_id"), code: text(formData, "code"), name: text(formData, "name"), journey_version_id: text(formData, "journey_version_id"), requirements_rule_version_id: text(formData, "requirements_rule_version_id"), validity_policy: json(formData, "validity_policy", {}), status: text(formData, "status") || "draft" };
    } else {
      redirect(`/admin/gamificacao?organization=${organizationId}&erro=tipo_invalido`);
    }
  } catch {
    redirect(`/admin/gamificacao?organization=${organizationId}&erro=json_invalido`);
  }

  try {
    await saveAdminProductResource({ actorUserAccountId: auth.identity.user_account_id, organizationId, resourceType, payload, idempotencyKey: randomUUID() });
  } catch {
    redirect(`/admin/gamificacao?organization=${organizationId}&erro=falha`);
  }
  redirect(`/admin/gamificacao?organization=${organizationId}&sucesso=salvo`);
}
