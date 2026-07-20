"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { roleManagementRuntime } from "@/lib/admin/role-management";

const uuid = z.string().uuid();
const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/u;
const confirmation = (word: string) => z.string().trim().refine((value) => value === word, {
  message: `Digite ${word} para confirmar.`,
});

async function roleManagerContext(organizationId: string) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const organization = auth.identity.organizations.find(
    (candidate) => candidate.organization_id === organizationId,
  );
  if (!organization || !organization.permissions.includes("iam.memberships.manage")) {
    throw new Error("ROLE_MANAGEMENT_FORBIDDEN");
  }
  return { actorUserAccountId: auth.identity.user_account_id };
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
