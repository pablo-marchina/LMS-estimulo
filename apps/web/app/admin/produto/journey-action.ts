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

export async function saveJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) redirect("/admin/produto?erro=sem_permissao");

  const name = text(formData, "name");
  const existingCode = text(formData, "definition_code");
  const code = existingCode || deriveCode(name, `jornada_${randomUUID().slice(0, 8)}`);
  const versionId = nullable(formData, "version_id");
  let savedVersionId = versionId ?? "";
  const previousConfiguration = configuration(formData);
  const previousPresentation = previousConfiguration.presentation && typeof previousConfiguration.presentation === "object" && !Array.isArray(previousConfiguration.presentation) ? previousConfiguration.presentation as Record<string, unknown> : {};
  const tags = text(formData, "presentation_tags").split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const presentation = {
    ...previousPresentation,
    featured: checked(formData, "presentation_featured"),
    featured_rank: positiveInteger(text(formData, "presentation_featured_rank")),
    eyebrow: text(formData, "presentation_eyebrow") || "Jornada em destaque",
    badge: text(formData, "presentation_badge") || "Capacitação Estímulo",
    tone: text(formData, "presentation_tone") || "blue",
    icon: text(formData, "presentation_icon") || "sparkles",
    tags,
    cta: text(formData, "presentation_cta") || "Entrar nesta jornada",
  };

  try {
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
        title: text(formData, "title") || name,
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