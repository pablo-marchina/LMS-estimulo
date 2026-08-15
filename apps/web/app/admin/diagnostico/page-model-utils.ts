import type { VersionSummary } from "@/lib/admin/product-management";
import { normalizeDiagnosticResultContentByProfile } from "@/lib/diagnostics/result-blocks";
import type { DiagnosticDimensionInput, DiagnosticProfileInput, DiagnosticQuestionInput, DiagnosticRuleInput } from "./diagnostic-builder";

export const one = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] ?? "" : v ?? "";
export const str = (v: unknown) => typeof v === "string" ? v : "";
export const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
export const date = (v: unknown) => { const n = typeof v === "string" ? Date.parse(v) : Number.NaN; return Number.isFinite(n) ? n : 0; };

export function profileInputs(v: VersionSummary | null): DiagnosticProfileInput[] {
  const raw = v && Array.isArray(v.archetypes) ? v.archetypes : [];
  return raw.map(obj).map((x) => ({ code: str(x.code), name: str(x.name), description: str(x.description) })).filter((x) => x.code && x.name);
}
export const dimensionInputs = (v: VersionSummary | null): DiagnosticDimensionInput[] => (v?.dimensions ?? []).map((x) => ({ code: x.code, name: x.name, description: x.description ?? "" }));
export const questionInputs = (v: VersionSummary | null): DiagnosticQuestionInput[] => (v?.items ?? []).map((x) => ({ prompt: x.prompt, dimension_code: x.dimension_code ?? "", options: x.options.map((o) => ({ label: o.label, score: typeof o.value.score === "number" ? o.value.score : "" })) }));
export function classification(v: VersionSummary | null) { return obj(obj(v?.configuration).classification_rules); }
export function ruleInputs(v: VersionSummary | null): DiagnosticRuleInput[] {
  const raw = classification(v).rules;
  return (Array.isArray(raw) ? raw : []).map(obj).map((x) => ({ archetype_code: str(x.archetype_code), thresholds: obj(x.thresholds) as Record<string, number | string> })).filter((x) => x.archetype_code);
}
export function blockInputs(v: VersionSummary | null) { const value = obj(v?.configuration).result_blocks; return Array.isArray(value) ? value.map(String) : undefined; }
export function resultContentInputs(v: VersionSummary | null) { return normalizeDiagnosticResultContentByProfile(obj(v?.configuration).result_content); }
