import { randomUUID } from "node:crypto";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminProductWorkspace, type VersionSummary } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { retireDiagnosticAction } from "./actions";
import { DiagnosticBuilder, type DiagnosticBuilderInitial, type DiagnosticDimensionInput, type DiagnosticProfileInput, type DiagnosticQuestionInput, type DiagnosticRuleInput } from "./diagnostic-builder";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function dateValue(value: unknown) { const date = typeof value === "string" ? Date.parse(value) : Number.NaN; return Number.isFinite(date) ? date : 0; }
function profiles(version: VersionSummary | null): DiagnosticProfileInput[] {
  const raw = version && Array.isArray(version.archetypes) ? version.archetypes : [];
  return raw.map(objectValue).map((item) => ({ code: stringValue(item.code), name: stringValue(item.name), description: stringValue(item.description) })).filter((item) => item.code && item.name);
}
function dimensions(version: VersionSummary | null): DiagnosticDimensionInput[] {
  return (version?.dimensions ?? []).map((item) => ({ code: item.code, name: item.name, description: item.description ?? "" }));
}
function questions(version: VersionSummary | null): DiagnosticQuestionInput[] {
  return (version?.items ?? []).map((item) => ({ prompt: item.prompt, dimension_code: item.dimension_code ?? "", options: item.options.map((option) => ({ label: option.label, score: typeof option.value.score === "number" ? option.value.score : "" })) }));
}
function rules(version: VersionSummary | null): DiagnosticRuleInput[] {
  const configuration = objectValue(version?.configuration);
  const classification = objectValue(configuration.classification_rules);
  const raw = Array.isArray(classification.rules) ? classification.rules : [];
  return raw.map(objectValue).map((item) => ({ archetype_code: stringValue(item.archetype_code), thresholds: objectValue(item.thresholds) as Record<string, number | string> })).filter((item) => item.archetype_code);
}
function defaultProfile(version: VersionSummary | null) {
  const classification = objectValue(objectValue(version?.configuration).classification_rules);
  return stringValue(classification.default_archetype_code);
}

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const canEdit = organization.permissions.includes("diagnostic.configuration.manage");
  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const activeDiagnostics = workspace.diagnostics.filter((item) => item.status !== "retired");
  const versions = activeDiagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name, definitionId: item.definition_id, definitionCode: item.code, definitionPurpose: stringValue(item.purpose) })));
  const draftVersions = versions.filter((item) => item.status === "draft").sort((a, b) => b.version_number - a.version_number);
  const publishedVersion = (versions.filter((item) => item.status === "published").sort((a, b) => dateValue(b.published_at) - dateValue(a.published_at) || b.version_number - a.version_number)[0] ?? null) as (VersionSummary & { definitionName?: string; definitionId?: string; definitionCode?: string; definitionPurpose?: string }) | null;
  const selectedVersionId = single(query.versao);
  const selectedVersion = (draftVersions.find((item) => String(item.id) === selectedVersionId) ?? null) as (VersionSummary & { definitionName?: string; definitionId?: string; definitionCode?: string; definitionPurpose?: string }) | null;
  const seedVersion = selectedVersion ?? publishedVersion;
  const seedProfiles = profiles(seedVersion);
  const seedDimensions = dimensions(seedVersion);
  const seedQuestions = questions(seedVersion);
  const initial: DiagnosticBuilderInitial = {
    definitionId: selectedVersion?.definitionId ?? "",
    versionId: selectedVersionId,
    definitionCode: selectedVersion?.definitionCode ?? "",
    name: selectedVersion?.definitionName ?? "",
    purpose: selectedVersion?.definitionPurpose ?? "",
    profiles: seedProfiles,
    dimensions: seedDimensions,
    questions: seedQuestions,
    defaultProfileCode: defaultProfile(seedVersion) || seedProfiles[0]?.code || "",
    rules: rules(seedVersion),
  };
  const success = single(query.sucesso);
  const error = single(query.erro);

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Personalização" title="Diagnósticos e perfis" description="Configure livremente perfis, dimensões, perguntas e regras. Somente um diagnóstico permanece publicado por vez." />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode consultar os diagnósticos, mas não criar, publicar ou excluir versões.</StatusPanel> : null}
    <StatusPanel title="Publicação com migração segura" tone="info">Ao publicar um novo diagnóstico, você precisa relacionar cada perfil antigo a um perfil novo. A plataforma troca o formulário ativo e atualiza perfis de usuários e restrições de jornadas na mesma operação.</StatusPanel>
    <Card><form method="get" className="flex flex-wrap items-end gap-3"><Label className="min-w-72 flex-1">Diagnóstico em rascunho<Select name="versao" defaultValue={selectedVersionId}><option value="">Criar novo diagnóstico</option>{draftVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · rascunho {String(item.version_number)}</option>)}</Select><span className="text-[11px] font-normal text-muted">Ao criar um novo, os campos metodológicos começam preenchidos com o diagnóstico atualmente publicado para facilitar a revisão.</span></Label><Button variant="secondary" type="submit">Abrir</Button></form></Card>
    {success === "publicado" ? <StatusPanel title="Diagnóstico publicado" tone="success">O novo formulário é o único ativo. Usuários e jornadas foram migrados conforme o mapeamento informado.</StatusPanel> : success === "excluido" ? <StatusPanel title="Diagnóstico excluído" tone="success">A definição foi retirada do painel e os resultados históricos foram preservados.</StatusPanel> : success ? <StatusPanel title="Rascunho salvo" tone="success">A configuração foi registrada sem alterar o formulário ativo.</StatusPanel> : null}
    {error ? <StatusPanel title="Alteração não concluída" tone="warning">{error === "mapeamento_incompleto" ? "Relacione todos os perfis antigos a um perfil novo antes de publicar." : "Revise os dados e tente novamente."}</StatusPanel> : null}

    <fieldset disabled={!canEdit} className="contents">
      <DiagnosticBuilder initial={initial} previousProfiles={profiles(publishedVersion)} canPublish={canEdit} />
    </fieldset>

    <AdminDisclosure title="Rascunhos e exclusão" description="A exclusão retira uma definição do painel, mas preserva resultados históricos.">
      <div className="grid gap-3 sm:grid-cols-2">{activeDiagnostics.map((item) => <div key={item.definition_id} className="rounded-xl border border-border p-4"><strong className="text-ink">{item.name}</strong><p className="mt-1 text-xs text-muted">{item.versions.some((version) => version.status === "published") ? "Publicado" : "Rascunho"}</p>{canEdit ? <details className="mt-4 rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">Excluir diagnóstico</summary><form action={retireDiagnosticAction} className="grid gap-2 border-t border-border p-3"><input type="hidden" name="definition_id" value={item.definition_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Label className="text-xs">Confirme digitando EXCLUIR<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm" className="w-fit">Excluir</Button></form></details> : null}</div>)}</div>
    </AdminDisclosure>
  </div></AppShell>;
}
