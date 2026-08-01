"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unpublishAdminJourneyToDraft } from "@/lib/admin/product-lifecycle";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function unpublishJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.publish")) redirect("/admin/produto?erro=sem_permissao");
  if (text(formData, "confirm_unpublish") !== "true") redirect("/admin/produto?erro=confirmacao_obrigatoria");

  const journeyId = text(formData, "journey_id") || text(formData, "journey_version_id");
  let draftJourneyId = journeyId;
  try {
    const result = await unpublishAdminJourneyToDraft({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      journeyVersionId: journeyId,
      idempotencyKey: randomUUID(),
    });
    draftJourneyId = result.journey_version_id;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const reason = raw.includes("FORBIDDEN") ? "sem_permissao" : raw.includes("NOT_FOUND") ? "publicacao_nao_encontrada" : "falha_voltar_rascunho";
    redirect(`/admin/produto?erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect(`/admin/produto?etapa=geral&versao=${draftJourneyId}&sucesso=jornada_em_rascunho`);
}
