"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { saveAdminProductResource } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function checked(formData: FormData, name: string) { return formData.get(name) === "on" || formData.get(name) === "true"; }
function deriveCode(source: string, fallback: string) {
  const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback;
}
function positiveInteger(value: string, fallback = 1) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }

function quizQuestionsFromForm(formData: FormData) {
  const questions: Array<{ code: string; prompt: string; position: number; options: Array<{ code: string; label: string; is_correct: boolean; position: number }> }> = [];
  for (let questionIndex = 0; questionIndex < 5; questionIndex += 1) {
    const prompt = text(formData, `quiz_prompt_${questionIndex}`);
    if (!prompt) continue;
    const correctIndex = text(formData, `quiz_correct_${questionIndex}`);
    const options = [];
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      const label = text(formData, `quiz_option_${questionIndex}_${optionIndex}`);
      if (!label) continue;
      options.push({ code: `opcao_${optionIndex + 1}`, label, is_correct: String(optionIndex) === correctIndex, position: optionIndex + 1 });
    }
    if (options.length >= 2 && options.some((option) => option.is_correct)) questions.push({ code: `pergunta_${questionIndex + 1}`, prompt, position: questionIndex + 1, options });
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

export async function saveTrilhaAction(formData: FormData) {
  const { auth, organizationId } = await authorize();
  const journeyVersionId = text(formData, "journey_version_id");
  const name = text(formData, "name");
  try {
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "path_template",
      payload: { journey_version_id: journeyVersionId, name, description: nullable(formData, "description"), position: positiveInteger(text(formData, "position")), code: deriveCode(name, "trilha") },
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?etapa=trilhas&versao=${journeyVersionId}&erro=${reason}`);
  }
  redirect(`/admin/produto?etapa=trilhas&versao=${journeyVersionId}&sucesso=trilha_salva`);
}

export async function saveAulaAction(formData: FormData) {
  const { auth, organizationId } = await authorize();
  const journeyVersionId = text(formData, "journey_version_id");
  const pathTemplateId = text(formData, "path_template_id");
  const title = text(formData, "title");
  const position = positiveInteger(text(formData, "position"));
  const isClosing = checked(formData, "is_closing");
  const prompts = [0,1,2,3,4,5].map((index) => ({ title: text(formData, `prompt_title_${index}`), text: text(formData, `prompt_text_${index}`) })).filter((prompt) => prompt.title && prompt.text);
  const checklist = text(formData, "practice_checklist").split("\n").map((line) => line.trim()).filter(Boolean);
  const questions = quizQuestionsFromForm(formData);
  const back = `/admin/produto?etapa=aulas&versao=${journeyVersionId}&trilha=${pathTemplateId}`;
  if (!title || !pathTemplateId || (isClosing && (!questions.length || !checklist.length))) redirect(`${back}&erro=campos_incompletos`);

  try {
    const activityResult = await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "activity",
      payload: {
        code: deriveCode(`${title}_${randomUUID().slice(0, 8)}`, "aula"),
        name: title,
        title,
        description: nullable(formData, "description"),
        activity_type: isClosing ? "practice" : "content",
        estimated_minutes: positiveInteger(text(formData, "estimated_minutes"), 10),
        configuration: { ...(prompts.length ? { prompts } : {}), ...(checklist.length ? { practice_checklist: checklist } : {}) },
        ...(isClosing ? { assessment: { questions }, practice: { submission_mode: "file", allowed_evidence_types: ["file", "text"], review_required: true } } : {}),
      },
      idempotencyKey: randomUUID(),
    });
    const activityVersionId = String(activityResult.version_id ?? "");
    if (!activityVersionId) throw new Error("ACTIVITY_VERSION_MISSING");
    const stepCode = `passo_${position}`;
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "path_step",
      payload: { code: deriveCode(stepCode, "passo"), path_template_id: pathTemplateId, step_code: stepCode, activity_version_id: activityVersionId, position, is_required: true, metadata: {} },
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`${back}&erro=${reason}`);
  }
  redirect(`${back}&sucesso=aula_salva`);
}