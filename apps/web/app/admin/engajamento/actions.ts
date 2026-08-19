"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
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

const retireSchema = z.object({
  organizationId: z.string().uuid(),
  announcementId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
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

async function adminContext(organizationId: string) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("engagement.manage")) redirect("/admin/engajamento?erro=sem_permissao");
  return auth;
}

export async function saveAnnouncementAction(formData: FormData) {
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

  const auth = await adminContext(parsed.data.organizationId);
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

export async function retireAnnouncementAction(formData: FormData) {
  const parsed = retireSchema.safeParse({
    organizationId: String(formData.get("organization_id") ?? ""),
    announcementId: String(formData.get("announcement_id") ?? ""),
    expectedVersion: Number(formData.get("expected_version")),
  });
  if (!parsed.success) redirect("/admin/engajamento?view=gerenciar&erro=dados_invalidos");

  const auth = await adminContext(parsed.data.organizationId);
  let announcement: Awaited<ReturnType<typeof engagementRuntime.listOperatorAnnouncements>>["announcements"][number] | null = null;
  try {
    const workspace = await engagementRuntime.listOperatorAnnouncements(auth.identity.user_account_id, parsed.data.organizationId);
    announcement = workspace.announcements.find((item) => item.id === parsed.data.announcementId) ?? null;
  } catch {
    redirect("/admin/engajamento?view=gerenciar&erro=falha");
  }

  // Keep redirects outside the persistence try/catch. Next.js implements
  // redirect() by throwing a controlled exception, which must not be mistaken
  // for an archive failure.
  if (!announcement) redirect("/admin/engajamento?view=gerenciar&erro=anuncio_inexistente");

  try {
    await engagementRuntime.saveAnnouncement({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: parsed.data.organizationId,
      announcementId: announcement.id,
      expectedVersion: parsed.data.expectedVersion,
      title: announcement.title,
      body: announcement.body,
      ctaLabel: announcement.cta_label,
      ctaUrl: announcement.cta_url,
      status: "retired",
      priority: announcement.priority,
      startsAt: announcement.starts_at,
      endsAt: announcement.ends_at,
      imageFileObjectId: announcement.image_file_object_id,
      mobileImageFileObjectId: announcement.mobile_image_file_object_id,
      imageAlt: announcement.image_alt,
      displayMode: announcement.display_mode,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    redirect(`/admin/engajamento?view=gerenciar&erro=${code.includes("VERSION_CONFLICT") ? "conflito_versao" : "falha"}`);
  }
  redirect("/admin/engajamento?view=gerenciar&sucesso=excluido");
}
