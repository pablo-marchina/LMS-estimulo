import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminJourneyEditorDetails, type JourneyEditorActivityDetails } from "@/lib/admin/journey-editor";
import { getAdminProductWorkspace, type Trilha, type TrilhaAula } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";
import { saveTrilhaAction } from "./actions";
import { saveJourneyAction } from "./journey-action";
import { publishJourneyAction } from "./publish-action";
import { TrilhaAulaBuilder, type EditableLessonTrack, type EditableTrilhaAula } from "./trilha-aula-builder";
import { TrilhaEditor, type EditableTrilha } from "./trilha-editor";
import { createEditableJourneyVersionAction } from "./version-actions";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function versionStatus(status: string) {
  if (status === "draft") return "rascunho editável";
  if (status === "published") return "publicada";
  if (status === "retired") return "arquivada";
  return status;
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
      options: question.options.map((option) => ({
        id: option.id,
        code: option.code,
        label: option.label,
        value: {},
        is_correct: option.is_correct,
        position: option.position,
      })),
    })),
  };
}

export default async function AdminProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const organization = administrativeOrganization(auth.identity);
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  }

  const canEdit = organization.permissions.includes("journey.definition.manage");
  const [workspace, libraryData] = await Promise.all([
    getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id),
    libraryRuntime.listOperator(auth.identity.user_account_id, organization.organization_id).catch(() => ({ organization_id: organization.organization_id, items: [], journey_versions: [] })),
  ]);

  const libraryItems = libraryData.items.filter((item) => item.status === "published").map((item) => ({
    library_item_version_id: item.library_item_version_id,
    title: item.title,
    content_kind: item.content_kind,
    content_format: item.content_format,
    source_name: item.source_name,
    discoverable_in_library: item.discoverable_in_library,
  }));
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

  const selectedVersionId = single(query.versao);
  const selectedJourneyVersion = journeyVersions.find((item) => String(item.id) === selectedVersionId) ?? null;
  const selectedIsDraft = selectedJourneyVersion?.status === "draft";
  const editorDetails = selectedJourneyVersion ? await getAdminJourneyEditorDetails({
    actorUserAccountId: auth.identity.user_account_id,
    organizationId: organization.organization_id,
    journeyVersionId: String(selectedJourneyVersion.id),
  }).catch(() => ({ journey_version_id: String(selectedJourneyVersion.id), activities: [] })) : null;
  const activityDetails = new Map((editorDetails?.activities ?? []).map((item) => [item.activity_version_id, item]));
  const pathDetails = new Map(workspace.paths.map((item) => [item.id, item]));

  const selectedTrilhas: EditableLessonTrack[] = (selectedJourneyVersion?.trilhas ?? []).slice().sort((a: Trilha, b: Trilha) => a.position - b.position).map((trilha) => {
    const path = pathDetails.get(trilha.id);
    const stepDetails = new Map((path?.steps ?? []).map((step) => [stringValue(step.id), step]));
    const aulas: EditableTrilhaAula[] = trilha.aulas.map((aula) => {
      const details = activityDetails.get(aula.activity_version_id);
      const step = stepDetails.get(aula.step_id);
      return {
        ...aula,
        activity_definition_id: details?.activity_definition_id,
        activity_definition_code: details?.definition_code,
        estimated_minutes: details?.estimated_minutes ?? 10,
        assets: details?.assets ?? aula.assets ?? [],
        assessment: details?.assessment ?? fallbackAssessment(aula),
        practice: details?.practice ?? aula.practice,
        step_metadata: objectValue(step?.metadata),
      };
    });
    return {
      ...trilha,
      is_default: path?.is_default,
      is_required: path?.is_required ?? trilha.is_required,
      presentation: path?.presentation ?? trilha.presentation,
      aulas,
    };
  });

  const selectedPathId = single(query.trilha);
  const selectedPath = selectedTrilhas.find((item) => item.id === selectedPathId) ?? null;
  const selectedArchetypes = new Set(selectedJourneyVersion?.eligible_archetype_codes ?? []);
  const configuration = objectValue(selectedJourneyVersion?.configuration);
  const presentation = objectValue(configuration.presentation);
  const presentationTags = Array.isArray(presentation.tags) ? presentation.tags.filter((item): item is string => typeof item === "string").join(", ") : "";
  const etapa = ["jornada", "trilhas", "aulas", "publicar"].includes(single(query.etapa)) ? single(query.etapa) : "jornada";
  const success = single(query.sucesso);
  const error = single(query.erro);
  const canPublish = canEdit && organization.permissions.includes("journey.definition.publish");
  const canEditSelected = canEdit && (!selectedJourneyVersion || selectedIsDraft);
  const graphLooksComplete = selectedTrilhas.length > 0 && selectedTrilhas.every((trilha) => trilha.aulas.length > 0);
  const base = selectedJourneyVersion ? `versao=${selectedJourneyVersion.id}` : "";
  const href = (next: string, extra = "") => `/admin/produto?etapa=${next}${base ? `&${base}` : ""}${extra}`;
  const currentCardId = stringValue(presentation.card_background_file_object_id);
  const currentFeaturedId = stringValue(presentation.featured_background_file_object_id);

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-7">
        <PageHeader eyebrow="Jornadas" title="Construtor de jornadas" description="Abra qualquer jornada, crie uma versão editável e altere jornada, trilhas, aulas e seus elementos." />

        {!canEdit ? <StatusPanel title="Acesso somente para visualização" tone="info">Os campos estão bloqueados, mas toda a estrutura pode ser consultada.</StatusPanel> : null}

        <Card className="grid gap-4">
          <div><h2 className="text-lg font-black text-secondary">Escolha a jornada e a versão</h2><p className="mt-1 text-sm text-muted">Versões publicadas permanecem intactas. Para modificá-las, crie uma nova versão editável com todo o conteúdo copiado.</p></div>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="etapa" value={etapa} />
            <label className="grid min-w-72 flex-1 gap-1 text-sm font-medium text-ink">Jornada e versão
              <Select name="versao" defaultValue={selectedVersionId}>
                <option value="">Criar uma jornada nova</option>
                {journeyVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)} · {versionStatus(item.status)}</option>)}
              </Select>
            </label>
            <Button variant="secondary" type="submit">Abrir</Button>
          </form>
        </Card>

        {selectedJourneyVersion && !selectedIsDraft ? <StatusPanel title="Versão protegida" tone="info"><div className="grid gap-3"><p>Esta versão está {versionStatus(selectedJourneyVersion.status)} e pode ser consultada, mas não alterada diretamente.</p>{canEdit ? <form action={createEditableJourneyVersionAction}><input type="hidden" name="source_journey_version_id" value={String(selectedJourneyVersion.id)} /><Button type="submit" size="sm" className="w-fit">Criar versão editável completa</Button></form> : null}</div></StatusPanel> : null}

        <nav className="grid gap-2 rounded-2xl border border-border bg-white p-2 shadow-sm sm:grid-cols-4" aria-label="Etapas do construtor">
          {[{ id: "jornada", label: "1. Jornada" }, { id: "trilhas", label: "2. Trilhas" }, { id: "aulas", label: "3. Aulas" }, { id: "publicar", label: "4. Publicar" }].map((item) => <ButtonLink key={item.id} href={href(item.id)} variant={etapa === item.id ? "primary" : "ghost"} size="sm">{item.label}</ButtonLink>)}
        </nav>

        {success ? <StatusPanel title={success === "jornada_publicada" ? "Jornada publicada" : success === "versao_editavel_criada" ? "Versão editável criada" : "Configuração salva"} tone="success">{success === "versao_editavel_criada" ? "Todas as trilhas, aulas e elementos foram copiados para o novo rascunho." : "A alteração foi registrada."}</StatusPanel> : null}
        {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos obrigatórios e tente novamente.</StatusPanel> : null}

        <fieldset disabled={!canEditSelected} className="contents">
          {etapa === "jornada" ? <Card className="grid gap-6">
            <div><h2 className="text-lg font-black text-secondary">Jornada</h2><p className="mt-1 text-sm text-muted">Edite o conteúdo principal e a apresentação pública desta versão.</p></div>
            <form className="grid gap-5" action={saveJourneyAction} encType="multipart/form-data">
              <input type="hidden" name="organization_id" value={organization.organization_id} />
              <input type="hidden" name="version_id" value={selectedJourneyVersion ? String(selectedJourneyVersion.id) : ""} />
              <input type="hidden" name="definition_id" value={selectedJourneyVersion?.definitionId ?? ""} />
              <input type="hidden" name="definition_code" value={selectedJourneyVersion?.definitionCode ?? ""} />
              <input type="hidden" name="configuration_snapshot" value={JSON.stringify(selectedJourneyVersion?.configuration ?? {})} />
              <input type="hidden" name="name" value={selectedJourneyVersion?.definitionName ?? ""} />
              <input type="hidden" name="current_card_background_file_object_id" value={currentCardId} />
              <input type="hidden" name="current_featured_background_file_object_id" value={currentFeaturedId} />

              <label className="grid gap-1 text-sm font-medium text-ink">Programa<Select name="program_id" required defaultValue={selectedJourneyVersion?.programId ?? ""}><option value="">Selecione</option>{activePrograms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">Agrupamento administrativo.</span></label>
              <label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="title" required defaultValue={selectedJourneyVersion?.title ?? selectedJourneyVersion?.definitionName ?? ""} /><span className="text-[11px] font-normal text-muted">Nome exibido ao público.</span></label>
              <label className="grid gap-1 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={3} defaultValue={selectedJourneyVersion?.description ?? ""} /><span className="text-[11px] font-normal text-muted">Explique o resultado da jornada.</span></label>

              <section className="grid gap-4 rounded-2xl border border-primary/20 bg-primary-soft/30 p-4" aria-labelledby="visual-jornada-title">
                <div><h3 id="visual-jornada-title" className="font-black text-secondary">Visual da jornada</h3><p className="text-[11px] text-muted">Estas opções estão disponíveis para todas as jornadas.</p></div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-3 rounded-xl bg-white p-3"><div><strong className="text-sm text-secondary">Imagem quadrada</strong><p className="text-[11px] text-muted">Cartões comuns · recomendado 1200 × 1200.</p></div>{selectedJourneyVersion && currentCardId ? <img src={`/api/journey-covers/${selectedJourneyVersion.id}/card`} alt="Capa quadrada atual" className="aspect-square w-full max-w-52 rounded-xl object-cover" /> : null}<FileUploadPreview name="card_background_file" accept="image/png,image/jpeg,image/webp" label="Nova imagem quadrada" help="PNG, JPG ou WebP." /><label className="grid gap-1 text-sm font-medium text-ink">Descrição da imagem<Input name="card_background_alt" defaultValue={stringValue(presentation.card_background_alt)} placeholder="Ex.: empreendedora usando tecnologia" /></label></div>
                  <div className="grid gap-3 rounded-xl bg-white p-3"><div><strong className="text-sm text-secondary">Imagem ampla</strong><p className="text-[11px] text-muted">Jornada em destaque · recomendado 1920 × 900.</p></div>{selectedJourneyVersion && (currentFeaturedId || currentCardId) ? <img src={`/api/journey-covers/${selectedJourneyVersion.id}/${currentFeaturedId ? "featured" : "card"}`} alt="Capa ampla atual" className="aspect-[16/8] w-full rounded-xl object-cover" /> : null}<FileUploadPreview name="featured_background_file" accept="image/png,image/jpeg,image/webp" label="Nova imagem ampla" help="Usada somente no destaque." /><label className="grid gap-1 text-sm font-medium text-ink">Descrição da imagem<Input name="featured_background_alt" defaultValue={stringValue(presentation.featured_background_alt)} placeholder="Descrição curta" /></label></div>
                </div>
                <label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm text-ink"><input type="checkbox" name="presentation_featured" defaultChecked={presentation.featured === true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Exibir como destaque</strong><small className="text-muted">Usa a imagem ampla e ocupa mais espaço.</small></span></label>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="grid gap-1 text-sm font-medium text-ink">Prioridade<Input name="presentation_featured_rank" type="number" min="1" defaultValue={String(typeof presentation.featured_rank === "number" ? presentation.featured_rank : 9999)} /><span className="text-[11px] font-normal text-muted">Menor número aparece primeiro.</span></label><label className="grid gap-1 text-sm font-medium text-ink">Texto superior<Input name="presentation_eyebrow" defaultValue={stringValue(presentation.eyebrow) || "Jornada Estímulo"} /></label><label className="grid gap-1 text-sm font-medium text-ink">Selo ou parceria<Input name="presentation_badge" defaultValue={stringValue(presentation.badge) || "Capacitação Estímulo"} /></label><label className="grid gap-1 text-sm font-medium text-ink">Cor<Select name="presentation_tone" defaultValue={stringValue(presentation.tone) || "blue"}><option value="blue">Azul</option><option value="green">Verde</option><option value="cyan">Ciano</option><option value="magenta">Magenta</option><option value="orange">Laranja</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Ícone<Select name="presentation_icon" defaultValue={stringValue(presentation.icon) || "sparkles"}><option value="sparkles">Brilhos</option><option value="rocket">Foguete</option><option value="book-open">Livro</option><option value="lightbulb">Ideia</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Botão<Input name="presentation_cta" defaultValue={stringValue(presentation.cta) || "Entrar nesta jornada"} /></label></div>
                <label className="grid gap-1 text-sm font-medium text-ink">Temas<Input name="presentation_tags" defaultValue={presentationTags} placeholder="Marketing, Gestão, IA" /><span className="text-[11px] font-normal text-muted">Separe por vírgulas.</span></label>
              </section>

              <details className="rounded-2xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-black text-secondary">Configurações adicionais</summary><div className="grid gap-4 border-t border-border p-4"><label className="grid gap-1 text-sm font-medium text-ink">Propósito interno<Textarea name="purpose" rows={2} defaultValue={selectedJourneyVersion?.definitionPurpose ?? ""} /><span className="text-[11px] font-normal text-muted">Não aparece no cartão.</span></label><fieldset className="grid gap-2"><legend className="text-sm font-medium text-ink">Perfis elegíveis</legend><p className="text-[11px] text-muted">Sem seleção, acesso aberto.</p><div className="flex flex-wrap gap-4">{[{ code: "fazedor", name: "Fazedor(a)" }, { code: "batalhador", name: "Batalhador(a)" }, { code: "construtor", name: "Construtor(a)" }, { code: "navegador", name: "Navegador(a)" }].map((archetype) => <label key={archetype.code} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="eligible_archetype_codes" value={archetype.code} defaultChecked={selectedArchetypes.has(archetype.code)} className="size-4 accent-primary" />{archetype.name}</label>)}</div></fieldset></div></details>
              <Button type="submit" className="w-fit">Salvar e continuar</Button>
            </form>
          </Card> : null}

          {etapa === "trilhas" ? selectedJourneyVersion ? <div className="grid gap-5">
            <Card><h2 className="text-lg font-black text-secondary">Trilhas de {selectedJourneyVersion.title}</h2><p className="mt-1 text-sm text-muted">Abra qualquer trilha para editar nome, ordem, aparência, obrigatoriedade e selo.</p></Card>
            {selectedTrilhas.length ? <div className="grid gap-3">{selectedTrilhas.map((trilha) => <TrilhaEditor key={trilha.id} journeyVersionId={String(selectedJourneyVersion.id)} trilha={trilha as EditableTrilha} lessonsHref={href("aulas", `&trilha=${trilha.id}`)} />)}</div> : <StatusPanel title="Nenhuma trilha criada" tone="info">Adicione a primeira trilha abaixo.</StatusPanel>}
            <Card><h3 className="font-black text-secondary">Adicionar trilha</h3><form action={saveTrilhaAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} /><label className="grid gap-1 text-sm font-medium text-ink">Nome<Input name="name" required /></label><label className="grid gap-1 text-sm font-medium text-ink">Posição<Input name="position" type="number" min="1" defaultValue={String(selectedTrilhas.length + 1)} required /></label><label className="col-span-full grid gap-1 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={2} /></label><details className="col-span-full rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Aparência</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-ink">Cor<Select name="tone" defaultValue="cyan"><option value="cyan">Ciano</option><option value="magenta">Magenta</option><option value="green">Verde</option><option value="yellow">Amarelo</option><option value="orange">Laranja</option><option value="violet">Violeta</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Ícone<Select name="icon" defaultValue="sparkles"><option value="sparkles">Brilhos</option><option value="rocket">Foguete</option><option value="book-open">Livro</option><option value="lightbulb">Ideia</option></Select></label></div></details><label className="col-span-full flex items-start gap-3 rounded-xl border border-border p-3 text-sm text-ink"><input type="checkbox" name="is_required" defaultChecked className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Conta para conclusão</strong><small className="text-muted">Desmarque para trilha opcional.</small></span></label><Button type="submit" size="sm" className="w-fit">Adicionar</Button></form></Card>
            <ButtonLink href={href("aulas")} className="w-fit">Continuar para aulas</ButtonLink>
          </div> : <StatusPanel title="Escolha uma jornada" tone="warning"><ButtonLink href="/admin/produto?etapa=jornada" className="mt-3 w-fit">Voltar à primeira etapa</ButtonLink></StatusPanel> : null}

          {etapa === "aulas" ? selectedJourneyVersion ? <div className="grid gap-5"><Card><h2 className="text-lg font-black text-secondary">Aulas</h2><p className="mt-1 text-sm text-muted">Escolha uma trilha e abra qualquer aula para editar conteúdo, textos, perguntas e entrega prática.</p><div className="mt-4 flex flex-wrap gap-2">{selectedTrilhas.map((trilha) => <ButtonLink key={trilha.id} href={href("aulas", `&trilha=${trilha.id}`)} variant={selectedPath?.id === trilha.id ? "primary" : "secondary"} size="sm">{trilha.name}</ButtonLink>)}</div></Card>{selectedPath ? <TrilhaAulaBuilder journeyVersionId={String(selectedJourneyVersion.id)} organizationId={organization.organization_id} trilha={selectedPath} libraryItems={libraryItems} /> : <StatusPanel title="Selecione uma trilha" tone="info">As aulas aparecerão aqui.</StatusPanel>}<ButtonLink href={href("publicar")} className="w-fit">Revisar publicação</ButtonLink></div> : <StatusPanel title="Escolha uma jornada" tone="warning"><ButtonLink href="/admin/produto?etapa=jornada" className="mt-3 w-fit">Voltar</ButtonLink></StatusPanel> : null}

          {etapa === "publicar" ? selectedJourneyVersion ? <Card className="grid gap-5"><div><h2 className="text-lg font-black text-secondary">Revisar e publicar</h2><p className="mt-1 text-sm text-muted">A versão publicada fica imutável. Novas mudanças serão feitas em outra versão editável.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-primary-soft p-4"><strong className="text-2xl text-primary">{selectedTrilhas.length}</strong><p className="text-sm text-muted">trilhas</p></div><div className="rounded-xl bg-success-soft p-4"><strong className="text-2xl text-success">{selectedTrilhas.reduce((sum, item) => sum + item.aulas.length, 0)}</strong><p className="text-sm text-muted">aulas</p></div><div className="rounded-xl bg-warning-soft p-4"><strong className="text-2xl text-warning">{selectedTrilhas.filter((item) => item.aulas.length === 0).length}</strong><p className="text-sm text-muted">trilhas vazias</p></div></div>{selectedIsDraft && canPublish ? <form action={publishJourneyAction}><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion.id)} /><input type="hidden" name="content_hash" value={selectedJourneyVersion.content_hash ?? ""} /><Button type="submit" disabled={!graphLooksComplete || !selectedJourneyVersion.content_hash}>Validar e publicar</Button>{!graphLooksComplete ? <p className="mt-2 text-sm text-warning">Cada trilha precisa ter ao menos uma aula.</p> : null}</form> : <p className="text-sm text-muted">{selectedIsDraft ? "Somente um Administrador geral pode publicar." : "Crie uma versão editável para publicar uma nova versão desta jornada."}</p>}</Card> : <StatusPanel title="Escolha uma jornada" tone="warning"><ButtonLink href="/admin/produto?etapa=jornada" className="mt-3 w-fit">Voltar</ButtonLink></StatusPanel> : null}
        </fieldset>
      </div>
    </AppShell>
  );
}
