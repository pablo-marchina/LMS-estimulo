"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminJourneyDraftFromVersion } from "@/lib/admin/journey-editor";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createEditableJourneyVersionAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect("/admin/produto?erro=sem_permissao");
  }

  const sourceJourneyVersionId = text(formData, "source_journey_version_id");
  if (!sourceJourneyVersionId) redirect("/admin/produto?etapa=jornada&erro=versao_obrigatoria");

  try {
    const result = await createAdminJourneyDraftFromVersion({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      sourceJourneyVersionId,
      idempotencyKey: randomUUID(),
    });
    redirect(`/admin/produto?etapa=jornada&versao=${result.journey_version_id}&sucesso=versao_editavel_criada`);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_clone";
    redirect(`/admin/produto?etapa=jornada&versao=${sourceJourneyVersionId}&erro=${reason}`);
  }
}
