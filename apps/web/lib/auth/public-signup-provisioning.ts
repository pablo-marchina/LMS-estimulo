import "server-only";

import { z } from "zod";
import type { FirstTouchAttribution } from "@/lib/auth/first-touch";
import type { ProtectedCpf } from "@/lib/identity/cpf";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export type PublicSignupProvisioningResult = {
  user_account_id: string;
  entrepreneur_id: string;
  business_id: string | null;
  attribution_id: string;
  email_normalized: string;
  cpf_status: "protected";
  phone_status: "stored";
  cnpj_status: "stored" | "not_provided";
};

const signupLegalDocumentSchema = z.object({
  id: z.string().uuid(),
  document_type: z.enum(["terms_of_use", "privacy_policy"]),
  version_number: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().min(1),
  content_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  published_at: z.string().datetime(),
  status: z.enum(["published", "retired"]),
});

export type SignupLegalDocument = z.infer<typeof signupLegalDocumentSchema>;
export type SignupLegalSnapshot = {
  terms: SignupLegalDocument;
  privacy: SignupLegalDocument;
};

async function loadSignupLegalDocuments(versionIds?: string[]): Promise<SignupLegalDocument[]> {
  const { data, error } = await createPrivilegedClient().rpc("get_signup_legal_documents", {
    p_version_ids: versionIds?.length ? versionIds : null,
  });
  if (error) throw new Error("LEGAL_DOCUMENT_SNAPSHOT_UNAVAILABLE");

  const parsed = z.array(signupLegalDocumentSchema).safeParse(data ?? []);
  if (!parsed.success) throw new Error("LEGAL_DOCUMENT_SNAPSHOT_INVALID");
  return parsed.data;
}

function legalSnapshotFromDocuments(documents: SignupLegalDocument[]): SignupLegalSnapshot {
  const terms = documents.filter((document) => document.document_type === "terms_of_use");
  const privacy = documents.filter((document) => document.document_type === "privacy_policy");
  if (documents.length !== 2 || terms.length !== 1 || privacy.length !== 1) {
    throw new Error("LEGAL_DOCUMENT_SNAPSHOT_INCOMPLETE");
  }
  return { terms: terms[0], privacy: privacy[0] };
}

export async function getCurrentSignupLegalSnapshot(): Promise<SignupLegalSnapshot> {
  return legalSnapshotFromDocuments(await loadSignupLegalDocuments());
}

export async function getSignupLegalSnapshotByIds(input: {
  termsDocumentVersionId: string;
  privacyDocumentVersionId: string;
}): Promise<SignupLegalSnapshot> {
  if (input.termsDocumentVersionId === input.privacyDocumentVersionId) {
    throw new Error("LEGAL_DOCUMENT_SNAPSHOT_INVALID");
  }

  const snapshot = legalSnapshotFromDocuments(await loadSignupLegalDocuments([
    input.termsDocumentVersionId,
    input.privacyDocumentVersionId,
  ]));
  if (snapshot.terms.id !== input.termsDocumentVersionId || snapshot.privacy.id !== input.privacyDocumentVersionId) {
    throw new Error("LEGAL_DOCUMENT_SNAPSHOT_MISMATCH");
  }
  return snapshot;
}

export async function getPublicSignupLegalDocument(
  documentType: SignupLegalDocument["document_type"],
  versionId?: string,
): Promise<SignupLegalDocument | null> {
  if (!versionId) {
    const snapshot = await getCurrentSignupLegalSnapshot();
    return documentType === "terms_of_use" ? snapshot.terms : snapshot.privacy;
  }

  const parsedId = z.string().uuid().safeParse(versionId);
  if (!parsedId.success) return null;
  const documents = await loadSignupLegalDocuments([parsedId.data]);
  return documents.find((document) => document.document_type === documentType) ?? null;
}

export function legalDocumentPublishedDate(document: SignupLegalDocument): string {
  return document.published_at.slice(0, 10);
}

export function provisionPublicSignupParticipant(input: {
  userAccountId: string;
  preferredName: string;
  businessName: string | null;
  attribution: FirstTouchAttribution;
  protectedCpf: ProtectedCpf;
  phoneE164: string;
  cnpj: string | null;
  idempotencyKey: string;
}) {
  return invokeServerRpc<PublicSignupProvisioningResult>("provision_public_signup_participant_v3", {
    p_user_account_id: input.userAccountId,
    p_preferred_name: input.preferredName,
    p_business_name: input.businessName,
    p_attribution: input.attribution,
    p_cpf_lookup_hmac: input.protectedCpf.lookupHmac,
    p_cpf_ciphertext_base64: input.protectedCpf.ciphertext,
    p_cpf_initialization_vector_base64: input.protectedCpf.initializationVector,
    p_cpf_authentication_tag_base64: input.protectedCpf.authenticationTag,
    p_cpf_key_version: input.protectedCpf.keyVersion,
    p_phone_e164: input.phoneE164,
    p_cnpj: input.cnpj,
    p_idempotency_key: input.idempotencyKey,
  });
}
