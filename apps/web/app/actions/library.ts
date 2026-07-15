"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";

const uuid = z.string().uuid();
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const contentKind = z.enum(["article", "external_link"]);
const contentFormat = z.enum(["article", "video", "podcast", "guide", "tool", "course", "other"]);
const level = z.enum(["introductory", "intermediate", "advanced", "all"]);
const sourceType = z.enum(["estimulo", "partner", "external"]);
const visibility = z.enum(["authenticated", "organization"]);

async function actorId() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  return auth.identity.user_account_id;
}

function optionalUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text ? uuid.parse(text) : null;
}

export async function saveLibraryContentAction(formData: FormData) {
  const actor = await actorId();
  const organizationId = uuid.parse(formData.get("organization_id"));
  const kind = contentKind.parse(formData.get("content_kind"));
  const topics = String(formData.get("topics") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const journeyVersionIds = formData.getAll("journey_version_ids").map((value) => uuid.parse(value));
  const body = String(formData.get("body") ?? "").trim();
  const externalUrl = String(formData.get("external_url") ?? "").trim();

  await libraryRuntime.saveDraft({
    actorUserAccountId: actor,
    organizationId,
    libraryItemId: optionalUuid(formData.get("library_item_id")),
    slug: slug.parse(formData.get("slug")),
    title: z.string().trim().min(3).max(200).parse(formData.get("title")),
    summary: z.string().trim().min(10).max(600).parse(formData.get("summary")),
    body: kind === "article" ? z.string().trim().min(1).max(30000).parse(body) : null,
    contentKind: kind,
    contentFormat: contentFormat.parse(formData.get("content_format")),
    level: level.parse(formData.get("level")),
    estimatedMinutes: z.coerce.number().int().min(1).max(600).parse(formData.get("estimated_minutes")),
    sourceType: sourceType.parse(formData.get("source_type")),
    sourceName: z.string().trim().min(2).max(120).parse(formData.get("source_name")),
    externalUrl: kind === "external_link" ? z.string().url().startsWith("https://").parse(externalUrl) : null,
    languageCode: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).parse(formData.get("language_code")),
    topics,
    visibility: visibility.parse(formData.get("visibility")),
    journeyVersionIds,
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID())
  });

  redirect(`/admin/biblioteca?organization=${organizationId}&salvo=1`);
}

export async function publishLibraryContentAction(formData: FormData) {
  const actor = await actorId();
  const organizationId = uuid.parse(formData.get("organization_id"));
  await libraryRuntime.publish(
    actor,
    organizationId,
    uuid.parse(formData.get("library_item_version_id")),
    z.string().regex(/^[0-9a-f]{64}$/).parse(formData.get("content_hash")),
    String(formData.get("idempotency_key") || randomUUID())
  );
  redirect(`/admin/biblioteca?organization=${organizationId}&publicado=1`);
}

export async function openLibraryContentAction(formData: FormData) {
  const actor = await actorId();
  const slugValue = slug.parse(formData.get("slug"));
  const result = await libraryRuntime.recordAccess({
    actorUserAccountId: actor,
    libraryItemVersionId: uuid.parse(formData.get("library_item_version_id")),
    action: "open",
    source: "library_detail",
    idempotencyKey: String(formData.get("idempotency_key") || randomUUID())
  });
  if (result.data.content_kind === "external_link" && result.data.external_url) redirect(result.data.external_url);
  redirect(`/capacitacao/biblioteca/${slugValue}#conteudo`);
}
