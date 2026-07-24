"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { saveAdminProductResource } from "@/lib/admin/product-management";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullable(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function json(formData: FormData, name: string, fallback: unknown = {}) {
  const value = text(formData, name);
  if (!value) return fallback;
  return JSON.parse(value) as unknown;
}

function deriveCode(source: string, fallback: string) {
  const slug = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback;
}

function positiveInteger(value: string, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function quizQuestionsFromForm(formData: FormData) {
  const questions: Array<{
    code: string;
    prompt: string;
    position: number;
    options: Array<{ code: string; label: string; is_correct: boolean; position: number }>;
  }> = [];

  for (let questionIndex = 0; questionIndex < 5; questionIndex += 1) {
    const prompt = text(formData, `quiz_prompt_${questionIndex}`);
    if (!prompt) continue;

    const correctIndex = text(formData, `quiz_correct_${questionIndex}`);
    const options = [];
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      const label = text(formData, `quiz_option_${questionIndex}_${optionIndex}`);
      if (!label) continue;
      options.push({
        code: `opcao_${optionIndex + 1}`,
        label,
        is_correct: String(optionIndex) === correctIndex,
        position: optionIndex + 1,
      });
    }

    if (options.length < 2 || !options.some((option) => option.is_correct)) continue;
    questions.push({
      code: `pergunta_${questionIndex + 1}`,
      prompt,
      position: questionIndex + 1,
      options,
    });
  }

  return questions;
}

async function authorize(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar?erro=acesso_nao_autorizado");
  }
  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    redirect(`/admin/produto?organization=${organizationId}&erro=sem_permissao`);
  }
  return { auth, organizationId };
}

export async function saveTrilhaAction(formData: FormData) {
  const { auth, organizationId } = await authorize(formData);
  const journeyVersionId = text(formData, "journey_version_id");
  const name = text(formData, "name");
  const payload = {
    journey_version_id: journeyVersionId,
    name,
    description: nullable(formData, "description"),
    position: positiveInteger(text(formData, "position")),
    code: deriveCode(name, "trilha"),
  };
  try {
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "path_template",
      payload,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&erro=${reason}`);
  }
  redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&sucesso=trilha_salva`);
}

export async function saveAulaAction(formData: FormData) {
  const { auth, organizationId } = await authorize(formData);
  const journeyVersionId = text(formData, "journey_version_id");
  const pathTemplateId = text(formData, "path_template_id");
  const title = text(formData, "title");
  const position = positiveInteger(text(formData, "position"));
  const isClosing = checked(formData, "is_closing");
  const prompts = [0, 1, 2, 3, 4, 5]
    .map((index) => ({
      title: text(formData, `prompt_title_${index}`),
      text: text(formData, `prompt_text_${index}`),
    }))
    .filter((prompt) => prompt.title && prompt.text);
  const checklist = text(formData, "practice_checklist")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const questions = quizQuestionsFromForm(formData);

  if (!title || !pathTemplateId || (isClosing && (!questions.length || !checklist.length))) {
    redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&erro=campos_incompletos`);
  }

  const activityPayload: Record<string, unknown> = {
    code: deriveCode(`${title}_${randomUUID().slice(0, 8)}`, "aula"),
    name: title,
    title,
    description: nullable(formData, "description"),
    activity_type: isClosing ? "practice" : "content",
    estimated_minutes: positiveInteger(text(formData, "estimated_minutes"), 10),
    configuration: {
      ...(prompts.length ? { prompts } : {}),
      ...(checklist.length ? { practice_checklist: checklist } : {}),
    },
    ...(isClosing ? { assessment: { questions } } : {}),
    ...(isClosing ? {
      practice: {
        submission_mode: "file",
        allowed_evidence_types: ["file", "text"],
        review_required: true,
      },
    } : {}),
  };

  try {
    const activityResult = await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "activity",
      payload: activityPayload,
      idempotencyKey: randomUUID(),
    });
    const activityVersionId = String(activityResult.version_id ?? "");
    if (!activityVersionId) throw new Error("ACTIVITY_VERSION_MISSING");

    const stepCode = `passo_${position}`;
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "path_step",
      payload: {
        code: deriveCode(stepCode, "passo"),
        path_template_id: pathTemplateId,
        step_code: stepCode,
        activity_version_id: activityVersionId,
        position,
        is_required: true,
        metadata: {},
      },
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&erro=${reason}`);
  }

  redirect(`/admin/produto?organization=${organizationId}&versao=${journeyVersionId}&sucesso=aula_salva`);
}

export async function saveProductResourceAction(formData: FormData) {
  const { auth, organizationId } = await authorize(formData);
  const resourceType = text(formData, "resource_type") as "journey" | "activity" | "path_step" | "rule";
  let payload: Record<string, unknown>;

  try {
    if (resourceType === "journey") {
      payload = {
        definition_id: nullable(formData, "definition_id"),
        version_id: nullable(formData, "version_id"),
        program_id: nullable(formData, "program_id"),
        code: text(formData, "code"),
        slug: text(formData, "slug"),
        name: text(formData, "name"),
        purpose: text(formData, "purpose"),
        title: text(formData, "title"),
        description: text(formData, "description"),
        configuration: json(formData, "configuration", {}),
        eligible_archetype_codes: formData.getAll("eligible_archetype_codes").map(String),
      };
    } else if (resourceType === "activity") {
      const assetTitle = nullable(formData, "asset_title");
      const activityType = text(formData, "activity_type");
      payload = {
        definition_id: nullable(formData, "definition_id"),
        version_id: nullable(formData, "version_id"),
        code: text(formData, "code"),
        name: text(formData, "name"),
        title: text(formData, "title"),
        description: text(formData, "description"),
        activity_type: activityType,
        estimated_minutes: Number(text(formData, "estimated_minutes") || 0),
        configuration: json(formData, "configuration", {}),
        ...(assetTitle ? {
          asset: {
            type: text(formData, "asset_type") || "external_link",
            title: assetTitle,
            url: nullable(formData, "asset_url"),
            language: text(formData, "asset_language") || "pt-BR",
            required: checked(formData, "asset_required"),
            accessibility: json(formData, "asset_accessibility", {}),
          },
        } : {}),
        ...(activityType === "practice" ? {
          practice: {
            submission_mode: text(formData, "submission_mode") || "file",
            allowed_evidence_types: json(formData, "allowed_evidence_types", ["file"]),
            max_submissions: nullable(formData, "max_submissions") ? Number(text(formData, "max_submissions")) : null,
            review_required: checked(formData, "review_required"),
            terms_version: nullable(formData, "terms_version"),
          },
        } : {}),
      };
    } else if (resourceType === "path_step") {
      payload = {
        path_template_id: nullable(formData, "path_template_id"),
        step_id: nullable(formData, "step_id"),
        code: deriveCode(text(formData, "step_code"), "bloco"),
        step_code: text(formData, "step_code"),
        activity_version_id: text(formData, "activity_version_id"),
        position: Number(text(formData, "position") || 1),
        is_required: checked(formData, "is_required"),
        availability_rule_version_id: nullable(formData, "availability_rule_version_id"),
        completion_rule_version_id: nullable(formData, "completion_rule_version_id"),
        due_offset: nullable(formData, "due_offset"),
        metadata: json(formData, "metadata", {}),
      };
    } else if (resourceType === "rule") {
      payload = {
        definition_id: nullable(formData, "definition_id"),
        version_id: nullable(formData, "version_id"),
        code: text(formData, "code"),
        name: text(formData, "name"),
        rule_type: text(formData, "rule_type"),
        language: text(formData, "language") || "json-logic",
        expression: json(formData, "expression", {}),
        input_schema: json(formData, "input_schema", {}),
        output_schema: json(formData, "output_schema", {}),
      };
    } else {
      redirect(`/admin/produto?organization=${organizationId}&erro=tipo_invalido`);
    }
  } catch {
    redirect(`/admin/produto?organization=${organizationId}&erro=json_invalido`);
  }

  try {
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType,
      payload,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?organization=${organizationId}&erro=${reason}`);
  }

  redirect(`/admin/produto?organization=${organizationId}&sucesso=salvo`);
}
