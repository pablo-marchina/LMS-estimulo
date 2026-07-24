"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { publishAdminJourneyVersion } from "@/lib/admin/product-management";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function publishJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organizationId = text(formData, "organization_id");
  const journeyVersionId = text(formData, "journey_version_id");
  const expectedContentHash = text(formData, "content_hash");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);

  if (!organization?.permissions.includes("journey.definition.publish")) {
    redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&erro=sem_permissao`);
  }
  if (!journeyVersionId || !expectedContentHash) {
    redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&erro=campos_incompletos`);
  }

  try {
    await publishAdminJourneyVersion({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      journeyVersionId,
      expectedContentHash,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const reason = message.includes("FORBIDDEN")
      ? "sem_permissao"
      : message.includes("CONTENT_HASH_CONFLICT")
        ? "conteudo_alterado"
        : message.includes("INCOMPLETE") || message.includes("REQUIRED") || message.includes("INVALID")
          ? "jornada_incompleta"
          : "falha_publicacao";
    redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&erro=${reason}`);
  }

  redirect(`/admin/produto?organization=${organizationId}&sucesso=jornada_publicada`);
}
