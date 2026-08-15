"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { diagnosticManagementRuntime } from "@/lib/admin/diagnostic-management";
import { publishAdminDiagnosticTransition } from "@/lib/admin/product-lifecycle";
import { saveAdminProductResource } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { normalizeDiagnosticResultBlocks } from "@/lib/diagnostics/result-blocks";

const uuid = z.string().uuid();
const codePattern = /^[a-z][a-z0-9_-]{1,79}$/;
function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function integer(formData: FormData, name: string, fallback = 0) { const parsed = Number.parseInt(text(formData, name), 10); return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function deriveCode(source: string) { const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); return codePattern.test(slug) ? slug : `diagnostico_${randomUUID().slice(0, 8)}`; }

async function diagnosticAdminContext() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) redirect("/admin/diagnostico?erro=sem_permissao");
  return { auth, organization };
}

export async function saveDiagnosticAction(formData: FormData) {
  const { auth, organization } = await diagnosticAdminContext();
  const profileCount = integer(formData, "profile_count");
  const dimensionCount = integer(formData, "dimension_count");
  const itemCount = integer(formData, "item_count");
  if (profileCount < 1 || dimensionCount < 1 || itemCount < 1) redirect("/admin/diagnostico?erro=configuracao_incompleta");

  const profiles = Array.from({ length: profileCount }, (_, index) => ({
    code: text(formData, `profile_code_${index}`).toLowerCase(),
    name: text(formData, `profile_name_${index}`),
    description: text(formData, `profile_description_${index}`),
  }));
  const dimensions = Array.from({ length: dimensionCount }, (_, index) => ({
    code: text(formData, `dimension_code_${index}`).toLowerCase(),
    name: text(formData, `dimension_name_${index}`),
    description: text(formData, `dimension_description_${index}`),
    minimum_answer_ratio: 1,
    position: index + 1,
  }));
  const profileCodes = new Set(profiles.map((profile) => profile.code));
  const dimensionCodes = new Set(dimensions.map((dimension) => dimension.code));
  const validProfiles = profiles.every((profile) => codePattern.test(profile.code) && profile.name) && profileCodes.size === profiles.length;
  const validDimensions = dimensions.every((dimension) => codePattern.test(dimension.code) && dimension.name) && dimensionCodes.size === dimensions.length;
  if (!validProfiles || !validDimensions) redirect("/admin/diagnostico?erro=codigos_invalidos");

  const items = Array.from({ length: itemCount }, (_, index) => {
    const dimensionCode = text(formData, `item_dimension_${index}`).toLowerCase();
    return {
      code: `item_${index + 1}`,
      dimension_code: dimensionCode,
      item_type: "single_choice",
      prompt: text(formData, `item_prompt_${index}`),
      position: index + 1,
      is_required: true,
      options: Array.from({ length: 4 }, (_, optionIndex) => ({
        code: `opcao_${optionIndex + 1}`,
        label: text(formData, `item_option_label_${index}_${optionIndex}`),
        value: { score: Number(text(formData, `item_option_score_${index}_${optionIndex}`) || "0") },
        position: optionIndex + 1,
      })),
    };
  });
  if (items.some((item) => !item.prompt || !dimensionCodes.has(item.dimension_code) || item.options.some((option) => !option.label || !Number.isFinite(option.value.score)))) redirect("/admin/diagnostico?erro=perguntas_invalidas");

  const rules = profiles.map((profile, profileIndex) => {
    const thresholds: Record<string, number> = {};
    dimensions.forEach((dimension, dimensionIndex) => {
      const raw = text(formData, `threshold_${profileIndex}_${dimensionIndex}`);
      if (!raw) return;
      const value = Number(raw);
      if (Number.isFinite(value)) thresholds[dimension.code] = value;
    });
    return { archetype_code: profile.code, priority: profileIndex + 1, thresholds };
  }).filter((rule) => Object.keys(rule.thresholds).length > 0);
  const defaultArchetypeCode = text(formData, "default_archetype_code").toLowerCase();
  if (!profileCodes.has(defaultArchetypeCode)) redirect("/admin/diagnostico?erro=perfil_padrao_invalido");
  const resultBlocks = normalizeDiagnosticResultBlocks(formData.getAll("result_blocks").map(String));
  const resultContent: Record<string, Record<string, { title: string; body: string }>> = {};
  profiles.forEach((profile, index) => {
    const profileContent = {
      strength: {
        title: text(formData, `profile_result_strength_title_${index}`),
        body: text(formData, `profile_result_strength_body_${index}`),
      },
      challenge: {
        title: text(formData, `profile_result_challenge_title_${index}`),
        body: text(formData, `profile_result_challenge_body_${index}`),
      },
      practical_tip: {
        title: text(formData, `profile_result_practical_tip_title_${index}`),
        body: text(formData, `profile_result_practical_tip_body_${index}`),
      },
      takeaway: {
        title: text(formData, `profile_result_takeaway_title_${index}`),
        body: text(formData, `profile_result_takeaway_body_${index}`),
      },
    };
    if (Object.values(profileContent).some((section) => section.title || section.body)) resultContent[profile.code] = profileContent;
  });

  const name = text(formData, "name");
  const existingCode = text(formData, "definition_code");
  const versionId = nullable(formData, "version_id");
  const intent = text(formData, "intent") === "publish" ? "publish" : "draft";
  const archetypeMapping: Record<string, string> = {};
  if (intent === "publish") {
    const mappingCount = integer(formData, "mapping_count");
    for (let index = 0; index < mappingCount; index += 1) {
      const oldCode = text(formData, `mapping_old_code_${index}`).toLowerCase();
      const targetCode = text(formData, `mapping_target_code_${index}`).toLowerCase();
      if (!oldCode || !profileCodes.has(targetCode)) redirect(`/admin/diagnostico?versao=${versionId ?? ""}&erro=mapeamento_incompleto`);
      archetypeMapping[oldCode] = targetCode;
    }
  }

  const payload = {
    definition_id: nullable(formData, "definition_id"),
    version_id: versionId,
    code: existingCode || deriveCode(name),
    name,
    purpose: text(formData, "purpose"),
    status: "draft",
    configuration: {
      archetype_codes: profiles.map((profile) => profile.code),
      result_blocks: resultBlocks,
      result_content: resultContent,
    },
    dimensions,
    items,
    archetypes: profiles,
    classification_rules: { default_archetype_code: defaultArchetypeCode, rules },
  };

  let savedVersionId = versionId ?? "";
  try {
    const saved = await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      resourceType: "diagnostic",
      payload,
      idempotencyKey: randomUUID(),
    });
    savedVersionId = stringValue(saved.version_id) || savedVersionId;
    if (!savedVersionId) throw new Error("DIAGNOSTIC_VERSION_MISSING");

    if (intent === "publish") {
      await publishAdminDiagnosticTransition({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        diagnosticVersionId: savedVersionId,
        archetypeMapping,
        idempotencyKey: randomUUID(),
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const reason = message.includes("ARCHETYPE_MAPPING") ? "mapeamento_incompleto" : message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/diagnostico?versao=${savedVersionId}&erro=${reason}`);
  }

  revalidatePath("/admin/diagnostico");
  if (intent === "publish") {
    revalidatePath("/admin/produto");
    revalidatePath("/empreendedor", "layout");
    redirect("/admin/diagnostico?sucesso=publicado");
  }
  redirect(`/admin/diagnostico?versao=${savedVersionId}&sucesso=salvo`);
}

export async function retireDiagnosticAction(formData: FormData) {
  const { auth, organization } = await diagnosticAdminContext();
  if (text(formData, "confirmation") !== "EXCLUIR") redirect("/admin/diagnostico?erro=confirmacao");
  await diagnosticManagementRuntime.retire({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, definitionId: uuid.parse(formData.get("definition_id")), idempotencyKey: String(formData.get("idempotency_key") || randomUUID()) });
  revalidatePath("/admin/diagnostico");
  redirect("/admin/diagnostico?sucesso=excluido");
}
