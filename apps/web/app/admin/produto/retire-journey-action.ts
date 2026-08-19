"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { retireAdminJourney } from "@/lib/admin/product-lifecycle";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";

const uuid = z.string().uuid();

export async function retireJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect("/admin/produto?erro=sem_permissao");
  }

  const journeyDefinitionId = uuid.parse(formData.get("journey_definition_id"));
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "ARQUIVAR") {
    redirect("/admin/produto?erro=confirmacao_arquivamento");
  }

  try {
    await retireAdminJourney({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      journeyDefinitionId,
      idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const reason = raw.includes("FORBIDDEN")
      ? "sem_permissao"
      : raw.includes("JOURNEY_NOT_FOUND")
        ? "jornada_nao_encontrada"
        : "falha_arquivamento";
    redirect(`/admin/produto?erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect("/admin/produto?sucesso=jornada_arquivada");
}
