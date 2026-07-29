"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publishAdminJourneyVersion } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }

export async function publishJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  const journeyVersionId = text(formData, "journey_version_id");
  const expectedContentHash = text(formData, "content_hash");
  const back = `/admin/produto?etapa=publicacao&versao=${journeyVersionId}`;
  if (!organization?.permissions.includes("journey.definition.publish")) redirect(`${back}&erro=sem_permissao`);
  if (!journeyVersionId || !expectedContentHash) redirect(`${back}&erro=campos_incompletos`);

  try {
    await publishAdminJourneyVersion({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, journeyVersionId, expectedContentHash, idempotencyKey: randomUUID() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const reason = message.includes("FORBIDDEN") ? "sem_permissao" : message.includes("CONTENT_HASH_CONFLICT") ? "conteudo_alterado" : message.includes("INCOMPLETE") || message.includes("REQUIRED") || message.includes("INVALID") ? "jornada_incompleta" : "falha_publicacao";
    redirect(`${back}&erro=${reason}`);
  }
  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect(`/admin/produto?etapa=publicacao&versao=${journeyVersionId}&sucesso=jornada_publicada`);
}
