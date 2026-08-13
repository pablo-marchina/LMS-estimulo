"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getSignupLegalSnapshotByIds,
  legalDocumentPublishedDate,
} from "@/lib/auth/public-signup-provisioning";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform((value: string) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  passwordConfirmation: z.string(),
  terms: z.literal("accepted"),
  termsDocumentVersionId: z.string().uuid(),
  privacyDocumentVersionId: z.string().uuid(),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "PASSWORDS_DIFFER",
});

function validationError(issues: Array<{ message: string }>) {
  if (issues.some((issue) => issue.message === "PASSWORDS_DIFFER")) return "senhas_diferentes";
  return "dados_invalidos";
}

function isObfuscatedExistingUser(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const identities = (value as { identities?: unknown }).identities;
  return Array.isArray(identities) && identities.length === 0;
}

async function publicSignupRuntimeIsReady(): Promise<boolean> {
  try {
    const privileged = createPrivilegedClient();
    const { data, error } = await privileged.rpc("get_application_readiness");
    const result = Array.isArray(data) ? data[0] : data;
    return !error && Boolean(result && typeof result === "object" && result.status === "ready");
  } catch (error) {
    console.error("PUBLIC_SIGNUP_RUNTIME_PREFLIGHT_FAILED", {
      errorCode: error && typeof error === "object" && "code" in error ? error.code : null,
      errorMessage: error instanceof Error ? error.message : null,
    });
    return false;
  }
}

export async function createPublicAccountAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    preferredName: formData.get("preferred_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("password_confirmation"),
    terms: formData.get("terms"),
    termsDocumentVersionId: formData.get("terms_document_version_id"),
    privacyDocumentVersionId: formData.get("privacy_document_version_id"),
  });
  if (!parsed.success) redirect(`/cadastro?erro=${validationError(parsed.error.issues)}`);

  if (!(await publicSignupRuntimeIsReady())) redirect("/cadastro?erro=servico_indisponivel");

  let legalSnapshot;
  try {
    legalSnapshot = await getSignupLegalSnapshotByIds({
      termsDocumentVersionId: parsed.data.termsDocumentVersionId,
      privacyDocumentVersionId: parsed.data.privacyDocumentVersionId,
    });
  } catch {
    redirect("/cadastro?erro=aceite_legal_invalido");
  }

  const client = await createSessionClient();
  const callback = new URL("/confirm", publicApplicationOrigin()).toString();
  const acceptedAt = new Date().toISOString();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callback,
      data: {
        preferred_name: parsed.data.preferredName,
        signup_profile_version: 5,
        terms_accepted_at: acceptedAt,
        terms_version: legalDocumentPublishedDate(legalSnapshot.terms),
        terms_legal_document_version_id: legalSnapshot.terms.id,
        privacy_accepted_at: acceptedAt,
        privacy_version: legalDocumentPublishedDate(legalSnapshot.privacy),
        privacy_legal_document_version_id: legalSnapshot.privacy.id,
      },
    },
  });

  if (error) {
    const rateLimited = error.status === 429 || error.code === "over_email_send_rate_limit" || error.code?.includes("rate_limit");
    const code = rateLimited
      ? "limite_email"
      : error.code === "user_already_exists" || error.code === "user_already_registered"
        ? "conta_existente_ou_vinculada"
        : "criacao_falhou";
    redirect(`/cadastro?erro=${code}`);
  }
  if (!data.user) redirect("/cadastro?erro=criacao_falhou");

  if (isObfuscatedExistingUser(data.user)) {
    redirect("/cadastro?erro=conta_existente_ou_vinculada");
  }

  if (data.session) redirect("/cadastro/concluir");
  redirect("/entrar?cadastro=confirmacao");
}
