"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { diagnosticManagementRuntime } from "@/lib/admin/diagnostic-management";
import { saveAdminProductResource } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

const ARCHETYPE_CODES = ["fazedor", "batalhador", "construtor", "navegador"] as const;
const DIMENSION_CODES = ["gestao_financeira", "disciplina_habito", "visao_planejamento", "perfil_empreendedor", "credito_risco"] as const;
const uuid = z.string().uuid();
function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function count(formData: FormData, prefix: string) { let n = 0; while (formData.has(`${prefix}${n}`)) n += 1; return n; }
function deriveCode(source: string) { const slug = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : `diagnostico_${randomUUID().slice(0, 8)}`; }

async function diagnosticAdminContext() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) redirect("/admin/diagnostico?erro=sem_permissao");
  return { auth, organization };
}

export async function saveDiagnosticAction(formData: FormData) {
  const { auth, organization } = await diagnosticAdminContext();
  const dimensions = DIMENSION_CODES.map((code, position) => ({ code, name: text(formData, `dimension_name_${code}`), minimum_answer_ratio: 1, position: position + 1 })).filter((dimension) => dimension.name);
  const itemCount = count(formData, "item_prompt_");
  const items = Array.from({ length: itemCount }, (_, index) => {
    const optionCount = count(formData, `item_option_label_${index}_`);
    return { code: `item_${index + 1}`, dimension_code: text(formData, `item_dimension_${index}`), item_type: "single_choice", prompt: text(formData, `item_prompt_${index}`), position: index + 1, is_required: true, options: Array.from({ length: optionCount }, (_, optionIndex) => ({ code: `opcao_${optionIndex + 1}`, label: text(formData, `item_option_label_${index}_${optionIndex}`), value: { score: Number(text(formData, `item_option_score_${index}_${optionIndex}`) || "0") }, position: optionIndex + 1 })).filter((option) => option.label) };
  }).filter((item) => item.prompt && item.dimension_code);
  const archetypeNames: Record<string, string> = { fazedor: "Fazedor(a)", batalhador: "Batalhador(a)", construtor: "Construtor(a)", navegador: "Navegador(a)" };
  const archetypes = ARCHETYPE_CODES.map((code) => ({ code, name: archetypeNames[code], description: text(formData, `archetype_description_${code}`) }));
  const rules = ARCHETYPE_CODES.map((code, index) => { const thresholds: Record<string, number> = {}; for (const dimension of DIMENSION_CODES) { const value = text(formData, `threshold_${code}_${dimension}`); if (value) thresholds[dimension] = Number(value); } return { archetype_code: code, priority: index + 1, thresholds }; }).filter((rule) => Object.keys(rule.thresholds).length > 0);
  const name = text(formData, "name");
  const existingCode = text(formData, "definition_code");
  const payload = { definition_id: nullable(formData, "definition_id"), version_id: nullable(formData, "version_id"), code: existingCode || deriveCode(name), name, purpose: text(formData, "purpose"), status: text(formData, "status") === "published" ? "published" : "draft", configuration: {}, dimensions, items, archetypes, classification_rules: { default_archetype_code: text(formData, "default_archetype_code"), rules } };
  try { await saveAdminProductResource({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, resourceType: "diagnostic", payload, idempotencyKey: randomUUID() }); } catch { redirect("/admin/diagnostico?erro=falha"); }
  redirect("/admin/diagnostico?sucesso=salvo");
}

export async function retireDiagnosticAction(formData: FormData) {
  const { auth, organization } = await diagnosticAdminContext();
  if (text(formData, "confirmation") !== "EXCLUIR") redirect("/admin/diagnostico?erro=confirmacao");
  await diagnosticManagementRuntime.retire({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, definitionId: uuid.parse(formData.get("definition_id")), idempotencyKey: String(formData.get("idempotency_key") || randomUUID()) });
  redirect("/admin/diagnostico?sucesso=excluido");
}
