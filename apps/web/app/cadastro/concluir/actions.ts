"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import {
  decodeFirstTouch,
  FIRST_TOUCH_COOKIE,
  firstTouchFromUnknown,
} from "@/lib/auth/first-touch";
import {
  getSignupLegalSnapshotByIds,
  legalDocumentPublishedDate,
  provisionPublicSignupParticipant,
  stagePublicSignupLegalSnapshot,
} from "@/lib/auth/public-signup-provisioning";
import { isOpenAiCampaign, resolveOpenAiJourneyDestination } from "@/lib/journey-runtime/openai-destination";
import { assertCpfProtectionReady, isValidCpf, protectCpf, unprotectCpf, type ProtectedCpf } from "@/lib/identity/cpf";
import { isValidCnpj, normalizeCnpj } from "@/lib/identity/cnpj-core.mjs";
import { isValidPhoneBr, toE164Br } from "@/lib/identity/phone-br.mjs";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

const schema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  cpf: z.string().trim().refine(isValidCpf, "CPF_INVALID"),
  telefone: z.string().trim().refine(isValidPhoneBr, "TELEFONE_INVALID"),
  cnpj: z.string().trim().refine((value) => value === "" || isValidCnpj(value), "CNPJ_INVALID"),
}).refine((value) => value.cnpj === "" || Boolean(value.businessName), {
  path: ["businessName"],
  message: "CNPJ_REQUIRES_BUSINESS_NAME",
});

const uuidSchema = z.string().uuid();

function encryptedCpfFromMetadata(value: unknown): ProtectedCpf | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (!["ciphertext", "initializationVector", "authenticationTag"].every((key) => typeof item[key] === "string")) return null;
  return {
    lookupHmac: "",
    ciphertext: String(item.ciphertext),
    initializationVector: String(item.initializationVector),
    authenticationTag: String(item.authenticationTag),
    keyVersion: Number(item.keyVersion),
  };
}

function hasSignupLegalSnapshotToken(metadata: Record<string, unknown>): boolean {
  const token = metadata.signup_legal_snapshot_token;
  return typeof token === "string" && uuidSchema.safeParse(token).success;
}

function logCpfProtectionFailure(stage: "legacy_recovery" | "final_protection", error: unknown) {
  console.error("PUBLIC_SIGNUP_CPF_PROTECTION_FAILED", {
    stage,
    errorCode: error && typeof error === "object" && "code" in error ? error.code : null,
    errorMessage: error instanceof Error ? error.message : null,
  });
}

export async function completePublicSignupAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.access_mode === "administrative") redirect(auth.identity.next_path || "/admin");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const session = await createSessionClient();
  const { data: userData } = await session.auth.getUser();
  if (!userData.user) redirect("/entrar?erro=confirmacao_necessaria");
  const metadata = (userData.user.user_metadata ?? {}) as Record<string, unknown>;

  if (!hasSignupLegalSnapshotToken(metadata)) {
    const termsDocumentVersionId = uuidSchema.safeParse(String(formData.get("terms_document_version_id") ?? ""));
    const privacyDocumentVersionId = uuidSchema.safeParse(String(formData.get("privacy_document_version_id") ?? ""));
    if (formData.get("terms") !== "accepted" || !termsDocumentVersionId.success || !privacyDocumentVersionId.success) {
      redirect("/cadastro/concluir?erro=aceite_legal_necessario");
    }

    let legalSnapshot;
    try {
      legalSnapshot = await getSignupLegalSnapshotByIds({
        termsDocumentVersionId: termsDocumentVersionId.data,
        privacyDocumentVersionId: privacyDocumentVersionId.data,
      });
    } catch {
      redirect("/cadastro/concluir?erro=aceite_legal_invalido");
    }

    const acceptedAt = new Date().toISOString();
    const legalSnapshotToken = randomUUID();
    try {
      await stagePublicSignupLegalSnapshot({
        snapshotToken: legalSnapshotToken,
        email: userData.user.email ?? auth.email,
        termsDocumentVersionId: legalSnapshot.terms.id,
        privacyDocumentVersionId: legalSnapshot.privacy.id,
        acceptedAt,
      });

      const { error: metadataError } = await createPrivilegedClient().auth.admin.updateUserById(userData.user.id, {
        user_metadata: {
          ...metadata,
          signup_legal_snapshot_token: legalSnapshotToken,
          terms_accepted_at: acceptedAt,
          terms_version: legalDocumentPublishedDate(legalSnapshot.terms),
          privacy_accepted_at: acceptedAt,
          privacy_version: legalDocumentPublishedDate(legalSnapshot.privacy),
        },
      });
      if (metadataError) throw metadataError;
    } catch (error) {
      console.error("LEGACY_SIGNUP_LEGAL_SNAPSHOT_STAGE_FAILED", {
        errorCode: error && typeof error === "object" && "code" in error ? error.code : null,
        errorMessage: error instanceof Error ? error.message : null,
      });
      redirect("/cadastro/concluir?erro=aceite_legal_indisponivel");
    }
  }

  let cpf = String(formData.get("cpf") ?? "").trim();
  if (!cpf) {
    const encrypted = encryptedCpfFromMetadata(metadata.signup_cpf_encrypted);
    try {
      if (encrypted) cpf = unprotectCpf(encrypted, userData.user.id);
    } catch (error) {
      logCpfProtectionFailure("legacy_recovery", error);
      redirect("/cadastro/concluir?erro=protecao_cpf_indisponivel");
    }
  }

  const parsed = schema.safeParse({
    preferredName: formData.get("preferred_name"),
    businessName: formData.get("business_name") || undefined,
    cpf,
    telefone: formData.get("telefone"),
    cnpj: formData.get("cnpj") || "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    const code = issue === "CPF_INVALID" ? "cpf_invalido"
      : issue === "TELEFONE_INVALID" ? "telefone_invalido"
      : issue === "CNPJ_INVALID" ? "cnpj_invalido"
      : issue === "CNPJ_REQUIRES_BUSINESS_NAME" ? "cnpj_requer_nome_negocio"
      : "dados_invalidos";
    redirect(`/cadastro/concluir?erro=${code}`);
  }

  let protectedCpf: ProtectedCpf;
  try {
    assertCpfProtectionReady();
    protectedCpf = protectCpf(parsed.data.cpf, auth.identity.user_account_id);
  } catch (error) {
    if (error instanceof Error && error.message === "CPF_INVALID") redirect("/cadastro/concluir?erro=cpf_invalido");
    logCpfProtectionFailure("final_protection", error);
    redirect("/cadastro/concluir?erro=protecao_cpf_indisponivel");
  }

  const phoneE164 = toE164Br(parsed.data.telefone);
  const cnpj = parsed.data.cnpj ? normalizeCnpj(parsed.data.cnpj) : null;
  const cookieStore = await cookies();
  const storedAttribution = firstTouchFromUnknown(metadata.signup_first_touch_attribution);
  const cookieAttribution = decodeFirstTouch(cookieStore.get(FIRST_TOUCH_COOKIE)?.value);
  const attribution = storedAttribution ?? cookieAttribution ?? {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    landing_path: "/cadastro",
  };
  const openAiCampaign = isOpenAiCampaign(attribution);

  try {
    await provisionPublicSignupParticipant({
      userAccountId: auth.identity.user_account_id,
      preferredName: parsed.data.preferredName,
      businessName: parsed.data.businessName || null,
      attribution,
      protectedCpf,
      phoneE164,
      cnpj,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.includes("CPF_ALREADY_LINKED_TO_ANOTHER_ACCOUNT")) redirect("/cadastro/concluir?erro=cpf_ja_vinculado");
    if (code.includes("CPF_CHANGE_REQUIRES_IDENTITY_REVIEW")) redirect("/cadastro/concluir?erro=cpf_revisao_necessaria");
    if (code.includes("CNPJ_ALREADY_LINKED_TO_ANOTHER_BUSINESS")) redirect("/cadastro/concluir?erro=cnpj_ja_vinculado");
    console.error("PUBLIC_SIGNUP_PROVISIONING_FAILED", {
      errorMessage: error instanceof Error ? error.message : null,
    });
    redirect("/cadastro/concluir?erro=provisionamento_falhou");
  }

  try {
    const { error: cleanupError } = await createPrivilegedClient().auth.admin.updateUserById(userData.user.id, {
      user_metadata: {
        preferred_name: parsed.data.preferredName,
        business_name: parsed.data.businessName || null,
        signup_profile_version: 3,
        signup_phone_e164: null,
        signup_cnpj: null,
        signup_cpf_encrypted: null,
        signup_first_touch_attribution: null,
        signup_legal_snapshot_token: null,
      },
    });
    if (cleanupError) throw cleanupError;
  } catch (error) {
    console.warn("PUBLIC_SIGNUP_METADATA_CLEANUP_FAILED", {
      errorCode: error && typeof error === "object" && "code" in error ? error.code : null,
      errorMessage: error instanceof Error ? error.message : null,
    });
  }

  let openAiDestination: string | null = null;
  if (openAiCampaign) {
    try {
      openAiDestination = await resolveOpenAiJourneyDestination(auth.identity.user_account_id);
    } catch (error) {
      console.error("OPENAI_CAMPAIGN_SIGNUP_DESTINATION_FAILED", {
        error_name: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  cookieStore.delete(FIRST_TOUCH_COOKIE);
  if (openAiDestination) redirect(openAiDestination);
  redirect("/empreendedor");
}
