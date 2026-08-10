"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { engagementRuntime } from "@/lib/engagement/runtime";

const schema = z.object({
  organizationId: z.string().uuid(),
  announcementId: z.string().uuid().nullable(),
  expectedVersion: z.number().int().nonnegative().nullable(),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1200),
  ctaUrl: z.string().trim().max(500).nullable(),
  status: z.enum(["draft", "published", "retired"]),
  priority: z.number().int().min(-1000).max(1000),
  startsAt: z.string().datetime({ offset: true }).nullable(),
  endsAt: z.string().datetime({ offset: true }).nullable(),
});

function nullable(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function isoDate(value: FormDataEntryValue | null): string | null {
  const text = nullable(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "invalid";
}

export async function saveAnnouncementAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }

  const parsed = schema.safeParse({
    organizationId: String(formData.get("organization_id") ?? ""),
    announcementId: nullable(formData.get("announcement_id")),
    expectedVersion: nullable(formData.get("expected_version")) === null ? null : Number(formData.get("expected_version")),
    title: formData.get("title"),
    body: formData.get("body"),
    ctaUrl: nullable(formData.get("cta_url")),
    status: formData.get("status"),
    priority: Number(formData.get("priority") ?? 0),
    startsAt: isoDate(formData.get("starts_at")),
    endsAt: isoDate(formData.get("ends_at")),
  });
  if (!parsed.success) redirect("/admin/engajamento?erro=dados_invalidos");

  const organization = auth.identity.organizations.find((item) => item.organization_id === parsed.data.organizationId);
  if (!organization?.permissions.includes("engagement.manage")) redirect("/admin/engajamento?erro=sem_permissao");
  if (parsed.data.endsAt && parsed.data.startsAt && parsed.data.endsAt <= parsed.data.startsAt) redirect("/admin/engajamento?erro=periodo_invalido");

  try {
    await engagementRuntime.saveAnnouncement({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: parsed.data.organizationId,
      announcementId: parsed.data.announcementId,
      expectedVersion: parsed.data.expectedVersion,
      title: parsed.data.title,
      body: parsed.data.body,
      ctaLabel: parsed.data.ctaUrl ? (parsed.data.title || "Abrir anúncio") : null,
      ctaUrl: parsed.data.ctaUrl,
      status: parsed.data.status,
      priority: parsed.data.priority,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      imageFileObjectId: null,
      mobileImageFileObjectId: null,
      imageAlt: null,
      displayMode: "image_with_text",
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    redirect(`/admin/engajamento?erro=${code.includes("VERSION_CONFLICT") ? "conflito_versao" : "falha"}`);
  }
  redirect("/admin/engajamento?sucesso=salvo");
}
