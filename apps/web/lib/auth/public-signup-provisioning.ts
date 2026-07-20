import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { FirstTouchAttribution } from "@/lib/auth/first-touch";

export type PublicSignupProvisioningResult = {
  user_account_id: string;
  entrepreneur_id: string;
  business_id: string | null;
  attribution_id: string;
  email_normalized: string;
};

export function provisionPublicSignupParticipant(input: {
  userAccountId: string;
  preferredName: string;
  businessName: string | null;
  attribution: FirstTouchAttribution;
  idempotencyKey: string;
}) {
  return invokeServerRpc<PublicSignupProvisioningResult>("provision_public_signup_participant", {
    p_user_account_id: input.userAccountId,
    p_preferred_name: input.preferredName,
    p_business_name: input.businessName,
    p_attribution: input.attribution,
    p_idempotency_key: input.idempotencyKey,
  });
}
