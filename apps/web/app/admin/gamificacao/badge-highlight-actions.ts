"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { badgeHighlightsRuntime } from "@/lib/engagement/badge-highlights-runtime";

export async function saveHomeBadgeHighlightsAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const organization = administrativeOrganization(auth.identity);
  if (!organization || !organization.permissions.includes("engagement.manage")) {
    redirect("/admin/gamificacao?tipo=selos&erro=sem_permissao");
  }

  const badgeVersionIds = formData
    .getAll("badge_version_id")
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
  const displayLimit = Number.parseInt(String(formData.get("display_limit") ?? "3"), 10);

  try {
    await badgeHighlightsRuntime.save({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      badgeVersionIds,
      displayLimit,
      idempotencyKey: randomUUID(),
    });
  } catch {
    redirect("/admin/gamificacao?tipo=selos&erro=destaques");
  }

  redirect("/admin/gamificacao?tipo=selos&sucesso=destaques");
}
