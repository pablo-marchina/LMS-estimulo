import { randomUUID } from "node:crypto";
import { ClipboardList } from "lucide-react";
import { OptionalDiagnosticForm } from "@/app/admin/diagnosticos-opcionais/optional-diagnostic-form";
import { AdminDisclosure, AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminProductWorkspace, type VersionSummary } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";
import { retireDiagnosticAction } from "./actions";
import { DiagnosticBuilder, type DiagnosticBuilderInitial, type DiagnosticDimensionInput, type DiagnosticProfileInput, type DiagnosticQuestionInput, type DiagnosticRuleInput } from "./diagnostic-builder";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function numberValue(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
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
function optionalItems(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const canEdit = organization.permissions.includes("diagnostic.configuration.manage");
  const type = single(query.tipo) === "opcionais" ? "opcionais" : "principal";
  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const extensionWorkspace = type === "opcionais"
    ? await extensionsRuntime.adminWorkspace(auth.identity.user_account_id, organization.organization_id).catch(() => null)
    : null;
  const activeDiagnostics = workspace.diagnostics.filter((item) => item.status !== "retired");
  const retiredDiagnostics = workspace.diagnostics.filter((item) => item.status === "retired");
  const versions = activeDiagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name, definitionId: item.definition_id, definitionCode: item.code, definitionPurpose: stringValue(item.purpose) })));
  const draftVersions = versions.filter((item) => item.status === "draft").sort((a, b) => b.version_number - a.version_number);
  const publishedVersion = (versions.filter((item) => item.status === "published").sort((a, b) => dateValue(b.published_at) - dateValue(a.published_at) || b.version_number - a.version_number)[0] ?? null) as (VersionSummary & { definitionName?: string; definitionId?: string; definitionCode?: string; definitionPurpose?: string }) | null;
  const requestedVersion = single(query.versao);
  const selectedVersionId = requestedVersion === "publicado" ? "publicado" : requestedVersion;
  const selectedVersion = (draftVersions.find((item) => String(item.id) === selectedVersionId) ?? null) as (VersionSummary & { definitionName?: string; definitionId?: string; definitionCode?: string; definitionPurpose?: string }) | null;
  const seedVersion = selectedVersion ?? publishedVersion;
  const seedProfiles = profiles(seedVersion);
  const seedDimensions = dimensions(seedVersion);
  const seedQuestions = questions(seedVersion);
  const initial: DiagnosticBuilderInitial = {
    definitionId: seedVersion?.definitionId ?? "",
    versionId: selectedVersion?.id ? String(selectedVersion.id) : "",
    definitionCode: seedVersion?.definitionCode ?? "",
    name: seedVersion?.definitionName ?? "",
    purpose: seedVersion?.definitionPurpose ?? "",
    profiles: seedProfiles,
    dimensions: seedDimensions,
    questions: seedQuestions,
    defaultProfileCode: defaultProfile(seedVersion) || seedProfiles[0]?.code || "",
    rules: rules(seedVersion),
  };
  const success = single(query.sucesso);
  const error = single(query.erro);
  const diagnosticsForProfile = optionalItems(extensionWorkspace?.optional_diagnostics);
  const selectorValue = selectedVersion ? String(selectedVersion.id) : publishedVersion ? "publicado" : "";

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Personalização" title="Diagnósticos" description="Configure o diagnóstico principal e escolha outros diagnósticos que aparecerão no perfil." />
    <AdminSectionNav items={[
      { href: "/admin/diagnostico?tipo=principal", label: "Diagnóstico principal", active: type === "principal" },
      { href: "/admin/diagnostico?tipo=opcionais", label: "Opcionais no perfil", active: type === "opcionais" },
    ]} />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode consultar as configurações, mas não alterá-las.</StatusPanel> : null}
    {success ? <StatusPanel title="Alteração salva" tone="success">{type === "opcionais" ? "A disponibilidade no perfil foi atualizada." : success === "publicado" ? "O diagnóstico principal foi publicado e as relações foram atualizadas." : success === "excluido" ? "O diagnóstico foi retirado do uso e movido para o histórico preservado." : "O rascunho foi salvo."}</StatusPanel> : null}
    {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos e tente novamente.</StatusPanel> : null}

    {type === "principal" ? <>
      <StatusPanel title="O que o diagnóstico principal controla" tone="info">Somente um diagnóstico permanece publicado por vez. Ele define o perfil principal e pode ajudar a personalizar quais jornadas fazem mais sentido para cada participante. Ao publicar uma mudança, a plataforma preserva a relação entre os perfis antigos e os novos.</StatusPanel>
      <Card><form method="get" className="flex flex-wrap items-end gap-3"><input type="hidden" name="tipo" value="principal" /><Label className="min-w-72 flex-1">Diagnóstico que deseja abrir<Select name="versao" defaultValue={selectorValue}><option value="">Criar o primeiro diagnóstico</option>{publishedVersion ? <option value="publicado">{publishedVersion.definitionName} · em uso (v{publishedVersion.version_number})</option> : null}{draftVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · rascunho (v{item.version_number})</option>)}</Select><span className="text-[11px] font-normal text-muted">A versão em uso pode ser aberta e revisada. Ao salvar mudanças nela, a plataforma cria ou atualiza um rascunho; a versão publicada não é alterada silenciosamente.</span></Label><Button variant="secondary" type="submit">Abrir</Button></form></Card>
      {!seedVersion ? <StatusPanel title="Nenhum diagnóstico principal configurado" tone="warning">Crie o primeiro diagnóstico abaixo e publique quando estiver pronto.</StatusPanel> : null}
      <fieldset disabled={!canEdit} className="contents"><DiagnosticBuilder initial={initial} previousProfiles={profiles(publishedVersion)} canPublish={canEdit} /></fieldset>
      <AdminDisclosure title="Diagnósticos salvos" description="Retirar uma configuração não apaga respostas nem resultados; ela é movida para o histórico preservado abaixo.">
        <div className="grid gap-3 sm:grid-cols-2">{activeDiagnostics.map((item) => <div key={item.definition_id} className="rounded-xl border border-border p-4"><strong className="text-ink">{item.name}</strong><p className="mt-1 text-xs text-muted">{item.versions.some((version) => version.status === "published") ? "Em uso" : "Em preparação"}</p>{canEdit ? <details className="mt-4 rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">Retirar diagnóstico</summary><form action={retireDiagnosticAction} className="grid gap-2 border-t border-border p-3"><input type="hidden" name="definition_id" value={item.definition_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Label className="text-xs">Confirme digitando EXCLUIR<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm" className="w-fit">Retirar</Button></form></details> : null}</div>)}</div>
      </AdminDisclosure>
      {retiredDiagnostics.length ? <AdminDisclosure title="Histórico preservado" description="Diagnósticos retirados continuam visíveis para auditoria. Respostas, resultados e versões anteriores permanecem armazenados.">
        <div className="grid gap-3 sm:grid-cols-2">{retiredDiagnostics.map((item) => {
          const latestVersion = [...item.versions].sort((a, b) => b.version_number - a.version_number)[0];
          return <div key={item.definition_id} className="rounded-xl border border-border bg-surface-muted/35 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-ink">{item.name}</strong><StatusPill tone="neutral">Retirado</StatusPill></div><p className="mt-2 text-xs text-muted">Código: {item.code}</p><p className="mt-1 text-xs text-muted">{latestVersion ? `Última versão preservada: v${latestVersion.version_number}` : "Sem versão registrada"}</p><p className="mt-3 text-sm text-muted">Este diagnóstico não afeta novos participantes, mas continua disponível no histórico para conferência e recuperação assistida sem perda de dados.</p></div>;
        })}</div>
      </AdminDisclosure> : null}
    </> : null}

    {type === "opcionais" ? <>
      <StatusPanel title="Sem impacto no arquétipo ou nas jornadas" tone="info">Diagnósticos opcionais servem apenas para reflexão e análise. Eles não alteram o arquétipo principal nem liberam ou bloqueiam jornadas.</StatusPanel>
      {!extensionWorkspace ? <StatusPanel title="Diagnósticos opcionais temporariamente indisponíveis" tone="warning">O diagnóstico principal continua disponível para edição. Apenas os dados opcionais não puderam ser carregados agora.</StatusPanel> : <>
        <fieldset disabled={!canEdit} className="contents">
          <Card className="grid gap-4"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Adicionar ao perfil</h2><p className="text-sm text-muted">Escolha um diagnóstico já preparado, defina quem poderá vê-lo e publique quando estiver pronto.</p></div></div><OptionalDiagnosticForm diagnosticVersions={extensionWorkspace.diagnostic_versions} participants={extensionWorkspace.participants} /></Card>
        </fieldset>
        <section className="grid gap-3"><div><p className="brand-kicker">No perfil</p><h2 className="display-font mt-1 text-2xl text-secondary">Diagnósticos disponíveis</h2></div>{diagnosticsForProfile.length === 0 ? <Card><p className="text-sm text-muted">Nenhum diagnóstico opcional configurado.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{diagnosticsForProfile.map((item) => <Card key={stringValue(item.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{stringValue(item.display_title)}</h3><p className="text-sm text-muted">{stringValue(item.diagnostic_name)}</p></div><StatusPill tone={stringValue(item.status) === "published" ? "success" : "neutral"}>{stringValue(item.status) === "published" ? "Visível no perfil" : stringValue(item.status) === "inactive" ? "Retirado" : "Em preparação"}</StatusPill></div><p className="text-sm text-muted">{stringValue(item.display_description)}</p><p className="text-xs text-muted">{numberValue(item.session_count)} resposta(s) iniciada(s) · {item.max_attempts === null ? "sem limite de tentativas" : `${numberValue(item.max_attempts)} tentativa(s)`}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar disponibilidade</summary><div className="border-t border-border p-4"><OptionalDiagnosticForm item={item} diagnosticVersions={extensionWorkspace.diagnostic_versions} participants={extensionWorkspace.participants} /></div></details></Card>)}</div>}</section>
      </>}
    </> : null}
  </div></AppShell>;
}
