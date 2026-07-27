"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { isValidCpf, protectCpf } from "@/lib/identity/cpf";
import { isValidCnpj, normalizeCnpj } from "@/lib/identity/cnpj-core.mjs";
import { isValidPhoneBr, toE164Br } from "@/lib/identity/phone-br.mjs";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  cpf: z.string().trim().refine(isValidCpf, "CPF_INVALID"),
  telefone: z.string().trim().refine(isValidPhoneBr, "TELEFONE_INVALID"),
  cnpj: z.string().trim().refine((value) => value === "" || isValidCnpj(value), "CNPJ_INVALID"),
  email: z.string().trim().email().max(320).transform((value: string) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  passwordConfirmation: z.string(),
  terms: z.literal("accepted"),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "PASSWORDS_DIFFER",
}).refine((value) => value.cnpj === "" || Boolean(value.businessName), {
  path: ["businessName"],
  message: "CNPJ_REQUIRES_BUSINESS_NAME",
});

function validationError(issues: Array<{ message: string }>) {
  if (issues.some((issue) => issue.message === "PASSWORDS_DIFFER")) return "senhas_diferentes";
  if (issues.some((issue) => issue.message === "CPF_INVALID")) return "cpf_invalido";
  if (issues.some((issue) => issue.message === "TELEFONE_INVALID")) return "telefone_invalido";
  if (issues.some((issue) => issue.message === "CNPJ_INVALID")) return "cnpj_invalido";
  if (issues.some((issue) => issue.message === "CNPJ_REQUIRES_BUSINESS_NAME")) return "cnpj_requer_nome_negocio";
  return "dados_invalidos";
}

export async function createPublicAccountAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    preferredName: formData.get("preferred_name"),
    businessName: formData.get("business_name") || undefined,
    cpf: formData.get("cpf"),
    telefone: formData.get("telefone"),
    cnpj: formData.get("cnpj") || "",
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("password_confirmation"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) redirect(`/cadastro?erro=${validationError(parsed.error.issues)}`);

  const client = await createSessionClient();
  const callback = new URL("/confirm", publicApplicationOrigin()).toString();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callback,
      data: {
        preferred_name: parsed.data.preferredName,
        business_name: parsed.data.businessName || null,
        signup_profile_version: 2,
      },
    },
  });

  if (error) {
    const rateLimited = error.status === 429 || error.code === "over_email_send_rate_limit" || error.code?.includes("rate_limit");
    const code = rateLimited ? "limite_email" : error.code === "user_already_exists" || error.code === "user_already_registered" ? "usuario_existente" : "criacao_falhou";
    redirect(`/cadastro?erro=${code}`);
  }
  if (!data.user) redirect("/cadastro?erro=criacao_falhou");

  try {
    const protectedCpf = protectCpf(parsed.data.cpf, data.user.id);
    const privileged = createPrivilegedClient();
    const { error: metadataError } = await privileged.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        preferred_name: parsed.data.preferredName,
        business_name: parsed.data.businessName || null,
        signup_profile_version: 2,
        signup_phone_e164: toE164Br(parsed.data.telefone),
        signup_cnpj: parsed.data.cnpj ? normalizeCnpj(parsed.data.cnpj) : null,
        signup_cpf_encrypted: {
          ciphertext: protectedCpf.ciphertext,
          initializationVector: protectedCpf.initializationVector,
          authenticationTag: protectedCpf.authenticationTag,
          keyVersion: protectedCpf.keyVersion,
        },
      },
    });
    if (metadataError) throw metadataError;
  } catch {
    await createPrivilegedClient().auth.admin.deleteUser(data.user.id).catch(() => undefined);
    redirect("/cadastro?erro=protecao_cpf_indisponivel");
  }

  if (data.session) redirect("/cadastro/concluir");
  redirect("/entrar?cadastro=confirmacao");
}
