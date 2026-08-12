"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { roleManagementRuntime } from "@/lib/admin/role-management";
import { usesCorporateGoogleIdentity } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const email = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
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
  const confirmationResult = confirmation("CONCEDER").safeParse(formData.get("confirmation"));
  if (!confirmationResult.success) redirect("/admin/usuarios?status=confirmacao_conceder_invalida");
  const context = await roleManagerContext(organizationId);
  await roleManagementRuntime.grant({
    actorUserAccountId: context.actorUserAccountId,
    organizationId,
    targetMembershipId: uuid.parse(formData.get("membership_id")),
    roleId: uuid.parse(formData.get("role_id")),
    validUntil: null,
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect("/admin/usuarios?status=concedido");
}

export async function revokeOrganizationRoleAction(formData: FormData) {
  const organizationId = uuid.parse(formData.get("organization_id"));
  const confirmationResult = confirmation("REMOVER").safeParse(formData.get("confirmation"));
  if (!confirmationResult.success) redirect("/admin/usuarios?status=confirmacao_remover_invalida");
  const context = await roleManagerContext(organizationId);
  await roleManagementRuntime.revoke({
    actorUserAccountId: context.actorUserAccountId,
    organizationId,
    targetMembershipId: uuid.parse(formData.get("membership_id")),
    roleId: uuid.parse(formData.get("role_id")),
    reason: "Administrador geral removido pela gestão de acessos.",
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID()),
  });
  redirect("/admin/usuarios?status=removido");
}

export async function sendUserPasswordRecoveryAction(formData: FormData) {
  const organizationId = uuid.parse(formData.get("organization_id"));
  await roleManagerContext(organizationId);
  const targetEmail = email.parse(formData.get("email"));

  if (usesCorporateGoogleIdentity(targetEmail)) {
    redirect("/admin/usuarios?status=acesso_google");
  }

  const client = await createSessionClient();
  const redirectTo = new URL("/auth/password-recovery", publicApplicationOrigin()).toString();
  const { error } = await client.auth.resetPasswordForEmail(targetEmail, { redirectTo });
  if (error) {
    console.error("ADMIN_PASSWORD_RECOVERY_REQUEST_FAILED", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    redirect("/admin/usuarios?status=recuperacao_falhou");
  }

  redirect("/admin/usuarios?status=recuperacao_enviada");
}
