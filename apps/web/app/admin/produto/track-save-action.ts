"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAdminTrack } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function checked(formData: FormData, name: string) { return formData.get(name) === "on" || formData.get(name) === "true"; }
function positiveInteger(value: string, fallback = 1) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function deriveCode(source: string, fallback: string) { const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback; }

export async function saveTrackAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) redirect("/admin/produto?erro=sem_permissao");

  const journeyVersionId = text(formData, "journey_version_id");
  const pathTemplateId = nullable(formData, "path_template_id");
  const name = text(formData, "name");
  const completionBadgeVersionId = nullable(formData, "completion_badge_version_id");
  const back = `/admin/produto?etapa=conteudo&versao=${journeyVersionId}`;
  if (!journeyVersionId || !name) redirect(`${back}&erro=campos_incompletos`);

  let liveUpdate = false;
  try {
    const result = await saveAdminTrack({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      payload: {
        journey_version_id: journeyVersionId,
        path_template_id: pathTemplateId,
        code: text(formData, "code") || deriveCode(name, `trilha_${randomUUID().slice(0, 8)}`),
        name,
        description: nullable(formData, "description"),
        position: positiveInteger(text(formData, "position")),
        is_default: checked(formData, "is_default"),
        is_required: checked(formData, "is_required"),
        presentation: {
          tone: text(formData, "tone") || "cyan",
          icon: text(formData, "icon") || "sparkles",
        },
        completion_badge_version_id: completionBadgeVersionId,
      },
      idempotencyKey: randomUUID(),
    });
    liveUpdate = result.live_update;
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "admin_track_save_failed",
      code: error instanceof Error && "code" in error ? String((error as Error & { code?: unknown }).code ?? "") : "",
      message: error instanceof Error ? error.message : String(error),
      editing_existing_track: Boolean(pathTemplateId),
    }));
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`${back}&erro=${reason}`);
  }

  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  redirect(`${back}&sucesso=${liveUpdate ? "atualizado_ao_vivo" : "trilha_salva"}`);
}
