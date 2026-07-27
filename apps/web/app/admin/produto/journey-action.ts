"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { saveAdminProductResource } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { libraryRuntime } from "@/lib/library/runtime";
import { validateAnnouncementBanner } from "@/lib/storage/announcement-banners";
import { libraryContentBucket, removeLibraryContent, uploadLibraryContent } from "@/lib/storage/library-content";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function checked(formData: FormData, name: string) { return formData.get(name) === "on" || formData.get(name) === "true"; }
function positiveInteger(value: string, fallback = 9999) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function deriveCode(source: string, fallback: string) {
  const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback;
}
function configuration(formData: FormData) {
  const raw = text(formData, "configuration_snapshot");
  if (!raw) return {} as Record<string, unknown>;
  try { const parsed = JSON.parse(raw) as unknown; return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}
function selectedFile(formData: FormData, name: string) {
  const entry = formData.get(name);
  return entry instanceof File && entry.size > 0 ? entry : null;
}

async function uploadJourneyCover(input: { actor: string; organizationId: string; file: File; role: "card" | "featured" }) {
  validateAnnouncementBanner(input.file);
  const bucket = libraryContentBucket();
  const key = randomUUID();
  let intentId: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
  try {
    const intent = await libraryRuntime.createUploadIntent({
      actorUserAccountId: input.actor,
      organizationId: input.organizationId,
      originalFilename: input.file.name,
      expectedContentType: input.file.type,
      storageProvider: "supabase_storage",
      bucket,
      idempotencyKey: `${key}:intent`,
    });
    intentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;
    const uploaded = await uploadLibraryContent({ bucket, objectKey, file: input.file });
    objectCreated = uploaded.created;
    const confirmed = await libraryRuntime.confirmUpload({
      actorUserAccountId: input.actor,
      organizationId: input.organizationId,
      uploadIntentId: intentId,
      actualContentType: input.file.type,
      actualSizeBytes: input.file.size,
      sha256: uploaded.sha256,
      providerObjectVersion: uploaded.providerObjectVersion,
      etag: uploaded.etag,
      metadata: { source: "journey_cover", role: input.role, originalFilename: input.file.name },
      idempotencyKey: `${key}:confirm`,
    });
    return confirmed.data.file_object_id;
  } catch (error) {
    if (intentId) await libraryRuntime.abortUpload(input.actor, input.organizationId, intentId, "JOURNEY_COVER_UPLOAD_FAILED", `${key}:abort`).catch(() => undefined);
    if (objectCreated && objectKey) await removeLibraryContent(bucket, objectKey).catch(() => undefined);
    throw error;
  }
}

export async function saveJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) redirect("/admin/produto?erro=sem_permissao");

  const publicTitle = text(formData, "title");
  const name = text(formData, "name") || publicTitle;
  const existingCode = text(formData, "definition_code");
  const code = existingCode || deriveCode(name, `jornada_${randomUUID().slice(0, 8)}`);
  const versionId = nullable(formData, "version_id");
  let savedVersionId = versionId ?? "";
  const previousConfiguration = configuration(formData);
  const previousPresentation = previousConfiguration.presentation && typeof previousConfiguration.presentation === "object" && !Array.isArray(previousConfiguration.presentation) ? previousConfiguration.presentation as Record<string, unknown> : {};
  const tags = text(formData, "presentation_tags").split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 8);

  try {
    const cardFile = selectedFile(formData, "card_background_file");
    const featuredFile = selectedFile(formData, "featured_background_file");
    const cardBackgroundId = cardFile ? await uploadJourneyCover({ actor: auth.identity.user_account_id, organizationId: organization.organization_id, file: cardFile, role: "card" }) : text(formData, "current_card_background_file_object_id") || previousPresentation.card_background_file_object_id;
    const featuredBackgroundId = featuredFile ? await uploadJourneyCover({ actor: auth.identity.user_account_id, organizationId: organization.organization_id, file: featuredFile, role: "featured" }) : text(formData, "current_featured_background_file_object_id") || previousPresentation.featured_background_file_object_id;
    const presentation = {
      ...previousPresentation,
      featured: checked(formData, "presentation_featured"),
      featured_rank: positiveInteger(text(formData, "presentation_featured_rank")),
      eyebrow: text(formData, "presentation_eyebrow") || "Jornada Estímulo",
      badge: text(formData, "presentation_badge") || "Capacitação Estímulo",
      tone: text(formData, "presentation_tone") || "blue",
      icon: text(formData, "presentation_icon") || "sparkles",
      tags,
      cta: text(formData, "presentation_cta") || "Entrar nesta jornada",
      ...(cardBackgroundId ? { card_background_file_object_id: String(cardBackgroundId) } : {}),
      ...(featuredBackgroundId ? { featured_background_file_object_id: String(featuredBackgroundId) } : {}),
      card_background_alt: text(formData, "card_background_alt") || `Capa da jornada ${publicTitle || name}`,
      featured_background_alt: text(formData, "featured_background_alt") || `Imagem de destaque da jornada ${publicTitle || name}`,
    };

    const result = await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      resourceType: "journey",
      payload: {
        definition_id: nullable(formData, "definition_id"),
        version_id: versionId,
        program_id: nullable(formData, "program_id"),
        code,
        slug: deriveCode(name, code).replaceAll("_", "-"),
        name,
        purpose: text(formData, "purpose"),
        title: publicTitle || name,
        description: text(formData, "description"),
        configuration: { ...previousConfiguration, presentation },
        eligible_archetype_codes: formData.getAll("eligible_archetype_codes").map(String),
      },
      idempotencyKey: randomUUID(),
    });
    savedVersionId = String(result.version_id ?? savedVersionId);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?etapa=jornada&versao=${versionId ?? ""}&erro=${reason}`);
  }
  redirect(`/admin/produto?etapa=trilhas&versao=${savedVersionId}&sucesso=jornada_salva`);
}
