"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { saveAdminProductResource } from "@/lib/admin/product-management";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function json(formData: FormData, name: string, fallback: unknown) {
  const value = text(formData, name);
  return value ? JSON.parse(value) as unknown : fallback;
}

export async function saveDiagnosticAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) redirect(`/admin/diagnostico?organization=${organizationId}&erro=sem_permissao`);

  let payload: Record<string, unknown>;
  try {
    payload = {
      definition_id: nullable(formData, "definition_id"),
      version_id: nullable(formData, "version_id"),
      code: text(formData, "code"),
      name: text(formData, "name"),
      purpose: text(formData, "purpose"),
      configuration: json(formData, "configuration", {}),
      dimensions: json(formData, "dimensions", []),
      items: json(formData, "items", []),
      archetypes: json(formData, "archetypes", []),
    };
  } catch {
    redirect(`/admin/diagnostico?organization=${organizationId}&erro=json_invalido`);
  }

  try {
    await saveAdminProductResource({ actorUserAccountId: auth.identity.user_account_id, organizationId, resourceType: "diagnostic", payload, idempotencyKey: randomUUID() });
  } catch {
    redirect(`/admin/diagnostico?organization=${organizationId}&erro=falha`);
  }
  redirect(`/admin/diagnostico?organization=${organizationId}&sucesso=salvo`);
}
