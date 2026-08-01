import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { CurrentIdentityError, resolveCurrentIdentity, type CurrentIdentityContext } from "@/lib/auth/current-identity";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import {
  INTERFACE_PREVIEW_COOKIE,
  INTERFACE_PREVIEW_REQUEST_HEADER,
  parseInterfacePreviewIdentity,
} from "@/lib/interface-preview/constants";
import { assertPlatformRuntimePolicy } from "@/lib/platform/runtime-provider";
import { createSessionClient } from "@/lib/supabase/server";

export type AuthContext =
  | { status: "anonymous" }
  | { status: "identity_error"; reason: string }
  | { status: "authenticated"; identity: CurrentIdentityContext; email: string; provider: string };

async function resolveInterfacePreviewIdentity(identity: CurrentIdentityContext): Promise<CurrentIdentityContext | null> {
  const requestHeaders = await headers();
  if (requestHeaders.get(INTERFACE_PREVIEW_REQUEST_HEADER) !== "1") return null;
  if (identity.access_mode !== "administrative" || !isEstimuloAdministrativeEmail(identity.authenticated_email)) {
    throw new CurrentIdentityError("INTERFACE_PREVIEW_ADMIN_REQUIRED", "Administrative access is required for participant preview.");
  }

  const cookieStore = await cookies();
  const preview = parseInterfacePreviewIdentity(cookieStore.get(INTERFACE_PREVIEW_COOKIE)?.value);
  if (!preview) throw new CurrentIdentityError("INTERFACE_PREVIEW_IDENTITY_INVALID", "The preview participant is invalid.");

  const organization = administrativeOrganization(identity);
  if (!organization || organization.organization_id !== preview.organizationId) {
    throw new CurrentIdentityError("INTERFACE_PREVIEW_ORGANIZATION_INVALID", "The preview organization is invalid.");
  }

  const workspace = await extensionsRuntime.adminWorkspace(identity.user_account_id, organization.organization_id);
  const participant = workspace.participants.find((item) => item.user_account_id === preview.participantUserAccountId && item.entrepreneur_id);
  if (!participant?.entrepreneur_id) {
    throw new CurrentIdentityError("INTERFACE_PREVIEW_PARTICIPANT_UNAVAILABLE", "No eligible participant is available for preview.");
  }

  return {
    user_account_id: participant.user_account_id,
    entrepreneur_id: participant.entrepreneur_id,
    organizations: [],
    authenticated_email: participant.email.trim().toLowerCase(),
    authenticated_provider: identity.authenticated_provider,
    access_mode: "participant",
    next_path: "/empreendedor",
  };
}

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  let provider: "supabase" | "aws";
  try {
    provider = assertPlatformRuntimePolicy();
  } catch {
    return { status: "identity_error", reason: "RUNTIME_POLICY_REJECTED" };
  }

  if (provider === "aws") {
    return { status: "identity_error", reason: "AWS_IDENTITY_ARCHITECTURE_PENDING" };
  }

  const session = await createSessionClient();
  try {
    const authenticatedIdentity = await resolveCurrentIdentity(session);
    const identity = await resolveInterfacePreviewIdentity(authenticatedIdentity) ?? authenticatedIdentity;
    return {
      status: "authenticated",
      identity,
      email: identity.authenticated_email.trim().toLowerCase(),
      provider: identity.authenticated_provider,
    };
  } catch (error) {
    const reason = error instanceof CurrentIdentityError ? error.code : "IDENTITY_RESOLUTION_FAILED";
    if (reason === "AUTHENTICATED_SESSION_REQUIRED" || reason === "VERIFIED_SESSION_REQUIRED") {
      return { status: "anonymous" };
    }
    return { status: "identity_error", reason };
  }
});
