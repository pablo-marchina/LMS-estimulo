"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAdminLesson, saveAdminTrack } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { libraryRuntime } from "@/lib/library/runtime";
import { libraryContentBucket, removeLibraryContent, uploadLibraryContent } from "@/lib/storage/library-content";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function checked(formData: FormData, name: string) { return formData.get(name) === "on" || formData.get(name) === "true"; }
function deriveCode(source: string, fallback: string) { const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback; }
function positiveInteger(value: string, fallback = 1) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function secureExternalUrl(value: string): string | null { if (!value) return null; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
function selectedFile(formData: FormData, name: string) { const entry = formData.get(name); return entry instanceof File && entry.size > 0 ? entry : null; }
function objectSnapshot(formData: FormData, name: string): Record<string, unknown> { const raw = text(formData, name); if (!raw) return {}; try { const parsed = JSON.parse(raw) as unknown; return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }

const questionTypes = new Set(["single_choice", "multiple_choice", "true_false", "open_text"]);
function quizQuestionsFromForm(formData: FormData) {
  const count = Math.max(0, Number.parseInt(text(formData, "quiz_question_count"), 10) || 0);
  const questions: Array<{ code: string; prompt: string; question_type: string; position: number; options: Array<{ code: string; label: string; is_correct: boolean; position: number }> }> = [];
  for (let questionIndex = 0; questionIndex < count; questionIndex += 1) {
    const prompt = text(formData, `quiz_prompt_${questionIndex}`);
    if (!prompt) continue;
    const rawType = text(formData, `quiz_type_${questionIndex}`);
    const questionType = questionTypes.has(rawType) ? rawType : "single_choice";
    if (questionType === "open_text") { questions.push({ code: `pergunta_${questionIndex + 1}`, prompt, question_type: questionType, position: questionIndex + 1, options: [] }); continue; }
    const correctIndexes = new Set(formData.getAll(`quiz_correct_${questionIndex}`).map(String));
    const optionLimit = questionType === "true_false" ? 2 : 4;
    const options = [];
    for (let optionIndex = 0; optionIndex < optionLimit; optionIndex += 1) {
      const fallback = questionType === "true_false" ? (optionIndex === 0 ? "Verdadeiro" : "Falso") : "";
      const label = text(formData, `quiz_option_${questionIndex}_${optionIndex}`) || fallback;
      if (label) options.push({ code: `opcao_${optionIndex + 1}`, label, is_correct: correctIndexes.has(String(optionIndex)), position: optionIndex + 1 });
    }
    if (options.length >= 2 && options.some((option) => option.is_correct)) questions.push({ code: `pergunta_${questionIndex + 1}`, prompt, question_type: questionType, position: questionIndex + 1, options });
  }
  return questions;
}

async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) redirect("/admin/produto?erro=sem_permissao");
  return { auth, organizationId: organization.organization_id };
}

async function uploadInlineLibraryFile(input: { actor: string; organizationId: string; file: File }) {
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
    const confirmed = await libraryRuntime.confirmUpload({ actorUserAccountId: input.actor, organizationId: input.organizationId, uploadIntentId: intentId, actualContentType: input.file.type, actualSizeBytes: input.file.size, sha256: uploaded.sha256, providerObjectVersion: uploaded.providerObjectVersion, etag: uploaded.etag, metadata: { source: "activity_builder", originalFilename: input.file.name }, idempotencyKey: `${key}:confirm` });
    return confirmed.data.file_object_id;
  } catch (error) {
    if (intentId) await libraryRuntime.abortUpload(input.actor, input.organizationId, intentId, "INLINE_LIBRARY_UPLOAD_FAILED", `${key}:abort`).catch(() => undefined);
    if (objectCreated && objectKey) await removeLibraryContent(bucket, objectKey).catch(() => undefined);
    throw error;
  }
}

function fileFormat(file: File) { if (file.type === "application/pdf") return "pdf"; if (file.type.startsWith("image/")) return "image"; return "guide"; }
async function createInlineLibraryContent(input: { formData: FormData; actor: string; organizationId: string; journeyVersionId: string }) {
  const kindRaw = text(input.formData, "new_content_kind");
  const contentKind = kindRaw === "article" || kindRaw === "file" ? kindRaw : "external_link";
  const title = text(input.formData, "new_content_title");
  const summary = text(input.formData, "new_content_summary");
  if (!title || !summary) throw new Error("LIBRARY_CONTENT_FIELDS_REQUIRED");
  const file = contentKind === "file" ? selectedFile(input.formData, "new_content_file") : null;
  if (contentKind === "file" && !file) throw new Error("LIBRARY_CONTENT_FILE_REQUIRED");
  const externalUrl = contentKind === "external_link" ? secureExternalUrl(text(input.formData, "new_content_url")) : null;
  if (contentKind === "external_link" && !externalUrl) throw new Error("LIBRARY_CONTENT_URL_INVALID");
  const fileObjectId = file ? await uploadInlineLibraryFile({ actor: input.actor, organizationId: input.organizationId, file }) : null;
  const format = file ? fileFormat(file) : text(input.formData, "new_content_format") || (contentKind === "article" ? "article" : "video");
  const key = randomUUID();
  const draft = await libraryRuntime.saveDraft({ actorUserAccountId: input.actor, organizationId: input.organizationId, libraryItemId: null, slug: deriveCode(`${title}_${key.slice(0, 8)}`, "conteudo").replaceAll("_", "-"), title, summary, body: contentKind === "article" ? nullable(input.formData, "new_content_body") : null, contentKind, contentFormat: format, level: "all", estimatedMinutes: 10, sourceType: "estimulo", sourceName: "Estímulo", externalUrl, languageCode: "pt-BR", topics: [], visibility: "authenticated", journeyVersionIds: [input.journeyVersionId], discoverableInLibrary: checked(input.formData, "new_content_discoverable"), fileObjectId, idempotencyKey: `${key}:draft` });
  await libraryRuntime.publish(input.actor, input.organizationId, draft.data.library_item_version_id, draft.data.content_hash, `${key}:publish`);
  return draft.data.library_item_version_id;
}

export async function saveTrilhaAction(formData: FormData) {
  const { auth, organizationId } = await authorize();
  const journeyVersionId = text(formData, "journey_version_id");
  const pathTemplateId = nullable(formData, "path_template_id");
  const name = text(formData, "name");
  const back = `/admin/produto?etapa=conteudo&versao=${journeyVersionId}`;
  try {
    const result = await saveAdminTrack({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      payload: {
        journey_version_id: journeyVersionId,
        path_template_id: pathTemplateId,
        code: text(formData, "code") || deriveCode(name, `trilha_${randomUUID().slice(0, 8)}`),
        name,
        description: nullable(formData, "description"),
        position: positiveInteger(text(formData, "position")),
        is_default: checked(formData, "is_default"),
        is_required: checked(formData, "is_required"),
        presentation: { tone: text(formData, "tone") || "cyan", icon: text(formData, "icon") || "sparkles" },
        badge_title: text(formData, "badge_title"),
        badge_description: text(formData, "badge_description"),
      },
      idempotencyKey: randomUUID(),
    });
    revalidatePath("/admin/produto");
    revalidatePath("/empreendedor", "layout");
    redirect(`${back}&sucesso=${result.live_update ? "atualizado_ao_vivo" : "trilha_salva"}`);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`${back}&erro=${reason}`);
  }
}

export async function saveAulaAction(formData: FormData) {
  const { auth, organizationId } = await authorize();
  const actor = auth.identity.user_account_id;
  const journeyVersionId = text(formData, "journey_version_id");
  const pathTemplateId = text(formData, "path_template_id");
  const activityVersionId = nullable(formData, "activity_version_id");
  const stepId = nullable(formData, "step_id");
  const title = text(formData, "title");
  const position = positiveInteger(text(formData, "position"));
  const isClosing = checked(formData, "is_closing");
  const checklist = text(formData, "practice_checklist").split("\n").map((line) => line.trim()).filter(Boolean);
  const questions = quizQuestionsFromForm(formData);
  const contentSource = text(formData, "content_source") || (activityVersionId ? "current" : "none");
  const previousConfiguration = objectSnapshot(formData, "configuration_snapshot");
  const previousMetadata = objectSnapshot(formData, "metadata_snapshot");
  const { content_sections: _oldSections, prompts: _oldPrompts, practice_checklist: _oldChecklist, ...preservedConfiguration } = previousConfiguration;
  const configuration = { ...preservedConfiguration, ...(checklist.length ? { practice_checklist: checklist } : {}) };
  const back = `/admin/produto?etapa=conteudo&versao=${journeyVersionId}`;
  if (!title || !pathTemplateId || (isClosing && !checklist.length)) redirect(`${back}&erro=campos_incompletos`);

  try {
    let libraryItemVersionId = contentSource === "library" ? text(formData, "library_item_version_id") : "";
    let normalizedContentSource = contentSource;
    if (contentSource === "new") { libraryItemVersionId = await createInlineLibraryContent({ formData, actor, organizationId, journeyVersionId }); normalizedContentSource = "new"; }
    if (contentSource === "library" && !libraryItemVersionId) throw new Error("LIBRARY_CONTENT_REQUIRED");
    const stepCode = text(formData, "step_code") || `passo_${position}_${randomUUID().slice(0, 6)}`;
    const result = await saveAdminLesson({
      actorUserAccountId: actor,
      organizationId,
      payload: {
        path_template_id: pathTemplateId,
        step_id: stepId,
        step_code: deriveCode(stepCode, `passo_${position}`),
        activity_definition_code: text(formData, "activity_definition_code") || deriveCode(`${title}_${randomUUID().slice(0, 8)}`, "aula"),
        title,
        description: nullable(formData, "description"),
        activity_type: isClosing ? "practice" : "content",
        estimated_minutes: positiveInteger(text(formData, "estimated_minutes"), 10),
        configuration,
        position,
        is_required: checked(formData, "is_required"),
        metadata: { ...previousMetadata, always_available: previousMetadata.always_available ?? true },
        content_source: normalizedContentSource,
        library_item_version_id: libraryItemVersionId || null,
        content_required: checked(formData, "content_required"),
        assessment: questions.length ? { questions, passing_score: positiveInteger(text(formData, "quiz_passing_score"), 70), max_attempts: positiveInteger(text(formData, "quiz_max_attempts"), 3) } : null,
        practice: isClosing ? { submission_mode: text(formData, "submission_mode") || "file", allowed_evidence_types: ["file", "text"], review_required: checked(formData, "review_required") } : null,
      },
      idempotencyKey: randomUUID(),
    });
    revalidatePath("/admin/produto");
    revalidatePath("/empreendedor", "layout");
    redirect(`${back}&sucesso=${result.live_update ? "atualizado_ao_vivo" : "aula_salva"}`);
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`${back}&erro=${reason}`);
  }
}
