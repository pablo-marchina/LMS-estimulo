"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

const uuid = z.string().uuid();

export async function archiveTrackAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect("/admin/produto?erro=sem_permissao");
  }

  const journeyVersionId = uuid.parse(formData.get("journey_version_id"));
  const pathTemplateId = uuid.parse(formData.get("path_template_id"));
  const back = `/admin/produto?etapa=conteudo&versao=${journeyVersionId}`;
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "ARQUIVAR") redirect(`${back}&erro=confirmacao_trilha`);

  try {
    await invokeServerRpc("archive_admin_track", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_organization_id: organization.organization_id,
      p_path_template_id: pathTemplateId,
      p_idempotency_key: String(formData.get("idempotency_key") || randomUUID()),
    });
  } catch (error) {
    let reason = "arquivar_trilha";
    if (error instanceof ServerRpcError && error.code === "23503") reason = "trilha_em_uso";
    if (error instanceof ServerRpcError && error.code === "23514") reason = "trilha_padrao";
    if (error instanceof ServerRpcError && error.code === "42501") reason = "sem_permissao";
    redirect(`${back}&erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect(`${back}&sucesso=trilha_arquivada`);
}
