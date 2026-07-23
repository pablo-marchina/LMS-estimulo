import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { FirstTouchAttribution } from "@/lib/auth/first-touch";
import type { ProtectedCpf } from "@/lib/identity/cpf";

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
