import "server-only";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { assertTestPublicSignupEnabled } from "@/lib/auth/test-public-signup";

export type TestSignupParticipant = {
  user_account_id: string;
  entrepreneur_id: string;
  email_normalized: string;
  test_only: true;
};

export async function provisionTestSignupParticipant(input: {
  userAccountId: string;
  email: string;
  preferredName: string;
}): Promise<TestSignupParticipant> {
  assertTestPublicSignupEnabled();

  const client = createPrivilegedClient();
  const { data, error } = await client.rpc("provision_test_signup_participant", {
    p_user_account_id: input.userAccountId,
    p_email_normalized: input.email.trim().toLowerCase(),
    p_preferred_name: input.preferredName.trim()
  });

  if (error) throw new Error(`TEST_PUBLIC_SIGNUP_PROVISIONING_FAILED:${error.message}`);
  return data as TestSignupParticipant;
}
