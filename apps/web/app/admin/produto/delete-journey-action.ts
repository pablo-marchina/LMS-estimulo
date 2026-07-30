"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { retireAdminJourney } from "@/lib/admin/product-lifecycle";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function deleteJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) redirect("/admin/produto?erro=sem_permissao");
  if (text(formData, "confirm_delete") !== "true") redirect("/admin/produto?erro=confirmacao_obrigatoria");

  const journeyDefinitionId = text(formData, "journey_definition_id");
  try {
    await retireAdminJourney({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      journeyDefinitionId,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_excluir";
    redirect(`/admin/produto?erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect("/admin/produto?sucesso=jornada_excluida");
}
