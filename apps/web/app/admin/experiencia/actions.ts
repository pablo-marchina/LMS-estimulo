"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import {
  INTERFACE_CONTENT_CACHE_TAG,
  publishAdminInterfaceContent,
  saveAdminInterfaceContent,
} from "@/lib/interface-content/runtime";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function integer(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("interface.content.manage")) {
    redirect("/admin/experiencia?erro=sem_permissao");
  }
  return { auth, organization };
}

export async function saveInterfaceContentAction(formData: FormData) {
  const { auth, organization } = await authorize();
  const count = Math.min(500, Math.max(0, Number.parseInt(text(formData, "entry_count"), 10) || 0));
  const entries = Array.from({ length: count }, (_, index) => {
    const contentKey = text(formData, `content_key_${index}`);
    const order = integer(text(formData, `order_${index}`), index * 10 + 10);
    return {
      content_key: contentKey,
      locale: text(formData, `locale_${index}`) || "pt-BR",
      value: {
        text: text(formData, `text_${index}`),
        visible: checked(formData, `visible_${index}`),
        ...(formData.has(`order_${index}`) ? { order } : {}),
      },
    };
  }).filter((entry) => entry.content_key);

  if (!entries.length) redirect("/admin/experiencia?erro=conteudo_vazio");

  try {
    await saveAdminInterfaceContent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      entries,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_salvar";
    redirect(`/admin/experiencia?erro=${reason}`);
  }
  redirect("/admin/experiencia?sucesso=rascunho_salvo");
}

export async function publishInterfaceContentAction() {
  const { auth, organization } = await authorize();
  try {
    await publishAdminInterfaceContent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      contentKeys: null,
      idempotencyKey: randomUUID(),
    });
    updateTag(INTERFACE_CONTENT_CACHE_TAG);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_publicar";
    redirect(`/admin/experiencia?erro=${reason}`);
  }
  redirect("/admin/experiencia?sucesso=interface_publicada");
}
