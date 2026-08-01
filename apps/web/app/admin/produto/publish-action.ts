"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publishAdminJourneyVersion } from "@/lib/admin/product-management";
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
  const contentHash = text(formData, "content_hash");
  const back = `/admin/produto?etapa=publicacao&versao=${journeyId}`;
  if (!journeyId || !contentHash) redirect(`${back}&erro=campos_incompletos`);

  try {
    await publishAdminJourneyVersion({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      journeyVersionId: journeyId,
      expectedContentHash: contentHash,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const reason = raw.includes("FORBIDDEN")
      ? "sem_permissao"
      : raw.includes("CONTENT_HASH_CONFLICT")
        ? "conteudo_desatualizado"
        : raw.includes("INCOMPLETE") || raw.includes("REQUIRED") || raw.includes("INVALID")
          ? "jornada_incompleta"
          : "falha_publicacao";
    redirect(`${back}&erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect(`${back}&sucesso=jornada_publicada`);
}