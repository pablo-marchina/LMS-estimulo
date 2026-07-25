import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace, type Trilha } from "@/lib/admin/product-management";
import { saveTrilhaAction } from "./actions";
import { saveJourneyAction } from "./journey-action";
import { publishJourneyAction } from "./publish-action";
import { TrilhaAulaBuilder } from "./trilha-aula-builder";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }

export default async function AdminProductPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Gestão de jornadas restrita" tone="warning">Seu papel não permite editar jornadas.</StatusPanel></AppShell>;

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const activePrograms = workspace.programs.filter((item) => item.status !== "retired");
  const activeJourneys = workspace.journeys.filter((item) => item.status !== "retired");
  const journeyVersions = activeJourneys.flatMap((item) => item.versions.map((version) => ({
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
  const selectedPathId = single(query.trilha);
  const selectedPath = selectedTrilhas.find((item) => item.id === selectedPathId) ?? null;
  const selectedArchetypes = new Set(selectedJourneyVersion?.eligible_archetype_codes ?? []);
  const etapa = ["jornada", "trilhas", "aulas", "publicar"].includes(single(query.etapa)) ? single(query.etapa) : "jornada";
  const success = single(query.sucesso);
  const error = single(query.erro);
  const canPublish = organization.permissions.includes("journey.definition.publish");
  const graphLooksComplete = selectedTrilhas.length > 0 && selectedTrilhas.every((trilha) => trilha.aulas.length > 0);
  const base = selectedJourneyVersion ? `versao=${selectedJourneyVersion.id}` : "";
  const href = (next: string, extra = "") => `/admin/produto?etapa=${next}${base ? `&${base}` : ""}${extra}`;

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Jornadas" title="Construtor de jornadas" description="Siga quatro etapas. A tela mostra somente o que é necessário para a decisão atual." />
    <nav className="grid gap-2 rounded-xl border border-border bg-white p-2 sm:grid-cols-4" aria-label="Etapas do construtor">
      {[{ id: "jornada", label: "1. Jornada" }, { id: "trilhas", label: "2. Trilhas" }, { id: "aulas", label: "3. Aulas" }, { id: "publicar", label: "4. Publicar" }].map((item) => <ButtonLink key={item.id} href={href(item.id)} variant={etapa === item.id ? "primary" : "ghost"} size="sm">{item.label}</ButtonLink>)}
    </nav>
    {success ? <StatusPanel title={success === "jornada_publicada" ? "Jornada publicada" : "Configuração salva"} tone="success">A alteração foi registrada.</StatusPanel> : null}
    {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos obrigatórios e tente novamente.</StatusPanel> : null}

    {etapa === "jornada" ? <Card className="grid gap-6">
      <div><h2 className="text-lg font-semibold text-ink">Dados da jornada</h2><p className="mt-1 text-sm text-muted">Abra um rascunho existente ou crie uma nova versão.</p></div>
      <form method="get" className="flex flex-wrap items-end gap-3"><input type="hidden" name="etapa" value="jornada" /><label className="grid min-w-72 flex-1 gap-1.5 text-sm font-medium text-ink">Rascunho para editar<Select name="versao" defaultValue={selectedVersionId}><option value="">Criar nova jornada ou versão</option>{draftJourneyVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>)}</Select></label><Button variant="secondary" type="submit">Abrir</Button></form>
      <form className="grid gap-4" action={saveJourneyAction}>
        <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="version_id" value={selectedJourneyVersion ? String(selectedJourneyVersion.id) : ""} /><input type="hidden" name="definition_code" value={selectedJourneyVersion?.definitionCode ?? ""} /><input type="hidden" name="configuration_snapshot" value={JSON.stringify(selectedJourneyVersion?.configuration ?? {})} />
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-ink">Programa<Select name="program_id" required defaultValue={selectedJourneyVersion?.programId ?? ""}><option value="">Selecione</option>{activePrograms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label><label className="grid gap-1.5 text-sm font-medium text-ink">Jornada existente<Select name="definition_id" defaultValue={selectedJourneyVersion?.definitionId ?? ""}><option value="">Criar uma nova</option>{activeJourneys.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select></label><label className="grid gap-1.5 text-sm font-medium text-ink">Nome<Input name="name" required defaultValue={selectedJourneyVersion?.definitionName ?? ""} /></label><label className="grid gap-1.5 text-sm font-medium text-ink">Título para o participante<Input name="title" required defaultValue={selectedJourneyVersion?.title ?? selectedJourneyVersion?.definitionName ?? ""} /></label></div>
        <label className="grid gap-1.5 text-sm font-medium text-ink">Propósito<Textarea name="purpose" rows={2} defaultValue={selectedJourneyVersion?.definitionPurpose ?? ""} /></label><label className="grid gap-1.5 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={3} defaultValue={selectedJourneyVersion?.description ?? ""} /></label>
        <fieldset className="grid gap-2"><legend className="text-sm font-medium text-ink">Quem pode acessar</legend><p className="text-xs text-muted">Sem seleção, todos os perfis poderão entrar.</p><div className="flex flex-wrap gap-4">{[{ code: "fazedor", name: "Fazedor(a)" }, { code: "batalhador", name: "Batalhador(a)" }, { code: "construtor", name: "Construtor(a)" }, { code: "navegador", name: "Navegador(a)" }].map((archetype) => <label key={archetype.code} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="eligible_archetype_codes" value={archetype.code} defaultChecked={selectedArchetypes.has(archetype.code)} className="size-4 accent-primary" />{archetype.name}</label>)}</div></fieldset>
        <Button type="submit" className="w-fit">Salvar e continuar</Button>
      </form>
      {selectedJourneyVersion ? <ButtonLink href={href("trilhas")} variant="secondary" className="w-fit">Ir para trilhas</ButtonLink> : null}
    </Card> : null}

    {etapa === "trilhas" ? selectedJourneyVersion ? <div className="grid gap-5">
      <Card><h2 className="text-lg font-semibold text-ink">Trilhas de {selectedJourneyVersion.title}</h2><p className="mt-1 text-sm text-muted">Crie a estrutura antes de adicionar aulas.</p></Card>
      {selectedTrilhas.length ? <div className="grid gap-3 sm:grid-cols-2">{selectedTrilhas.map((trilha) => <Card key={trilha.id}><span className="text-xs font-bold text-primary">TRILHA {trilha.position}</span><h3 className="mt-2 font-semibold text-ink">{trilha.name}</h3><p className="mt-1 text-sm text-muted">{trilha.aulas.length} aula(s)</p><ButtonLink href={href("aulas", `&trilha=${trilha.id}`)} variant="secondary" size="sm" className="mt-4 w-fit">Gerenciar aulas</ButtonLink></Card>)}</div> : <StatusPanel title="Nenhuma trilha criada" tone="info">Adicione a primeira trilha abaixo.</StatusPanel>}
      <Card><h3 className="font-semibold text-ink">Adicionar trilha</h3><form action={saveTrilhaAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} /><label className="grid gap-1.5 text-sm font-medium text-ink">Nome<Input name="name" required /></label><label className="grid gap-1.5 text-sm font-medium text-ink">Posição<Input name="position" type="number" min="1" defaultValue={String(selectedTrilhas.length + 1)} required /></label><label className="col-span-full grid gap-1.5 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={2} /></label><Button type="submit" size="sm" className="w-fit">Adicionar</Button></form></Card>
      <ButtonLink href={href("aulas")} className="w-fit">Continuar para aulas</ButtonLink>
    </div> : <StatusPanel title="Escolha uma jornada" tone="warning"><ButtonLink href="/admin/produto?etapa=jornada" className="mt-3 w-fit">Voltar à primeira etapa</ButtonLink></StatusPanel> : null}

    {etapa === "aulas" ? selectedJourneyVersion ? <div className="grid gap-5">
      <Card><h2 className="text-lg font-semibold text-ink">Aulas</h2><p className="mt-1 text-sm text-muted">Escolha uma trilha e adicione somente as aulas dela.</p><div className="mt-4 flex flex-wrap gap-2">{selectedTrilhas.map((trilha) => <ButtonLink key={trilha.id} href={href("aulas", `&trilha=${trilha.id}`)} variant={selectedPath?.id === trilha.id ? "primary" : "secondary"} size="sm">{trilha.name}</ButtonLink>)}</div></Card>
      {selectedPath ? <TrilhaAulaBuilder journeyVersionId={String(selectedJourneyVersion.id)} organizationId={organization.organization_id} trilha={selectedPath} /> : <StatusPanel title="Selecione uma trilha" tone="info">As aulas da trilha escolhida aparecerão aqui.</StatusPanel>}
      <ButtonLink href={href("publicar")} className="w-fit">Revisar publicação</ButtonLink>
    </div> : <StatusPanel title="Escolha uma jornada" tone="warning"><ButtonLink href="/admin/produto?etapa=jornada" className="mt-3 w-fit">Voltar</ButtonLink></StatusPanel> : null}

    {etapa === "publicar" ? selectedJourneyVersion ? <Card className="grid gap-5"><div><h2 className="text-lg font-semibold text-ink">Revisar e publicar</h2><p className="mt-1 text-sm text-muted">Depois da publicação, esta versão ficará imutável.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-primary-soft p-4"><strong className="text-2xl text-primary">{selectedTrilhas.length}</strong><p className="text-sm text-muted">trilhas</p></div><div className="rounded-xl bg-success-soft p-4"><strong className="text-2xl text-success">{selectedTrilhas.reduce((sum, item) => sum + item.aulas.length, 0)}</strong><p className="text-sm text-muted">aulas</p></div><div className="rounded-xl bg-warning-soft p-4"><strong className="text-2xl text-warning">{selectedTrilhas.filter((item) => item.aulas.length === 0).length}</strong><p className="text-sm text-muted">trilhas vazias</p></div></div>{canPublish ? <form action={publishJourneyAction}><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} /><input type="hidden" name="content_hash" value={selectedJourneyVersion.content_hash ?? ""} /><Button type="submit" disabled={!graphLooksComplete || !selectedJourneyVersion.content_hash}>Validar e publicar</Button>{!graphLooksComplete ? <p className="mt-2 text-sm text-warning">Cada trilha precisa ter ao menos uma aula.</p> : null}</form> : <p className="text-sm text-muted">Seu papel não permite publicar.</p>}</Card> : <StatusPanel title="Escolha uma jornada" tone="warning"><ButtonLink href="/admin/produto?etapa=jornada" className="mt-3 w-fit">Voltar</ButtonLink></StatusPanel> : null}
  </div></AppShell>;
}