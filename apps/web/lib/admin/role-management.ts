import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";

export type ManagedRole = {
  role_id: string;
  role_code: string;
  role_name: string;
  scope: Record<string, unknown>;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
};

export type ManagedMembership = {
  membership_id: string | null;
  user_account_id: string;
  email: string;
  account_status: string;
  membership_status: string;
  valid_from: string | null;
  valid_until: string | null;
  roles: ManagedRole[];
};

export type AvailableRole = {
  role_id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  permissions: string[];
};

export type RoleManagementWorkspace = {
  organization_id: string;
  memberships: ManagedMembership[];
  roles: AvailableRole[];
};

export type RoleMutationResult = {
  membership_id: string;
  role_id: string;
  role_code?: string;
  valid_from?: string;
  valid_until?: string | null;
  revoked_at?: string;
  reason?: string;
  self_revocation?: boolean;
};

export const roleManagementRuntime = {
  list: (actorUserAccountId: string, organizationId: string) =>
    invokeServerRpc<RoleManagementWorkspace>("list_organization_role_management", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    }),

  grant: (input: {
    actorUserAccountId: string;
    organizationId: string;
    targetMembershipId: string;
    roleId: string;
    validUntil: string | null;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<RoleMutationResult>>("grant_organization_role", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_target_membership_id: input.targetMembershipId,
    p_role_id: input.roleId,
    p_scope: { all: true },
    p_valid_until: input.validUntil,
    p_idempotency_key: input.idempotencyKey,
  }),

  revoke: (input: {
    actorUserAccountId: string;
    organizationId: string;
    targetMembershipId: string;
    roleId: string;
    reason: string;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<RoleMutationResult>>("revoke_organization_role", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_target_membership_id: input.targetMembershipId,
    p_role_id: input.roleId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  }),
};
