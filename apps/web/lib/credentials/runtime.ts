import "server-only";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import type {
  CertificateVerification,
  CredentialIssuanceResult,
  ParticipantCredentials
} from "@/lib/credentials/contracts";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";

async function invoke<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = createPrivilegedClient();
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const credentialRuntime = {
  issue: (
    actor: string,
    journeyInstanceId: string,
    stepInstanceId: string | null,
    idempotencyKey: string
  ) => invoke<RpcEnvelope<CredentialIssuanceResult>>("issue_learning_credentials", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: journeyInstanceId,
    p_step_instance_id: stepInstanceId,
    p_idempotency_key: idempotencyKey
  }),

  listParticipant: (actor: string) => invoke<ParticipantCredentials>(
    "list_participant_credentials",
    { p_actor_user_account_id: actor }
  ),

  verifyCertificate: (verificationCode: string) => invoke<CertificateVerification>(
    "verify_certificate",
    { p_verification_code: verificationCode }
  )
};
