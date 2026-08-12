"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function parseObject(raw: string): JsonRecord { try { const value = JSON.parse(raw); return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; } catch { return {}; } }
function parseLinks(raw: string): Array<{ label: string; url: string }> {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const url = typeof record.url === "string" ? record.url.trim() : "";
      return label && /^https:\/\//u.test(url) ? [{ label, url }] : [];
    });
  } catch { return []; }
}
function safeHttps(raw: string) {
  if (!raw) return "";
  try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
}
function errorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "PLATFORM_SETTINGS_SAVE_FAILED";
  return raw.match(/\b([A-Z][A-Z0-9_]{2,127})\b/u)?.[1] ?? "PLATFORM_SETTINGS_SAVE_FAILED";
}

export async function savePlatformSettingsAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("engagement.manage")) redirect("/admin/configuracoes?erro=sem_permissao");

  const communityUrl = safeHttps(text(formData, "community_whatsapp_url"));
  const links = parseLinks(text(formData, "institutional_links"))
    .filter((link) => !link.label.toLocaleLowerCase("pt-BR").includes("comunidade"));
  if (communityUrl) links.push({ label: "Comunidade no WhatsApp", url: communityUrl });

  try {
    await extensionsRuntime.saveAdmin({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      resourceType: "platform_settings",
      payload: {
        platform_name: text(formData, "platform_name"),
        support_email: text(formData, "support_email"),
        support_phone: text(formData, "support_phone"),
        support_whatsapp: text(formData, "support_whatsapp"),
        support_hours: text(formData, "support_hours"),
        footer_text: text(formData, "footer_text"),
        institutional_links: links,
        metadata: parseObject(text(formData, "metadata")),
      },
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    redirect(`/admin/configuracoes?erro=${encodeURIComponent(errorCode(error))}`);
  }

  revalidateTag("public-platform-settings", "max");
  revalidatePath("/ajuda");
  revalidatePath("/empreendedor", "layout");
  redirect("/admin/configuracoes?sucesso=platform_settings");
}
