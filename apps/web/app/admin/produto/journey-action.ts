"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminProductWorkspace, saveAdminJourney } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { libraryRuntime } from "@/lib/library/runtime";
import { validateAnnouncementBanner } from "@/lib/storage/announcement-banners";
import { libraryContentBucket, removeLibraryContent, uploadLibraryContent } from "@/lib/storage/library-content";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function checked(formData: FormData, name: string) { return formData.get(name) === "on" || formData.get(name) === "true"; }
function positiveInteger(value: string, fallback = 9999) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function deriveCode(source: string, fallback: string) { const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback; }
function isUniqueConflict(error: unknown) { const message = error instanceof Error ? error.message : String(error); return /23505|duplicate key|unique constraint|already exists/i.test(message); }
function configuration(formData: FormData) {
  const raw = text(formData, "configuration_snapshot");
  if (!raw) return {} as Record<string, unknown>;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_CONFIGURATION_SNAPSHOT");
  return parsed as Record<string, unknown>;
}
function selectedFile(formData: FormData, name: string) { const entry = formData.get(name); return entry instanceof File && entry.size > 0 ? entry : null; }
function recordText(value: unknown, field: string) { return value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>)[field] === "string" ? String((value as Record<string, unknown>)[field]) : ""; }
function presentationTags(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : []; }
function journeySaveErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ANNOUNCEMENT_FILE_SIZE_INVALID")) return "imagem_tamanho_invalido";
  if (message.includes("ANNOUNCEMENT_CONTENT_TYPE_NOT_ALLOWED")) return "imagem_formato_invalido";
  if (message.includes("ANNOUNCEMENT_FILE_EXTENSION_NOT_ALLOWED")) return "imagem_extensao_invalida";
  if (message.includes("ANNOUNCEMENT_STORAGE_UPLOAD_FAILED") || message.includes("ANNOUNCEMENT_BUCKET_CREATE_FAILED")) return "imagem_upload_falhou";
  if (message.includes("INVALID_CONFIGURATION_SNAPSHOT")) return "configuracao_invalida";
  if (message.includes("COMPLETION_CERTIFICATE_REQUIRED")) return "certificado_conclusao_obrigatorio";
  if (message.includes("COMPLETION_CERTIFICATE_NOT_AVAILABLE_FOR_JOURNEY")) return "certificado_conclusao_incompativel";
  if (message.includes("FORBIDDEN")) return "sem_permissao";
  return "falha";
}

async function uploadJourneyCover(input: { actor: string; organizationId: string; file: File; role: "card" | "featured" }) {
  validateAnnouncementBanner(input.file);
  const bucket = libraryContentBucket();
  const key = randomUUID();
  let intentId: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
  try {
    const intent = await libraryRuntime.createUploadIntent({ actorUserAccountId: input.actor, organizationId: input.organizationId, originalFilename: input.file.name, expectedContentType: input.file.type, storageProvider: "supabase_storage", bucket, idempotencyKey: `${key}:intent` });
    intentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;
    const uploaded = await uploadLibraryContent({ bucket, objectKey, file: input.file });
    objectCreated = uploaded.created;
    const confirmed = await libraryRuntime.confirmUpload({ actorUserAccountId: input.actor, organizationId: input.organizationId, uploadIntentId: intentId, actualContentType: input.file.type, actualSizeBytes: input.file.size, sha256: uploaded.sha256, providerObjectVersion: uploaded.providerObjectVersion, etag: uploaded.etag, metadata: { source: "journey_cover", role: input.role, originalFilename: input.file.name }, idempotencyKey: `${key}:confirm` });
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
  const description = text(formData, "description");
  const existingCode = text(formData, "definition_code");
  const code = existingCode || deriveCode(publicTitle, `jornada_${randomUUID().slice(0, 8)}`);
  const journeyId = nullable(formData, "journey_id") ?? nullable(formData, "version_id");
  const themeIds = [...new Set(formData.getAll("theme_ids").map(String).filter(Boolean))];
  const completionCertificateEnabled = checked(formData, "completion_certificate_enabled");
  const completionCertificateVersionId = nullable(formData, "completion_certificate_version_id");
  let savedJourneyId = journeyId ?? "";
  let liveUpdate = false;
  let themeSaveFailed = false;
  let previousConfiguration: Record<string, unknown>;
  try {
    previousConfiguration = configuration(formData);
  } catch {
    redirect(`/admin/produto/erro?codigo=configuracao_invalida&versao=${encodeURIComponent(journeyId ?? "")}`);
  }

  if (completionCertificateEnabled) {
    if (!journeyId || !completionCertificateVersionId) {
      redirect(`/admin/produto?etapa=geral&versao=${encodeURIComponent(journeyId ?? "")}&erro=certificado_conclusao_obrigatorio`);
    }
    const productWorkspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id).catch(() => null);
    const compatibleCertificate = productWorkspace?.certificates
      .filter((definition) => definition.status !== "retired")
      .flatMap((definition) => definition.versions)
      .some((version) =>
        String(version.id) === completionCertificateVersionId &&
        version.status === "published" &&
        String(version.journey_version_id ?? "") === journeyId,
      );
    if (!compatibleCertificate) {
      redirect(`/admin/produto?etapa=geral&versao=${encodeURIComponent(journeyId)}&erro=certificado_conclusao_incompativel`);
    }
  }

  const previousPresentation = previousConfiguration.presentation && typeof previousConfiguration.presentation === "object" && !Array.isArray(previousConfiguration.presentation) ? previousConfiguration.presentation as Record<string, unknown> : {};
  const commandKey = randomUUID();

  try {
    // Theme metadata is an optional extension of the journey. A transient failure
    // in the extensions gateway must never prevent the primary journey draft
    // from being persisted.
    let tags = themeIds.length === 0 ? [] : presentationTags(previousPresentation.tags);
    if (themeIds.length > 0) {
      try {
        const extensionWorkspace = await extensionsRuntime.adminWorkspace(auth.identity.user_account_id, organization.organization_id);
        const themeNameById = new Map(extensionWorkspace.themes.filter((theme) => recordText(theme, "status") === "active").map((theme) => [recordText(theme, "id"), recordText(theme, "name")]));
        tags = themeIds.map((id) => themeNameById.get(id) ?? "").filter(Boolean).slice(0, 8);
      } catch {
        themeSaveFailed = true;
      }
    }

    const cardFile = selectedFile(formData, "card_background_file");
    const featuredFile = selectedFile(formData, "featured_background_file");
    const cardBackgroundId = cardFile ? await uploadJourneyCover({ actor: auth.identity.user_account_id, organizationId: organization.organization_id, file: cardFile, role: "card" }) : text(formData, "current_card_background_file_object_id") || previousPresentation.card_background_file_object_id;
    const featuredBackgroundId = featuredFile ? await uploadJourneyCover({ actor: auth.identity.user_account_id, organizationId: organization.organization_id, file: featuredFile, role: "featured" }) : text(formData, "current_featured_background_file_object_id") || previousPresentation.featured_background_file_object_id;
    const presentation = {
      ...previousPresentation,
      featured: checked(formData, "presentation_featured"),
      featured_rank: positiveInteger(text(formData, "presentation_featured_rank")),
      eyebrow: text(formData, "presentation_eyebrow"),
      badge: text(formData, "presentation_badge") || "Capacitação Estímulo",
      tone: text(formData, "presentation_tone") || "blue",
      icon: text(formData, "presentation_icon") || "sparkles",
      tags,
      cta: text(formData, "presentation_cta") || "Entrar nesta jornada",
      ...(cardBackgroundId ? { card_background_file_object_id: String(cardBackgroundId) } : {}),
      ...(featuredBackgroundId ? { featured_background_file_object_id: String(featuredBackgroundId) } : {}),
      card_background_alt: text(formData, "card_background_alt") || `Capa da jornada ${publicTitle}`,
      featured_background_alt: text(formData, "featured_background_alt") || `Imagem de destaque da jornada ${publicTitle}`,
    };
    // The journey configuration is the single source of truth for whether a
    // completion certificate is emitted and which published version is eligible.
    const completionCertificate = {
      enabled: completionCertificateEnabled,
      certificate_version_id: completionCertificateEnabled ? completionCertificateVersionId : null,
      trigger_event: "journey.instance.completed",
      data_fields: ["participant_name", "journey_title", "issued_at", "verification_code"],
    };

    const baseSlug = deriveCode(publicTitle, code).replaceAll("_", "-");
    const payload = {
      definition_id: nullable(formData, "definition_id"),
      journey_id: journeyId,
      version_id: journeyId,
      program_id: nullable(formData, "program_id"),
      code,
      slug: baseSlug,
      name: publicTitle,
      purpose: description,
      title: publicTitle,
      description,
      configuration: { ...previousConfiguration, presentation, completion_certificate: completionCertificate },
      eligible_archetype_codes: formData.getAll("eligible_archetype_codes").map(String),
    };

    let result: Awaited<ReturnType<typeof saveAdminJourney>>;
    try {
      result = await saveAdminJourney({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        payload,
        idempotencyKey: commandKey,
      });
    } catch (error) {
      if (journeyId || !isUniqueConflict(error)) throw error;
      const suffix = randomUUID().slice(0, 8);
      result = await saveAdminJourney({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        payload: {
          ...payload,
          code: `${code.slice(0, 60)}_${suffix}`,
          slug: `${baseSlug.slice(0, 60)}-${suffix}`,
        },
        idempotencyKey: `${commandKey}:unique-retry`,
      });
    }

    // Preserve the primary save result before secondary metadata work. If the
    // theme relationship fails, the newly-created journey must still reopen by
    // its real id instead of looking as though all entered data disappeared.
    savedJourneyId = (result as typeof result & { journey_id?: string }).journey_id ?? result.version_id;
    liveUpdate = result.live_update;

    try {
      await extensionsRuntime.saveAdmin({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        resourceType: "journey_themes_set",
        payload: { journey_definition_id: result.definition_id, theme_ids: themeIds },
        idempotencyKey: `${commandKey}:themes`,
      });
    } catch {
      themeSaveFailed = true;
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "admin_journey_save_failed",
      code: error instanceof Error && "code" in error ? String((error as Error & { code?: unknown }).code ?? "") : "",
      message: error instanceof Error ? error.message : String(error),
      editing_existing_journey: Boolean(journeyId),
    }));
    const reason = journeySaveErrorCode(error);
    redirect(`/admin/produto/erro?codigo=${encodeURIComponent(reason)}&versao=${encodeURIComponent(journeyId ?? "")}`);
  }
  revalidatePath("/admin/produto");
  revalidatePath("/empreendedor", "layout");
  const success = liveUpdate ? "atualizado_ao_vivo" : "rascunho_salvo";
  redirect(`/admin/produto?etapa=${themeSaveFailed ? "geral" : "conteudo"}&versao=${savedJourneyId}&sucesso=${success}${themeSaveFailed ? "&erro=temas_nao_salvos" : ""}`);
}
