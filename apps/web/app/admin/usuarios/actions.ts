"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { roleManagementRuntime } from "@/lib/admin/role-management";

const uuid = z.string().uuid();
const confirmation = (word: string) => z.string().trim().refine((value) => value === word, { message: `Digite ${word} para confirmar.` });

async function roleManagerContext(organizationId: string) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const organization = auth.identity.organizations.find((candidate) => candidate.organization_id === organizationId);
  if (!organization?.permissions.includes("iam.memberships.manage")) throw new Error("ROLE_MANAGEMENT_FORBIDDEN");
  return { actorUserAccountId: auth.identity.user_account_id };
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
    validUntil: null,
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect(`/admin/usuarios?status=concedido`);
}

export async function revokeOrganizationRoleAction(formData: FormData) {
  const organizationId = uuid.parse(formData.get("organization_id"));
  confirmation("REMOVER").parse(formData.get("confirmation"));
  const context = await roleManagerContext(organizationId);
  await roleManagementRuntime.revoke({
    actorUserAccountId: context.actorUserAccountId,
    organizationId,
    targetMembershipId: uuid.parse(formData.get("membership_id")),
    roleId: uuid.parse(formData.get("role_id")),
    reason: "Administrador geral removido pela gestão de acessos.",
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect(`/admin/usuarios?status=removido`);
}
