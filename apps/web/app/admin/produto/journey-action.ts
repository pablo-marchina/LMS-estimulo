"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  journeySaveErrorCode,
  saveAdminJourneyFromForm,
} from "@/lib/admin/journey-save";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

export async function saveJourneyAction(formData: FormData) {
  const auth = await getAuthContext();

  if (
    auth.status !== "authenticated" ||
    !isEstimuloAdministrativeEmail(auth.email)
  ) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect("/admin/produto?erro=sem_permissao");
  }

  const journeyId = String(
    formData.get("journey_id") ?? formData.get("version_id") ?? "",
  ).trim();

  let result: Awaited<ReturnType<typeof saveAdminJourneyFromForm>>;

  try {
    result = await saveAdminJourneyFromForm({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      formData,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "admin_journey_save_failed",
        code:
          error instanceof Error && "code" in error
            ? String((error as Error & { code?: unknown }).code ?? "")
            : "",
        message: error instanceof Error ? error.message : String(error),
        editing_existing_journey: Boolean(journeyId),
      }),
    );

    const reason = journeySaveErrorCode(error);
    redirect(
      `/admin/produto/erro?codigo=${encodeURIComponent(
        reason,
      )}&versao=${encodeURIComponent(journeyId)}`,
    );
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");

  const success = result.liveUpdate ? "atualizado_ao_vivo" : "rascunho_salvo";
  redirect(
    `/admin/produto?etapa=$$
      {result.themeSaveFailed ? "geral" : "conteudo"}
    &versao=${result.savedJourneyId}&sucesso=${success}$
      {result.themeSaveFailed ? "&erro=temas_nao_salvos" : ""}`.replaceAll("$\n      ", "$").replaceAll("\n    ", ""),
  );
}
