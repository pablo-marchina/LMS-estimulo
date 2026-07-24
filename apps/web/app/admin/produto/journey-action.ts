"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { saveAdminProductResource } from "@/lib/admin/product-management";

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

function configuration(formData: FormData) {
  const raw = text(formData, "configuration_snapshot");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect(`/admin/produto?organization=${organizationId}&erro=sem_permissao`);
  }

  const name = text(formData, "name");
  const existingCode = text(formData, "definition_code");
  const code = existingCode || deriveCode(name, `jornada_${randomUUID().slice(0, 8)}`);
  const versionId = nullable(formData, "version_id");
  let savedVersionId = versionId ?? "";

  try {
    const result = await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "journey",
      payload: {
        definition_id: nullable(formData, "definition_id"),
        version_id: versionId,
        program_id: nullable(formData, "program_id"),
        code,
        slug: deriveCode(name, code).replaceAll("_", "-"),
        name,
        purpose: text(formData, "purpose"),
        title: text(formData, "title") || name,
        description: text(formData, "description"),
        configuration: configuration(formData),
        eligible_archetype_codes: formData.getAll("eligible_archetype_codes").map(String),
      },
      idempotencyKey: randomUUID(),
    });
    savedVersionId = String(result.version_id ?? savedVersionId);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?organization=${organizationId}&versao=${versionId ?? ""}&erro=${reason}`);
  }

  redirect(`/admin/produto?organization=${organizationId}&versao=${savedVersionId}&sucesso=jornada_salva`);
}
