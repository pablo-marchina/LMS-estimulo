"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { saveAdminPathBadge } from "@/lib/admin/journey-editor";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function savePathBadgeAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect("/admin/produto?erro=sem_permissao");
  }

  const journeyVersionId = text(formData, "journey_version_id");
  const pathTemplateId = text(formData, "path_template_id");
  const back = `/admin/produto?etapa=trilhas&versao=${journeyVersionId}`;
  if (!journeyVersionId || !pathTemplateId) redirect(`${back}&erro=campos_incompletos`);

  try {
    await saveAdminPathBadge({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      pathTemplateId,
      title: text(formData, "badge_title"),
      description: text(formData, "badge_description"),
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`${back}&erro=${reason}`);
  }

  redirect(`${back}&sucesso=selo_salvo`);
}
