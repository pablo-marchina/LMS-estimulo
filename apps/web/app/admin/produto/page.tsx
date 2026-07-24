import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace, type Trilha } from "@/lib/admin/product-management";
import { saveTrilhaAction } from "./actions";
import { saveJourneyAction } from "./journey-action";
import { publishJourneyAction } from "./publish-action";
import { TrilhaAulaBuilder } from "./trilha-aula-builder";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function latest<T extends { versions?: Array<Record<string, unknown>> }>(item: T) {
  return item.versions?.[0] ?? null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default async function AdminProductPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return <main className="mx-auto max-w-3xl px-4 py-10"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel></main>;
  }

  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("journey.definition.manage"));
  if (!organization?.permissions.includes("journey.definition.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Gestão de produto restrita" tone="warning"><p>Seu papel não permite editar jornadas.</p></StatusPanel></AppShell>;
  }

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const journeyVersions = workspace.journeys.flatMap((item) => item.versions.map((version) => ({
    ...version,
    definitionName: item.name,
    definitionId: item.definition_id,
    definitionCode: item.code,
    definitionPurpose: stringValue(item.purpose),
    programId: stringValue(item.program_id),
  })));
  const draftJourneyVersions = journeyVersions.filter((item) => item.status === "draft");
  const selectedVersionId = single(query.versao);
  const selectedJourneyVersion = draftJourneyVersions.find((item) => String(item.id) === selectedVersionId) ?? null;
  const selectedTrilhas = selectedJourneyVersion?.trilhas?.slice().sort((a: Trilha, b: Trilha) => a.position - b.position) ?? [];
  const selectedArchetypes = new Set(selectedJourneyVersion?.eligible_archetype_codes ?? []);
  const success = single(query.sucesso);
  const error = single(query.erro);
  const canPublish = organization.permissions.includes("journey.definition.publish");
  const graphLooksComplete = selectedTrilhas.length > 0 && selectedTrilhas.every((trilha) => trilha.aulas.length > 0);

  const errorMessage = error === "campos_incompletos"
    ? "Preencha os campos obrigatórios. A aula de encerramento também precisa de quiz válido e checklist."
    : error === "conteudo_alterado"
      ? "A jornada mudou desde que esta página foi aberta. Recarregue antes de publicar."
      : error === "jornada_incompleta"
        ? "A jornada ainda tem trilhas vazias, avaliações inválidas ou prática sem configuração."
        : error === "sem_permissao"
          ? "Seu papel não permite realizar esta ação."
          : "Revise os campos e tente novamente.";

  return <AppShell area="admin" email={auth.email}>
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Produto configurável"
        title="Construtor de jornadas"
        description="Crie a jornada, organize trilhas, adicione aulas e publique o conjunto completo sem trabalhar com códigos, IDs ou JSON."
        actions={
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Organização
              <Select name="organization" defaultValue={organization.organization_id}>
                {auth.identity.organizations
                  .filter((item) => item.permissions.includes("journey.definition.manage"))
                  .map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}
              </Select>
            </label>
            <Button variant="secondary" type="submit">Selecionar</Button>
          </form>
        }
      />

      {success ? <StatusPanel title={success === "jornada_publicada" ? "Jornada publicada" : "Configuração salva"} tone="success"><p>{success === "jornada_publicada" ? "A jornada e seus recursos foram validados, publicados e auditados." : "O rascunho foi persistido e auditado."}</p></StatusPanel> : null}
      {error ? <StatusPanel title="Não foi possível concluir" tone="warning"><p>{errorMessage}</p></StatusPanel> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Jornadas</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.journeys.length}</strong></Card>
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Trilhas</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.paths.length}</strong></Card>
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Aulas</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.paths.reduce((sum, path) => sum + path.steps.length, 0)}</strong></Card>
      </section>

      <details className="group rounded-xl border border-border bg-surface" open>
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="grid gap-1">
            <strong className="text-ink">Jornada</strong>
            <small className="text-muted">Dados, acesso, trilhas, aulas e publicação</small>
          </span>
          <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
        </summary>

        <div className="grid gap-6 border-t border-border p-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="organization" value={organization.organization_id} />
            <label className="grid min-w-64 gap-1.5 text-sm font-medium text-ink">
              Jornada em rascunho para editar
              <Select name="versao" defaultValue={selectedVersionId}>
                <option value="">Criar nova jornada ou versão</option>
                {draftJourneyVersions.map((item) => (
                  <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>
                ))}
              </Select>
            </label>
            <Button variant="secondary" type="submit">Abrir</Button>
          </form>

          <form className="grid gap-4" action={saveJourneyAction}>
            <input type="hidden" name="organization_id" value={organization.organization_id} />
            <input type="hidden" name="version_id" value={selectedJourneyVersion ? String(selectedJourneyVersion.id) : ""} />
            <input type="hidden" name="definition_code" value={selectedJourneyVersion?.definitionCode ?? ""} />
            <input type="hidden" name="configuration_snapshot" value={JSON.stringify(selectedJourneyVersion?.configuration ?? {})} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-ink">Programa
                <Select name="program_id" required defaultValue={selectedJourneyVersion?.programId ?? ""}>
                  <option value="">Selecione</option>
                  {workspace.programs.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Jornada existente
                <Select name="definition_id" defaultValue={selectedJourneyVersion?.definitionId ?? ""}>
                  <option value="">Criar uma nova</option>
                  {workspace.journeys.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Nome
                <Input name="name" required defaultValue={selectedJourneyVersion?.definitionName ?? ""} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Título apresentado ao participante
                <Input name="title" required defaultValue={selectedJourneyVersion?.title ?? selectedJourneyVersion?.definitionName ?? ""} />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-ink">Propósito
              <Textarea name="purpose" rows={2} defaultValue={selectedJourneyVersion?.definitionPurpose ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-ink">Descrição
              <Textarea name="description" rows={3} defaultValue={selectedJourneyVersion?.description ?? ""} />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-ink">Quem pode acessar</legend>
              <p className="text-xs text-muted">Sem seleção, a jornada fica aberta para todos os perfis.</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { code: "fazedor", icon: "🔨", name: "Fazedor(a)" },
                  { code: "batalhador", icon: "💪", name: "Batalhador(a)" },
                  { code: "construtor", icon: "🧱", name: "Construtor(a)" },
                  { code: "navegador", icon: "🧭", name: "Navegador(a)" },
                ].map((archetype) => (
                  <label key={archetype.code} className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="eligible_archetype_codes" value={archetype.code} defaultChecked={selectedArchetypes.has(archetype.code)} className="size-4 accent-primary" />
                    {archetype.icon} {archetype.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" className="w-fit">Salvar jornada</Button>
          </form>

          <section className="grid gap-3" aria-labelledby="trilhas-heading">
            <div>
              <h3 id="trilhas-heading" className="text-base font-semibold text-ink">Trilhas desta jornada</h3>
              <p className="text-sm text-muted">Abra uma trilha para consultar e adicionar suas aulas.</p>
            </div>
            {selectedJourneyVersion ? (
              selectedTrilhas.length ? selectedTrilhas.map((trilha) => (
                <TrilhaAulaBuilder
                  key={trilha.id}
                  journeyVersionId={String(selectedJourneyVersion.id)}
                  organizationId={organization.organization_id}
                  trilha={trilha}
                />
              )) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">Nenhuma trilha ainda.</p>
            ) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">Salve ou abra uma jornada em rascunho para organizar trilhas e aulas.</p>}
          </section>

          <fieldset className="grid gap-3 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Adicionar trilha</legend>
            {selectedJourneyVersion ? (
              <form action={saveTrilhaAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} />
                <label className="grid gap-1.5 text-sm font-medium text-ink">Nome da trilha<Input name="name" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Posição<Input name="position" type="number" min="1" defaultValue={String(selectedTrilhas.length + 1)} required /></label>
                <label className="col-span-full grid gap-1.5 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={2} /></label>
                <Button type="submit" size="sm" className="w-fit">Adicionar trilha</Button>
              </form>
            ) : <p className="text-sm text-muted">Salve ou abra uma jornada em rascunho antes de adicionar trilhas.</p>}
          </fieldset>

          <section className="grid gap-3 rounded-xl border border-primary/30 bg-primary-soft/30 p-4" aria-labelledby="publicar-jornada-heading">
            <div>
              <h3 id="publicar-jornada-heading" className="font-semibold text-ink">Publicar jornada</h3>
              <p className="mt-1 text-sm text-muted">A publicação valida trilhas, aulas, alternativas, entregas práticas e Selos. Depois disso, a versão fica imutável.</p>
            </div>
            {selectedJourneyVersion ? (
              canPublish ? (
                <form action={publishJourneyAction}>
                  <input type="hidden" name="organization_id" value={organization.organization_id} />
                  <input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} />
                  <input type="hidden" name="content_hash" value={selectedJourneyVersion.content_hash ?? ""} />
                  <Button type="submit" disabled={!graphLooksComplete || !selectedJourneyVersion.content_hash}>Validar e publicar</Button>
                  {!graphLooksComplete ? <p className="mt-2 text-xs text-muted">Adicione ao menos uma aula em cada trilha antes de publicar.</p> : null}
                </form>
              ) : <p className="text-sm text-muted">Seu papel pode editar, mas não publicar jornadas.</p>
            ) : <p className="text-sm text-muted">Abra uma jornada em rascunho para publicá-la.</p>}
          </section>
        </div>
      </details>

      <Card className="grid gap-5">
        <h2 className="text-lg font-semibold text-ink">Inventário configurado</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Jornadas</h3>
            {workspace.journeys.map((item) => <p key={item.definition_id} className="text-sm text-ink"><strong>{item.name}</strong><br /><small className="text-muted">{item.versions.length} versões · {String(latest(item)?.status ?? item.status)}</small></p>)}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Trilhas</h3>
            {workspace.paths.map((item) => <p key={item.id} className="text-sm text-ink"><strong>{item.name}</strong><br /><small className="text-muted">{item.steps.length} aulas · {item.status}</small></p>)}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Atividades</h3>
            <p className="text-sm text-ink"><strong>{workspace.activities.length}</strong><br /><small className="text-muted">definições versionadas</small></p>
          </div>
        </div>
      </Card>
    </div>
  </AppShell>;
}
