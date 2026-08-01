"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publishAdminJourney } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function publishJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.publish")) redirect("/admin/produto?erro=sem_permissao");

  const journeyId = text(formData, "journey_id") || text(formData, "journey_version_id");
  let publishedId = journeyId;
  try {
    const result = await publishAdminJourney({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      journeyVersionId: journeyId,
      contentHash: text(formData, "content_hash"),
      idempotencyKey: randomUUID(),
    });
    publishedId = result.journey_version_id;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const reason = raw.includes("FORBIDDEN") ? "sem_permissao" : raw.includes("PATH_GRAPH)" ? "grafo_invalido" : raw.includes("STALE_REVISION") ? "conteudo_desatualizado" : "falha_publicacao";
    redirect(`/admin/produto?etapa=publicacao&jornada=${journeyId}&erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect(`/admin/produto?etapa=publicacao&jornada=${publishedId}&sucesso=jornada_publicada`);
}
