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

// Derives a code matching save_admin_product_resource's shared v_code validation
// (`^[a-z][a-z0-9_-]{1,79}$`) from free text, so the admin never types or sees a raw
// code. Guards the leading-letter requirement (a name/step label starting with a
// digit, e.g. "5 passos", would otherwise produce an invalid code).
function deriveCode(source: string, fallback: string) {
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return /^[a-z][a-z0-9_-]{1,79}$/.test(slug) ? slug : fallback;
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
  const payload = {
    journey_version_id: text(formData, "journey_version_id"),
    name: text(formData, "name"),
    description: nullable(formData, "description"),
    position: Number(text(formData, "position") || 1),
    code: deriveCode(text(formData, "name"), "trilha"),
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
    redirect(`/admin/produto?organization=${organizationId}&erro=${reason}`);
  }
  redirect(`/admin/produto?organization=${organizationId}&sucesso=trilha_salva`);
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
      // `path_template_id` is always an existing trilha now (trilha creation moved to
      // saveTrilhaAction), so the create-new-path_template branch of
      // save_admin_product_resource never runs here and `code` is otherwise unused.
      // The shared `v_code` validation still runs unconditionally for every resource
      // type, though, so a syntactically valid code must still be supplied -- derived
      // from step_code rather than asking the admin to type a redundant one.
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
