"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { identityResolutionRuntime } from "@/lib/admin/identity-resolution";
import { roleManagementRuntime } from "@/lib/admin/role-management";

const uuid = z.string().uuid();
const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/u;
const confirmation = (word: string) => z.string().trim().refine((value) => value === word, {
  message: `Digite ${word} para confirmar.`,
});

async function authenticatedOrganization(organizationId: string) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const organization = auth.identity.organizations.find(
    (candidate) => candidate.organization_id === organizationId,
  );
  if (!organization) throw new Error("ORGANIZATION_ACCESS_FORBIDDEN");
  return { auth, organization };
}

async function roleManagerContext(organizationId: string) {
  const context = await authenticatedOrganization(organizationId);
  if (!context.organization.permissions.includes("iam.memberships.manage")) {
    throw new Error("ROLE_MANAGEMENT_FORBIDDEN");
  }
  return { actorUserAccountId: context.auth.identity.user_account_id };
}

async function identityManagerContext(organizationId: string) {
  const context = await authenticatedOrganization(organizationId);
  if (!context.organization.permissions.some((permission) => permission === "iam.accounts.manage" || permission === "integration.manage")) {
    throw new Error("IDENTITY_MANAGEMENT_FORBIDDEN");
  }
  return { actorUserAccountId: context.auth.identity.user_account_id };
}

function optionalValidUntil(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!localDateTime.test(text)) throw new Error("ROLE_VALID_UNTIL_INVALID");
  const withSeconds = text.length === 16 ? `${text}:00` : text;
  const date = new Date(`${withSeconds}-03:00`);
  if (Number.isNaN(date.valueOf())) throw new Error("ROLE_VALID_UNTIL_INVALID");
  return date.toISOString();
}

export async function grantOrganizationRoleAction(formData: FormData) {
  const organizationId = uuid.parse(formData.get("organization_id"));
  confirmation("CONCEDER").parse(formData.get("confirmation"));
  const context = await roleManagerContext(organizationId);
  await roleManagementRuntime.grant({
    actorUserAccountId: context.actorUserAccountId,
    organizationId,
    targetMembershipId: uuid.parse(formData.get("membership_id")),
    roleId: uuid.parse(formData.get("role_id")),
    validUntil: optionalValidUntil(formData.get("valid_until")),
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect(`/admin/usuarios?organization=${organizationId}&status=concedido`);
}

export async function revokeOrganizationRoleAction(formData: FormData) {
  const organizationId = uuid.parse(formData.get("organization_id"));
  confirmation("REMOVER").parse(formData.get("confirmation"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  const context = await roleManagerContext(organizationId);
  await roleManagementRuntime.revoke({
    actorUserAccountId: context.actorUserAccountId,
    organizationId,
    targetMembershipId: uuid.parse(formData.get("membership_id")),
    roleId: uuid.parse(formData.get("role_id")),
    reason,
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect(`/admin/usuarios?organization=${organizationId}&status=removido`);
}

export async function resolveIdentityCaseAction(formData: FormData) {
  const organizationId = uuid.parse(formData.get("organization_id"));
  const action = z.enum(["link_existing", "create_new", "dismiss"]).parse(formData.get("resolution_action"));
  const context = await identityManagerContext(organizationId);
  await identityResolutionRuntime.resolve({
    actorUserAccountId: context.actorUserAccountId,
    organizationId,
    caseId: uuid.parse(formData.get("case_id")),
    action,
    externalObjectId: String(formData.get("external_object_id") ?? "").trim() || null,
    note: z.string().trim().max(1000).parse(formData.get("note") ?? "") || null,
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect(`/admin/usuarios?organization=${organizationId}&identidades=${action}`);
}
