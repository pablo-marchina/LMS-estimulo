import type { DefinitionSummary, VersionSummary } from "@/lib/admin/product-management";
import type { DiagnosticBuilderInitial } from "./diagnostic-builder";
import { blockInputs, classification, date, dimensionInputs, profileInputs, questionInputs, ruleInputs, str } from "./page-model-utils";

type EditorVersion = VersionSummary & { definitionName?: string; definitionId?: string; definitionCode?: string; definitionPurpose?: string };

export function buildDiagnosticPageModel(diagnostics: DefinitionSummary[], requested: string) {
  const active = diagnostics.filter((item) => item.status !== "retired");
  const retired = diagnostics.filter((item) => item.status === "retired");
  const versions: EditorVersion[] = active.flatMap((item) => item.versions.map((version) => ({
    ...version,
    definitionName: item.name,
    definitionId: item.definition_id,
    definitionCode: item.code,
    definitionPurpose: str(item.purpose),
  })));
  const drafts = versions.filter((item) => item.status === "draft").sort((a, b) => b.version_number - a.version_number);
  const published = versions.filter((item) => item.status === "published").sort((a, b) => date(b.published_at) - date(a.published_at) || b.version_number - a.version_number)[0] ?? null;
  const selected = drafts.find((item) => String(item.id) === requested) ?? null;
  const seed = requested === "publicado" ? published : selected ?? published;
  const seedProfiles = profileInputs(seed);
  const initial: DiagnosticBuilderInitial = {
    definitionId: seed?.definitionId ?? "",
    versionId: selected ? String(selected.id) : "",
    definitionCode: seed?.definitionCode ?? "",
    name: seed?.definitionName ?? "",
    purpose: seed?.definitionPurpose ?? "",
    profiles: seedProfiles,
    dimensions: dimensionInputs(seed),
    questions: questionInputs(seed),
    defaultProfileCode: str(classification(seed).default_archetype_code) || seedProfiles[0]?.code || "",
    rules: ruleInputs(seed),
    resultBlocks: blockInputs(seed),
  };
  const selectorValue = selected ? String(selected.id) : published ? "publicado" : "";
  const selectorOptions = [
    ...(published ? [{ value: "publicado", label: `${published.definitionName} · em uso (v${published.version_number})` }] : []),
    ...drafts.map((item) => ({ value: String(item.id), label: `${item.definitionName} · rascunho (v${item.version_number})` })),
  ];
  return { active, retired, published, seed, initial, selectorValue, selectorOptions };
}
