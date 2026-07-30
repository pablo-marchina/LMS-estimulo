import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminJourneyEditorDetails, type JourneyEditorActivityDetails } from "@/lib/admin/journey-editor";
import { getAdminProductWorkspace, type Trilha, type TrilhaAula, type VersionSummary } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";
import { saveTrilhaAction } from "./actions";
import { deleteJourneyAction } from "./delete-journey-action";
import { saveJourneyAction } from "./journey-action";
import { publishJourneyAction } from "./publish-action";
import { TrilhaAulaBuilder, type EditableLessonTrack, type EditableTrilhaAula } from "./trilha-aula-builder";
import { TrilhaEditor, type EditableTrilha } from "./trilha-editor";

export const dynamic = "force-dynamic";

type ArchetypeOption = { code: string; name: string; description?: string | null };

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function versionStatus(status: string) { return status === "draft" ? "Rascunho" : status === "published" ? "Publicada" : status; }
function dateValue(value: unknown) { const date = typeof value === "string" ? Date.parse(value) : Number.NaN; return Number.isFinite(date) ? date : 0; }
function archetypesFromVersion(version: VersionSummary | null | undefined): ArchetypeOption[] {
  const raw = version && Array.isArray(version.archetypes) ? version.archetypes : [];
  return raw.map((item) => objectValue(item)).map((item) => ({ code: stringValue(item.code), name: stringValue(item.name), description: stringValue(item.description) || null })).filter((item) => item.code && item.name);
}

function fallbackAssessment(aula: TrilhaAula): JourneyEditorActivityDetails["assessment"] {
  if (!aula.assessment) return null;
  return {
    passing_score: aula.assessment.passing_score,
    max_attempts: aula.assessment.max_attempts,
    questions: aula.assessment.questions.map((question) => ({
      id: question.id,
      code: question.code,
      prompt: question.prompt,
      question_type: question.question_type ?? "single_choice",
      points: 1,
      position: question.position,
      configuration: {},
      options: question.options.map((option) => ({ id: option.id, code: option.code, label: option.label, value: {}, is_correct: option.is_correct, position: option.position })),
    })),
  };
}

export default async function AdminProductPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const canEdit = organization.permissions.includes("journey.definition.manage");
  const canPublish = organization.permissions.includes("journey.definition.publish");
  const [workspace, libraryData] = await Promise.all([
    getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id),
    libraryRuntime.listOperator(auth.identity.user_account_id, organization.organization_id).catch(() => ({ organization_id: organization.organization_id, items: [], journey_versions: [] })),
  ]);
  const libraryItems = libraryData.items.filter((item) => item.status === "published").map((item) => ({
    library_item_version_id: item.library_item_version_id,
    title: item.title,
    summary: item.summary,
    body: item.body,
    external_url: item.external_url,
    original_filename: item.original_filename,
    content_kind: item.content_kind,
    content_format: item.content_format,
    source_name: item.source_name,
    discoverable_in_library: item.discoverable_in_library,
  }));
  const activePrograms = workspace.programs.filter((item) => item.status !== "retired");
  const activeJourneys = workspace.journeys.filter((item) => item.status !== "retired");
  const journeyVersions = activeJourneys.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name, definitionId: item.definition_id, definitionCode: item.code, definitionPurpose: stringValue(item.purpose), programId: stringValue(item.program_id) })));
  const latestVersionIds = new Set(activeJourneys.map((journey) => journey.versions.slice().sort((a, b) => b.version_number - a.version_number)[0]?.id).filter(Boolean).map(String));
  const latestVersions = journeyVersions.filter((item) => latestVersionIds.has(String(item.id)) && (item.status === "draft" || item.status === "published")).sort((a, b) => a.definitionName.localeCompare(b.definitionName, "pt-BR"));

  const selectedVersionId = single(query.versao);
  const selectedJourneyVersion = latestVersions.find((item) => String(item.id) === selectedVersionId) ?? null;
  const selectedIsDraft = selectedJourneyVersion?.status === "draft";
  const selectedIsPublished = selectedJourneyVersion?.status === "published";
  const editorDetails = selectedJourneyVersion ? await getAdminJourneyEditorDetails({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id, journeyVersionId: String(selectedJourneyVersion.id) }).catch(() => ({ journey_version_id: String(selectedJourneyVersion.id), activities: [] })) : null;
  const activityDetails = new Map((editorDetails?.activities ?? []).map((item) => [item.activity_version_id, item]));
  const pathDetails = new Map(workspace.paths.map((item) => [item.id, item]));
  const selectedTrilhas: EditableLessonTrack[] = (selectedJourneyVersion?.trilhas ?? []).slice().sort((a: Trilha, b: Trilha) => a.position - b.position).map((trilha) => {
    const path = pathDetails.get(trilha.id);
    const stepDetails = new Map((path?.steps ?? []).map((step) => [stringValue(step.id), step]));
    const aulas: EditableTrilhaAula[] = trilha.aulas.map((aula) => {
      const details = activityDetails.get(aula.activity_version_id);
      const step = stepDetails.get(aula.step_id);
      return { ...aula, activity_definition_id: details?.activity_definition_id, activity_definition_code: details?.definition_code, estimated_minutes: details?.estimated_minutes ?? 10, assets: details?.assets ?? aula.assets ?? [], assessment: details?.assessment ?? fallbackAssessment(aula), practice: details?.practice ?? aula.practice, step_metadata: objectValue(step?.metadata) };
    });
    return { ...trilha, is_default: path?.is_default, is_required: path?.is_required ?? trilha.is_required, presentation: path?.presentation ?? trilha.presentation, aulas };
  });

  const activeDiagnosticVersion = workspace.diagnostics.flatMap((definition) => definition.versions).filter((version) => version.status === "published").sort((a, b) => dateValue(b.published_at) - dateValue(a.published_at) || b.version_number - a.version_number)[0] ?? null;
  const activeArchetypes = archetypesFromVersion(activeDiagnosticVersion);
  const selectedArchetypes = new Set(selectedJourneyVersion?.eligible_archetype_codes ?? []);
  const legacyArchetypes = [...selectedArchetypes].filter((code) => !activeArchetypes.some((item) => item.code === code)).map((code) => ({ code, name: `${code} (perfil anterior)` }));
  const availableArchetypes = [...activeArchetypes, ...legacyArchetypes];
  const configuration = objectValue(selectedJourneyVersion?.configuration);
  const presentation = objectValue(configuration.presentation);
  const presentationTags = Array.isArray(presentation.tags) ? presentation.tags.filter((item): item is string => typeof item === "string").join(", ") : "";
  const requestedStep = single(query.etapa);
  const stepAliases: Record<string, string> = { jornada: "geral", trilhas: "conteudo", aulas: "conteudo", publicar: "publicacao" };
  const etapa = ["geral", "conteudo", "publicacao"].includes(stepAliases[requestedStep] ?? requestedStep) ? (stepAliases[requestedStep] ?? requestedStep) : "geral";
  const success = single(query.sucesso);
  const error = single(query.erro);
  const canEditSelected = canEdit && (!selectedJourneyVersion || selectedIsDraft || (selectedIsPublished && canPublish));
  const graphLooksComplete = selectedTrilhas.length > 0 && selectedTrilhas.every((trilha) => trilha.aulas.length > 0);
  const base = selectedJourneyVersion ? `versao=${selectedJourneyVersion.id}` : "";
  const href = (next: string) => `/admin/produto?etapa=${next}${base ? `&${base}` : ""}`;
  const currentCardId = stringValue(presentation.card_background_file_object_id);
  const currentFeaturedId = stringValue(presentation.featured_background_file_object_id);

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Jornadas" title="Jornadas e aulas" description="Crie, organize e publique a experiência de aprendizagem. Abra somente a parte que deseja alterar." />
    {!canEdit ? <StatusPanel title="Acesso somente para visualização" tone="info">Você pode consultar a estrutura, mas não alterá-la.</StatusPanel> : null}

    <Card className="grid gap-4"><div><h2 className="font-semibold text-secondary">Qual jornada deseja administrar?</h2><p className="mt-1 text-sm text-muted">Cada jornada aparece uma única vez: como rascunho ou publicada.</p></div><form method="get" className="flex flex-wrap items-end gap-3"><input type="hidden" name="etapa" value={etapa} /><label className="grid min-w-72 flex-1 gap-1 text-sm font-medium text-ink">Jornada<Select name="versao" defaultValue={selectedVersionId}><option value="">Criar nova jornada</option>{latestVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · {versionStatus(item.status)}</option>)}</Select></label><Button variant="secondary" type="submit">Abrir</Button></form></Card>

    {selectedIsDraft ? <StatusPanel title="Rascunho" tone="info">Você pode editar livremente. Participantes só verão esta jornada depois da publicação.</StatusPanel> : null}
    {selectedIsPublished ? <StatusPanel title="Jornada publicada" tone="warning">Salvar altera a experiência dos participantes no próximo carregamento da página. Somente administradores com permissão de publicação podem fazer isso.</StatusPanel> : null}
    {selectedJourneyVersion && !canEditSelected && canEdit ? <StatusPanel title="Edição restrita" tone="info">Você pode consultar esta jornada, mas não possui permissão para alterar conteúdo já publicado.</StatusPanel> : null}
    {success ? <StatusPanel title={success === "jornada_publicada" ? "Jornada publicada" : success === "atualizado_ao_vivo" ? "Atualização publicada" : success === "jornada_excluida" ? "Jornada excluída" : "Rascunho salvo"} tone="success">{success === "atualizado_ao_vivo" ? "As mudanças já estão disponíveis para participantes no próximo carregamento." : success === "jornada_publicada" ? "A jornada já pode ser acessada pelos participantes." : success === "jornada_excluida" ? "A jornada foi retirada da administração e do catálogo. O histórico de participantes foi preservado." : "Continue a edição ou publique quando estiver pronto."}</StatusPanel> : null}
    {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos obrigatórios e tente novamente.</StatusPanel> : null}

    <nav className="grid gap-2 rounded-2xl border border-border bg-white p-2 sm:grid-cols-3" aria-label="Etapas do construtor">{[{ id: "geral", label: "1. Informações" }, { id: "conteudo", label: "2. Trilhas e aulas" }, { id: "publicacao", label: "3. Publicação" }].map((item) => <ButtonLink key={item.id} href={href(item.id)} variant={etapa === item.id ? "primary" : "ghost"} size="sm">{item.label}</ButtonLink>)}</nav>

    <fieldset disabled={!canEditSelected} className="contents">
      {etapa === "geral" ? <Card className="grid gap-5"><div><h2 className="text-lg font-black text-secondary">Informações principais</h2><p className="mt-1 text-sm text-muted">Título é o único campo obrigatório para criar uma jornada.</p></div><form className="grid gap-4" action={saveJourneyAction} encType="multipart/form-data">
        <input type="hidden" name="version_id" value={selectedJourneyVersion ? String(selectedJourneyVersion.id) : ""} /><input type="hidden" name="definition_id" value={selectedJourneyVersion?.definitionId ?? ""} /><input type="hidden" name="definition_code" value={selectedJourneyVersion?.definitionCode ?? ""} /><input type="hidden" name="configuration_snapshot" value={JSON.stringify(selectedJourneyVersion?.configuration ?? {})} /><input type="hidden" name="current_card_background_file_object_id" value={currentCardId} /><input type="hidden" name="current_featured_background_file_object_id" value={currentFeaturedId} />
        <label className="grid gap-1 text-sm font-medium text-ink">Programa <span className="text-xs font-normal text-muted">(opcional)</span><Select name="program_id" defaultValue={selectedJourneyVersion?.programId ?? ""}><option value="">Sem programa</option>{activePrograms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">Use somente quando quiser agrupar jornadas relacionadas.</span></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="title" required defaultValue={selectedJourneyVersion?.title ?? selectedJourneyVersion?.definitionName ?? ""} /><span className="text-[11px] font-normal text-muted">É o nome visto nos cartões e dentro da jornada.</span></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={3} defaultValue={selectedJourneyVersion?.description ?? selectedJourneyVersion?.definitionPurpose ?? ""} /><span className="text-[11px] font-normal text-muted">Explique em poucas frases o resultado que a pessoa alcançará.</span></label>

        <details className="rounded-2xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Visual e divulgação</summary><div className="grid gap-5 border-t border-border p-4"><div className="grid gap-4 lg:grid-cols-2"><div className="grid gap-3 rounded-xl bg-surface-muted p-3"><div><strong className="text-sm text-secondary">Imagem do cartão</strong><p className="mt-1 text-xs text-muted">Dimensão recomendada: 1200 × 1200 px, proporção 1:1.</p></div>{selectedJourneyVersion && currentCardId ? <img src={`/api/journey-covers/${selectedJourneyVersion.id}/card`} alt="Capa atual" className="aspect-square w-full max-w-48 rounded-xl object-cover" /> : null}<FileUploadPreview name="card_background_file" accept="image/png,image/jpeg,image/webp" label="Escolher imagem" help="PNG, JPG ou WebP · 1200 × 1200 px." /><label className="grid gap-1 text-sm font-medium text-ink">Descrição da imagem<Input name="card_background_alt" defaultValue={stringValue(presentation.card_background_alt)} /></label></div><div className="grid gap-3 rounded-xl bg-surface-muted p-3"><div><strong className="text-sm text-secondary">Imagem de destaque</strong><p className="mt-1 text-xs text-muted">Dimensão recomendada: 1920 × 900 px, proporção aproximada 32:15.</p></div>{selectedJourneyVersion && (currentFeaturedId || currentCardId) ? <img src={`/api/journey-covers/${selectedJourneyVersion.id}/${currentFeaturedId ? "featured" : "card"}`} alt="Destaque atual" className="aspect-[32/15] w-full rounded-xl object-cover" /> : null}<FileUploadPreview name="featured_background_file" accept="image/png,image/jpeg,image/webp" label="Escolher imagem" help="PNG, JPG ou WebP · 1920 × 900 px." /><label className="grid gap-1 text-sm font-medium text-ink">Descrição da imagem<Input name="featured_background_alt" defaultValue={stringValue(presentation.featured_background_alt)} /></label></div></div><label className="flex items-start gap-3 rounded-xl bg-primary-soft p-3 text-sm text-ink"><input type="checkbox" name="presentation_featured" defaultChecked={presentation.featured === true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Destacar esta jornada</strong><small className="text-muted">Ela ganha mais espaço na página de jornadas.</small></span></label><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-sm font-medium text-ink">Cor<Select name="presentation_tone" defaultValue={stringValue(presentation.tone) || "blue"}><option value="blue">Azul</option><option value="green">Verde</option><option value="cyan">Ciano</option><option value="magenta">Magenta</option><option value="orange">Laranja</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Ícone<Select name="presentation_icon" defaultValue={stringValue(presentation.icon) || "sparkles"}><option value="sparkles">Brilhos</option><option value="rocket">Foguete</option><option value="book-open">Livro</option><option value="lightbulb">Ideia</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Texto do botão<Input name="presentation_cta" defaultValue={stringValue(presentation.cta) || "Entrar nesta jornada"} /></label><label className="grid gap-1 text-sm font-medium text-ink">Temas<Input name="presentation_tags" defaultValue={presentationTags} placeholder="Gestão, vendas" /></label></div><input type="hidden" name="presentation_featured_rank" value={String(typeof presentation.featured_rank === "number" ? presentation.featured_rank : 9999)} /><input type="hidden" name="presentation_eyebrow" value={stringValue(presentation.eyebrow) || "Jornada Estímulo"} /><input type="hidden" name="presentation_badge" value={stringValue(presentation.badge) || "Capacitação Estímulo"} /></div></details>
        <details className="rounded-2xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Quem pode acessar</summary><div className="grid gap-3 border-t border-border p-4"><p className="text-xs text-muted">Sem seleção, a jornada fica disponível para todos os perfis. A lista acompanha o diagnóstico atualmente publicado.</p><div className="flex flex-wrap gap-4">{availableArchetypes.map((item) => <label key={item.code} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="eligible_archetype_codes" value={item.code} defaultChecked={selectedArchetypes.has(item.code)} className="size-4 accent-primary" />{item.name}</label>)}{availableArchetypes.length === 0 ? <p className="text-sm text-muted">Nenhum perfil foi publicado no diagnóstico ativo.</p> : null}</div></div></details>
        <Button type="submit" className="w-fit">{selectedIsPublished ? "Salvar e atualizar agora" : "Salvar rascunho"}</Button>
      </form>{selectedJourneyVersion && canEdit ? <details className="rounded-2xl border border-danger/25 bg-danger/5"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-danger">Excluir jornada</summary><form action={deleteJourneyAction} className="grid gap-3 border-t border-danger/20 p-4"><input type="hidden" name="journey_definition_id" value={selectedJourneyVersion.definitionId} /><p className="text-sm text-muted">A jornada será retirada do catálogo e da administração. Matrículas e conclusões já registradas serão preservadas.</p><label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" name="confirm_delete" value="true" required className="mt-0.5 size-4 accent-danger" />Confirmo que desejo excluir esta jornada.</label><Button type="submit" variant="danger" size="sm" className="w-fit">Excluir jornada</Button></form></details> : null}</Card> : null}

      {etapa === "conteudo" ? selectedJourneyVersion ? <div className="grid gap-5"><Card><h2 className="text-lg font-black text-secondary">Trilhas e aulas</h2><p className="mt-1 text-sm text-muted">Cada trilha reúne suas próprias aulas. Ao abrir uma aula, o conteúdo atual aparece antes da escolha de origem.</p></Card>{selectedTrilhas.map((trilha) => <section key={trilha.id} className="grid gap-3"><TrilhaEditor journeyVersionId={String(selectedJourneyVersion.id)} trilha={trilha as EditableTrilha} /><TrilhaAulaBuilder journeyVersionId={String(selectedJourneyVersion.id)} organizationId={organization.organization_id} trilha={trilha} libraryItems={libraryItems} /></section>)}{selectedTrilhas.length === 0 ? <StatusPanel title="Comece pela primeira trilha" tone="info">Uma trilha é um grupo de aulas sobre o mesmo objetivo.</StatusPanel> : null}<details className="rounded-2xl border border-primary/20 bg-white"><summary className="cursor-pointer px-5 py-4 font-semibold text-primary">Adicionar trilha</summary><form action={saveTrilhaAction} className="grid gap-4 border-t border-border p-5"><input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} /><label className="grid gap-1 text-sm font-medium text-ink">Nome<Input name="name" required /><span className="text-[11px] font-normal text-muted">Ex.: Primeiros passos, Vendas ou Gestão financeira.</span></label><label className="grid gap-1 text-sm font-medium text-ink">Explicação curta<Textarea name="description" rows={2} /></label><input type="hidden" name="position" value={String(selectedTrilhas.length + 1)} /><input type="hidden" name="tone" value="cyan" /><input type="hidden" name="icon" value="sparkles" /><input type="hidden" name="is_required" value="true" /><Button type="submit" size="sm" className="w-fit">Adicionar trilha</Button></form></details></div> : <StatusPanel title="Salve as informações primeiro" tone="info"><ButtonLink href="/admin/produto?etapa=geral" className="mt-3 w-fit">Criar jornada</ButtonLink></StatusPanel> : null}

      {etapa === "publicacao" ? selectedJourneyVersion ? <Card className="grid gap-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-secondary">Publicação</h2><p className="mt-1 text-sm text-muted">Confira a estrutura antes de disponibilizar a jornada.</p></div><StatusPill tone={selectedIsPublished ? "success" : "neutral"}>{versionStatus(selectedJourneyVersion.status)}</StatusPill></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-primary-soft p-4"><strong className="text-2xl text-primary">{selectedTrilhas.length}</strong><p className="text-sm text-muted">trilhas</p></div><div className="rounded-xl bg-success-soft p-4"><strong className="text-2xl text-success">{selectedTrilhas.reduce((sum, item) => sum + item.aulas.length, 0)}</strong><p className="text-sm text-muted">aulas</p></div><div className="rounded-xl bg-warning-soft p-4"><strong className="text-2xl text-warning">{selectedTrilhas.filter((item) => item.aulas.length === 0).length}</strong><p className="text-sm text-muted">trilhas sem aula</p></div></div>{selectedIsDraft && canPublish ? <form action={publishJourneyAction}><input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} /><input type="hidden" name="content_hash" value={selectedJourneyVersion.content_hash ?? ""} /><Button type="submit" disabled={!graphLooksComplete || !selectedJourneyVersion.content_hash}>Publicar jornada</Button>{!graphLooksComplete ? <p className="mt-2 text-sm text-warning">Cada trilha precisa ter ao menos uma aula.</p> : null}</form> : selectedIsPublished ? <StatusPanel title="Publicação ativa" tone="success">A jornada já está no ar. Alterações salvas em Informações, trilhas ou aulas são aplicadas imediatamente.</StatusPanel> : <p className="text-sm text-muted">Somente um administrador com permissão de publicação pode concluir esta etapa.</p>}</Card> : <StatusPanel title="Escolha uma jornada" tone="info">Abra uma jornada para revisar sua publicação.</StatusPanel> : null}
    </fieldset>
  </div></AppShell>;
}
