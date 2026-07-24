import "server-only";
import type {
  CertificateVerification,
  CredentialIssuanceResult,
  ParticipantCredentials,
} from "@/lib/credentials/contracts";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import { createPrivilegedClient } from "@/lib/supabase/admin";

async function invoke<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return invokeServerRpc<T>(name, args);
}

export const credentialRuntime = {
  issue: (actor: string, journeyInstanceId: string, stepInstanceId: string | null, idempotencyKey: string) => invoke<RpcEnvelope<CredentialIssuanceResult>>("issue_learning_credentials", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: journeyInstanceId,
    p_step_instance_id: stepInstanceId,
    p_idempotency_key: idempotencyKey,
  }),
  listParticipant: (actor: string) => invoke<ParticipantCredentials>("list_participant_credentials", { p_actor_user_account_id: actor }),
  verifyCertificate: async (verificationCode: string) => {
    const { data, error } = await createPrivilegedClient().rpc("verify_certificate", { p_verification_code: verificationCode });
    if (error) throw new Error(`CERTIFICATE_VERIFICATION_FAILED:${error.message}`);
    return data as CertificateVerification;
  },
};
