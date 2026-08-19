"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function safeEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost = host === "localhost" || host === "::1" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./u.test(host);
    return url.protocol === "https:" && !url.username && !url.password && !privateHost ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function saveAiGradingProviderAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  }
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("assessment.review")) {
    redirect("/admin/operacao?area=praticas&erro=sem_permissao");
  }

  const endpoint = safeEndpoint(field(formData, "endpoint_url"));
  const providerName = field(formData, "provider_name");
  const modelName = field(formData, "model_name");
  const apiKey = field(formData, "api_key");
  const status = field(formData, "status") === "inactive" ? "inactive" : "active";
  if (!endpoint || !providerName || !modelName) {
    redirect("/admin/operacao?area=praticas&erro=configuracao_ia_invalida");
  }

  try {
    await extensionsRuntime.saveAiGradingProvider({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      payload: {
        provider_name: providerName,
        endpoint_url: endpoint,
        model_name: modelName,
        api_key: apiKey,
        status,
        metadata: { configured_from: "admin_operation_deliveries" },
      },
      idempotencyKey: field(formData, "idempotency_key") || randomUUID(),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "AI_GRADING_PROVIDER_SAVE_FAILED";
    const reason = raw.includes("API_KEY_REQUIRED") ? "chave_ia_obrigatoria" : raw.includes("FORBIDDEN") ? "sem_permissao" : "falha_configurar_ia";
    redirect(`/admin/operacao?area=praticas&erro=${reason}`);
  }

  revalidatePath("/admin/operacao");
  redirect("/admin/operacao?area=praticas&sucesso=provedor_ia_salvo");
}
