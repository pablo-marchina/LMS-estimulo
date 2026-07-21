"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { decodeFirstTouch, FIRST_TOUCH_COOKIE } from "@/lib/auth/first-touch";
import { provisionPublicSignupParticipant } from "@/lib/auth/public-signup-provisioning";
import { isValidCpf, protectCpf, type ProtectedCpf } from "@/lib/identity/cpf";

const schema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  cpf: z.string().trim().refine(isValidCpf, "CPF_INVALID"),
});

export async function completePublicSignupAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const parsed = schema.safeParse({
    preferredName: formData.get("preferred_name"),
    businessName: formData.get("business_name") || undefined,
    cpf: formData.get("cpf"),
  });
  if (!parsed.success) {
    const cpfIssue = parsed.error.issues.some((issue) => issue.message === "CPF_INVALID");
    redirect(`/cadastro/concluir?erro=${cpfIssue ? "cpf_invalido" : "dados_invalidos"}`);
  }

  let protectedCpf: ProtectedCpf;
  try {
    protectedCpf = protectCpf(parsed.data.cpf, auth.identity.user_account_id);
  } catch (error) {
    if (error instanceof Error && error.message === "CPF_INVALID") {
      redirect("/cadastro/concluir?erro=cpf_invalido");
    }
    redirect("/cadastro/concluir?erro=protecao_cpf_indisponivel");
  }

  const cookieStore = await cookies();
  const attribution = decodeFirstTouch(cookieStore.get(FIRST_TOUCH_COOKIE)?.value) ?? {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    landing_path: "/cadastro",
  };

  try {
    await provisionPublicSignupParticipant({
      userAccountId: auth.identity.user_account_id,
      preferredName: parsed.data.preferredName,
      businessName: parsed.data.businessName || null,
      attribution,
      protectedCpf,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.includes("CPF_ALREADY_LINKED_TO_ANOTHER_ACCOUNT")) {
      redirect("/cadastro/concluir?erro=cpf_ja_vinculado");
    }
    if (code.includes("CPF_CHANGE_REQUIRES_IDENTITY_REVIEW")) {
      redirect("/cadastro/concluir?erro=cpf_revisao_necessaria");
    }
    redirect("/cadastro/concluir?erro=provisionamento_falhou");
  }

  cookieStore.delete(FIRST_TOUCH_COOKIE);
  redirect("/empreendedor");
}
