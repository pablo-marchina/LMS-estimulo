"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { saveAdminProductResource } from "@/lib/admin/product-management";

const ARCHETYPE_CODES = ["fazedor", "batalhador", "construtor", "navegador"] as const;
const DIMENSION_CODES = ["gestao_financeira", "disciplina_habito", "visao_planejamento", "perfil_empreendedor", "credito_risco"] as const;

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function count(formData: FormData, prefix: string) {
  let n = 0;
  while (formData.has(`${prefix}${n}`)) n += 1;
  return n;
}

export async function saveDiagnosticAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) redirect(`/admin/diagnostico?organization=${organizationId}&erro=sem_permissao`);

  const dimensions = DIMENSION_CODES.map((code, position) => ({
    code,
    name: text(formData, `dimension_name_${code}`),
    minimum_answer_ratio: 1,
    position: position + 1,
  })).filter((dimension) => dimension.name);

  const itemCount = count(formData, "item_prompt_");
  const items = Array.from({ length: itemCount }, (_, index) => {
    const optionCount = count(formData, `item_option_label_${index}_`);
    return {
      code: `item_${index + 1}`,
      dimension_code: text(formData, `item_dimension_${index}`),
      item_type: "single_choice",
      prompt: text(formData, `item_prompt_${index}`),
      position: index + 1,
      is_required: true,
      options: Array.from({ length: optionCount }, (_, optionIndex) => ({
        code: `opcao_${optionIndex + 1}`,
        label: text(formData, `item_option_label_${index}_${optionIndex}`),
        value: { score: Number(text(formData, `item_option_score_${index}_${optionIndex}`) || "0") },
        position: optionIndex + 1,
      })).filter((option) => option.label),
    };
  }).filter((item) => item.prompt && item.dimension_code);

  const archetypeNames: Record<string, string> = { fazedor: "Fazedor(a)", batalhador: "Batalhador(a)", construtor: "Construtor(a)", navegador: "Navegador(a)" };
  const archetypes = ARCHETYPE_CODES.map((code) => ({
    code,
    name: archetypeNames[code],
    description: text(formData, `archetype_description_${code}`),
  }));

  const rules = ARCHETYPE_CODES.map((code, index) => {
    const thresholds: Record<string, number> = {};
    for (const dimension of DIMENSION_CODES) {
      const value = text(formData, `threshold_${code}_${dimension}`);
      if (value) thresholds[dimension] = Number(value);
    }
    return { archetype_code: code, priority: index + 1, thresholds };
  }).filter((rule) => Object.keys(rule.thresholds).length > 0);

  const defaultArchetypeCode = text(formData, "default_archetype_code");
  const status = text(formData, "status") === "published" ? "published" : "draft";

  const payload = {
    definition_id: nullable(formData, "definition_id"),
    version_id: nullable(formData, "version_id"),
    code: text(formData, "code"),
    name: text(formData, "name"),
    purpose: text(formData, "purpose"),
    status,
    configuration: {},
    dimensions,
    items,
    archetypes,
    classification_rules: { default_archetype_code: defaultArchetypeCode, rules },
  };

  try {
    await saveAdminProductResource({ actorUserAccountId: auth.identity.user_account_id, organizationId, resourceType: "diagnostic", payload, idempotencyKey: randomUUID() });
  } catch {
    redirect(`/admin/diagnostico?organization=${organizationId}&erro=falha`);
  }
  redirect(`/admin/diagnostico?organization=${organizationId}&sucesso=salvo`);
}
