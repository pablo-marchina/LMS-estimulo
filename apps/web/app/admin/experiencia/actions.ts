"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { uploadAdministrativeImage } from "@/lib/admin/media-upload";
import {
  INTERFACE_CONTENT_CACHE_TAG,
  archiveAdminInterfaceContent,
  publishAdminInterfaceContent,
  registerAdminInterfaceContent,
  saveAdminInterfaceContent,
} from "@/lib/interface-content/runtime";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function checked(formData: FormData, name: string) { return formData.get(name) === "on" || formData.get(name) === "true"; }
function integer(value: string, fallback: number) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? parsed : fallback; }
function selectedFile(formData: FormData, name: string) { const value = formData.get(name); return value instanceof File && value.size > 0 ? value : null; }
function decimal(value: string, fallback: number) { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : fallback; }
function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "elemento"; }

function canManageInterface(permissions: string[]) {
  return permissions.includes("interface.content.manage") || permissions.includes("journey.definition.manage");
}

async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization || !canManageInterface(organization.permissions)) redirect("/admin/experiencia?erro=sem_permissao");
  return { auth, organization };
}

export async function saveInterfaceContentAction(formData: FormData) {
  const { auth, organization } = await authorize();
  const contentKey = text(formData, "content_key");
  const publishNow = checked(formData, "publish_now");
  try {
    const desktopFile = selectedFile(formData, "desktop_image_file");
    const mobileFile = selectedFile(formData, "mobile_image_file");
    const currentDesktopId = text(formData, "current_image_file_object_id") || null;
    const currentMobileId = text(formData, "current_mobile_image_file_object_id") || null;
    const imageFileObjectId = desktopFile ? await uploadAdministrativeImage({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, file: desktopFile, source: "interface_content", role: "desktop" }) : currentDesktopId;
    const mobileImageFileObjectId = mobileFile ? await uploadAdministrativeImage({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, file: mobileFile, source: "interface_content", role: "mobile" }) : currentMobileId;
    const value = {
      text: text(formData, "text"),
      title: text(formData, "title"),
      body: text(formData, "body"),
      href: text(formData, "href"),
      button_text: text(formData, "button_text"),
      image_url: text(formData, "image_url"),
      mobile_image_url: text(formData, "mobile_image_url"),
      image_file_object_id: imageFileObjectId ?? undefined,
      mobile_image_file_object_id: mobileImageFileObjectId ?? undefined,
      alt: text(formData, "alt"),
      tone: text(formData, "tone") || "neutral",
      image_position: text(formData, "image_position") || "center",
      overlay_opacity: Math.max(0, Math.min(0.9, decimal(text(formData, "overlay_opacity"), 0.55))),
      layout_variant: text(formData, "layout_variant") || "default",
      max_items: Math.max(1, integer(text(formData, "max_items"), 6)),
      visible: checked(formData, "visible"),
      order: integer(text(formData, "order"), 9999),
    };
    await saveAdminInterfaceContent({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, entries: [{ content_key: contentKey, locale: text(formData, "locale") || "pt-BR", value }], idempotencyKey: randomUUID() });
    if (publishNow) {
      await publishAdminInterfaceContent({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, contentKeys: [contentKey], idempotencyKey: randomUUID() });
      updateTag(INTERFACE_CONTENT_CACHE_TAG);
    }
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_salvar";
    redirect(`/admin/experiencia?edit=${encodeURIComponent(contentKey)}&erro=${reason}`);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/experiencia?edit=${encodeURIComponent(contentKey)}&sucesso=${publishNow ? "interface_publicada" : "rascunho_salvo"}`);
}

export async function registerInterfaceElementAction(formData: FormData) {
  const { auth, organization } = await authorize();
  const area = text(formData, "area") || "participant";
  const page = slug(text(formData, "page") || "custom");
  const elementName = text(formData, "element_name") || "Novo elemento";
  const elementType = text(formData, "element_type") || "text";
  const contentKey = `${area}.${page}.${slug(elementName)}.${randomUUID().slice(0, 8)}`;
  const initialText = text(formData, "initial_text");
  try {
    await registerAdminInterfaceContent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      entry: {
        content_key: contentKey,
        locale: "pt-BR",
        area,
        page,
        element_name: elementName,
        element_type: elementType,
        description: text(formData, "description") || "Elemento criado pelo CMS geral da experiência.",
        route_pattern: text(formData, "route_pattern") || null,
        placement: text(formData, "placement") || "before_content",
        group_name: text(formData, "group_name") || null,
        can_delete: true,
        default_value: { text: initialText, visible: true, order: 9999 },
        initial_value: { text: initialText, visible: true, order: 9999 },
      },
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_criar";
    redirect(`/admin/experiencia?erro=${reason}`);
  }
  redirect(`/admin/experiencia?edit=${encodeURIComponent(contentKey)}&sucesso=elemento_criado`);
}

export async function archiveInterfaceElementAction(formData: FormData) {
  const { auth, organization } = await authorize();
  try {
    await archiveAdminInterfaceContent({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, contentKey: text(formData, "content_key"), idempotencyKey: randomUUID() });
    updateTag(INTERFACE_CONTENT_CACHE_TAG);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_remover";
    redirect(`/admin/experiencia?erro=${reason}`);
  }
  revalidatePath("/", "layout");
  redirect("/admin/experiencia?sucesso=elemento_removido");
}

export async function publishInterfaceContentAction() {
  const { auth, organization } = await authorize();
  try {
    await publishAdminInterfaceContent({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, contentKeys: null, idempotencyKey: randomUUID() });
    updateTag(INTERFACE_CONTENT_CACHE_TAG);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha_publicar";
    redirect(`/admin/experiencia?erro=${reason}`);
  }
  revalidatePath("/", "layout");
  redirect("/admin/experiencia?sucesso=interface_publicada");
}
