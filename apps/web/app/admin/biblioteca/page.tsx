import Link from "next/link";
import { randomUUID } from "node:crypto";
import { publishLibraryContentAction, saveLibraryContentAction } from "@/app/actions/library";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TableScroll, Table, Th, Td } from "@/components/ui/table";
import { getAuthContext } from "@/lib/auth/context";
import type { OperatorLibraryItem } from "@/lib/library/contracts";
import { libraryRuntime } from "@/lib/library/runtime";

export const dynamic = "force-dynamic";

function editableItem(items: OperatorLibraryItem[], id: string | undefined): OperatorLibraryItem | null {
  if (!id) return items.find((item) => item.status === "draft") ?? null;
  return items.find((item) => item.library_item_version_id === id && item.status === "draft") ?? null;
}

function fileSize(value: number | null): string | null {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const kindLabels: Record<string, string> = {
  article: "Artigo próprio",
  external_link: "Link externo",
  file: "Arquivo",
};

export default async function AdminLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    organization?: string;
    edit?: string;
    salvo?: string;
    publicado?: string;
    upload?: string;
    codigo?: string;
    arquivo?: string;
    nomeArquivo?: string;
    q?: string;
    tema?: string;
    tipo?: string;
    statusItem?: string;
    liberacao?: string;
  }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-6 py-16">
        <StatusPanel title="Acesso indisponível" tone="warning"><p>Entre e vincule uma identidade interna.</p></StatusPanel>
      </div>
    );
  }
  const organization = auth.identity.organizations.find((item) => item.organization_id === query.organization) ?? auth.identity.organizations[0];
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;
  }
  if (!organization.permissions.includes("library.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Biblioteca somente para consulta" tone="warning"><p>Este vínculo não possui permissão editorial.</p></StatusPanel></AppShell>;
  }

  const data = await libraryRuntime.listOperator(auth.identity.user_account_id, organization.organization_id);
  const editing = editableItem(data.items, query.edit);
  const currentFileObjectId = query.arquivo ?? editing?.file_object_id ?? "";
  const currentFilename = query.nomeArquivo ?? editing?.original_filename ?? "";
  const topics = [...new Set(data.items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const normalizedQuery = (query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const filteredItems = data.items.filter((item) => {
    if (normalizedQuery && ![item.title, item.summary, ...item.topics].join(" ").toLocaleLowerCase("pt-BR").includes(normalizedQuery)) return false;
    if (query.tema && !item.topics.includes(query.tema)) return false;
    if (query.tipo && item.content_kind !== query.tipo) return false;
    if (query.statusItem && item.status !== query.statusItem) return false;
    if (query.liberacao === "liberado" && !item.discoverable_in_library) return false;
    if (query.liberacao === "restrito" && item.discoverable_in_library) return false;
    return true;
  });
  const drafts = filteredItems.filter((item) => item.status === "draft");
  const published = filteredItems.filter((item) => item.status === "published");
  const releasedCount = data.items.filter((item) => item.status === "published" && item.discoverable_in_library).length;
  const journeyOnlyCount = data.items.filter((item) => item.status === "published" && !item.discoverable_in_library && item.journey_version_ids.length > 0).length;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Conteúdo"
          title="Biblioteca"
          description="Cadastre artigos, links ou arquivos. Associar um material a uma jornada e liberá-lo para navegação livre são decisões independentes."
          actions={<ButtonLink href="/capacitacao/biblioteca" variant="secondary">Abrir biblioteca do participante</ButtonLink>}
        />

        {query.salvo ? <StatusPanel title="Rascunho salvo" tone="success"><p>O conteúdo e seus dois tipos de acesso foram registrados.</p></StatusPanel> : null}
        {query.publicado ? <StatusPanel title="Conteúdo publicado" tone="success"><p>A versão está imutável e respeita a opção de liberação escolhida.</p></StatusPanel> : null}
        {query.upload === "concluido" ? <StatusPanel title="Arquivo preparado" tone="success"><p>Complete os dados editoriais abaixo e salve o rascunho.</p></StatusPanel> : null}
        {query.upload === "erro" ? <StatusPanel title="Não foi possível enviar o arquivo" tone="warning"><p>Confira formato e tamanho. São aceitos PDF, imagem, TXT e DOCX de até 6 MB.</p></StatusPanel> : null}

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label className="min-w-56">Organização
            <Select name="organization" defaultValue={organization.organization_id}>
              {auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Button type="submit" variant="secondary">Selecionar</Button>
        </form>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo da biblioteca">
          <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Itens cadastrados</span><strong className="mt-1 block text-3xl text-ink">{data.items.length}</strong></Card>
          <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Rascunhos</span><strong className="mt-1 block text-3xl text-ink">{data.items.filter((item) => item.status === "draft").length}</strong></Card>
          <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Navegação livre</span><strong className="mt-1 block text-3xl text-ink">{releasedCount}</strong></Card>
          <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Somente em jornadas</span><strong className="mt-1 block text-3xl text-ink">{journeyOnlyCount}</strong></Card>
        </section>

        <Card className="grid gap-5" aria-labelledby="upload-biblioteca-titulo">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle id="upload-biblioteca-titulo">Enviar um arquivo</CardTitle>
            <p className="text-sm text-muted">O arquivo fica privado. O participante recebe um link temporário somente depois da autorização.</p>
          </CardHeader>
          <form action="/api/library-uploads" method="post" encType="multipart/form-data" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="organization_id" value={organization.organization_id} />
            <input type="hidden" name="edit" value={editing?.library_item_version_id ?? ""} />
            <Label className="min-w-72 flex-1">Arquivo · até 6 MB
              <Input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required />
            </Label>
            <Button type="submit">Enviar arquivo</Button>
          </form>
        </Card>

        <Card className="grid gap-6" aria-labelledby="editor-biblioteca">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle id="editor-biblioteca">{editing ? `Editar ${editing.title}` : "Novo conteúdo"}</CardTitle>
            <p className="text-sm text-muted">Escolha o modo de entrega. Campos que não pertencem ao tipo escolhido são ignorados ao salvar.</p>
          </CardHeader>
          <form action={saveLibraryContentAction} className="grid gap-5">
            <input type="hidden" name="organization_id" value={organization.organization_id} />
            <input type="hidden" name="library_item_id" value={editing?.library_item_id ?? ""} />
            <input type="hidden" name="existing_slug" value={editing?.slug ?? ""} />
            <input type="hidden" name="file_object_id" value={currentFileObjectId} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Label>Título<Input name="title" required minLength={3} maxLength={200} defaultValue={editing?.title ?? ""} /></Label>
              <Label>Tipo de entrega
                <Select name="content_kind" defaultValue={editing?.content_kind ?? (currentFileObjectId ? "file" : "article")}>
                  <option value="article">Artigo escrito na plataforma</option>
                  <option value="external_link">Link para outro site</option>
                  <option value="file">Arquivo para baixar</option>
                </Select>
              </Label>
            </div>
            <Label>Resumo<Textarea name="summary" required minLength={10} maxLength={600} rows={3} defaultValue={editing?.summary ?? ""} /></Label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Label>Formato
                <Select name="content_format" defaultValue={editing?.content_format ?? "article"}>
                  <option value="article">Artigo</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="guide">Guia</option><option value="tool">Ferramenta</option><option value="course">Curso</option><option value="other">Outro</option>
                </Select>
              </Label>
              <Label>Nível
                <Select name="level" defaultValue={editing?.level ?? "introductory"}>
                  <option value="introductory">Introdutório</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option><option value="all">Todos os níveis</option>
                </Select>
              </Label>
              <Label>Duração em minutos<Input name="estimated_minutes" type="number" min={1} max={600} required defaultValue={editing?.estimated_minutes ?? 15} /></Label>
              <Label>Quem pode acessar
                <Select name="visibility" defaultValue={editing?.visibility ?? "authenticated"}>
                  <option value="authenticated">Todos os participantes autenticados</option><option value="organization">Somente participantes da organização</option>
                </Select>
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Label>Texto do artigo<Textarea name="body" rows={10} maxLength={30000} defaultValue={editing?.body ?? ""} placeholder="Use quando o tipo for artigo." /></Label>
              <div className="grid content-start gap-4">
                <Label>Endereço do material externo<Input name="external_url" type="url" defaultValue={editing?.external_url ?? ""} placeholder="https://... — use quando o tipo for link" /></Label>
                <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
                  <p className="text-sm font-semibold text-ink">Arquivo selecionado</p>
                  <p className="mt-1 text-sm text-muted">{currentFilename || "Nenhum arquivo enviado. Use o bloco de upload acima antes de salvar como arquivo."}</p>
                  {editing?.file_size_bytes ? <p className="mt-1 text-xs text-muted">{fileSize(editing.file_size_bytes)}</p> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Label>Origem
                <Select name="source_type" defaultValue={editing?.source_type ?? "estimulo"}>
                  <option value="estimulo">Estímulo</option><option value="partner">Parceiro</option><option value="external">Fonte externa</option>
                </Select>
              </Label>
              <Label>Nome da fonte<Input name="source_name" required minLength={2} maxLength={120} defaultValue={editing?.source_name ?? "Estímulo"} /></Label>
              <Label>Idioma<Input name="language_code" required defaultValue={editing?.language_code ?? "pt-BR"} pattern="[a-z]{2}(?:-[A-Z]{2})?" /></Label>
              <Label>Temas separados por vírgula<Input name="topics" defaultValue={editing?.topics.join(", ") ?? ""} placeholder="finanças, planejamento, vendas" /></Label>
            </div>

            <fieldset className="grid gap-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-ink">Onde este conteúdo aparece</legend>
              <label className="flex items-start gap-3 rounded-lg bg-primary-soft p-4 text-sm text-ink">
                <input type="checkbox" name="discoverable_in_library" defaultChecked={editing?.discoverable_in_library ?? true} className="mt-0.5 size-4 accent-primary" />
                <span><strong className="block">Liberado na Biblioteca do participante</strong><span className="text-muted">Quando desligado, o conteúdo não aparece na navegação livre, mas continua disponível dentro das jornadas selecionadas.</span></span>
              </label>
              {data.journey_versions.length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-ink">Usar também nestas jornadas</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.journey_versions.map((journey) => (
                      <label key={journey.journey_version_id} className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm has-checked:border-primary has-checked:bg-primary-soft">
                        <input type="checkbox" name="journey_version_ids" value={journey.journey_version_id} defaultChecked={editing?.journey_version_ids.includes(journey.journey_version_id)} className="size-4 accent-primary" />
                        <span>{journey.title} · versão {journey.version_number}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-muted">Nenhuma jornada está disponível para associação.</p>}
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Salvar rascunho</Button>
              {editing || currentFileObjectId ? <ButtonLink href={`/admin/biblioteca?organization=${organization.organization_id}`} variant="ghost">Cancelar edição</ButtonLink> : null}
            </div>
          </form>
        </Card>

        <section className="grid gap-4" aria-labelledby="filtros-biblioteca-titulo">
          <div><h2 id="filtros-biblioteca-titulo" className="text-xl font-semibold text-ink">Conteúdos cadastrados</h2><p className="text-sm text-muted">Filtre sem alterar o conteúdo.</p></div>
          <form method="get" className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="organization" value={organization.organization_id} />
            <Label className="lg:col-span-2">Buscar<Input name="q" defaultValue={query.q ?? ""} placeholder="Título, resumo ou tema" /></Label>
            <Label>Tema<Select name="tema" defaultValue={query.tema ?? ""}><option value="">Todos</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</Select></Label>
            <Label>Tipo<Select name="tipo" defaultValue={query.tipo ?? ""}><option value="">Todos</option><option value="article">Artigo</option><option value="external_link">Link</option><option value="file">Arquivo</option></Select></Label>
            <Label>Status<Select name="statusItem" defaultValue={query.statusItem ?? ""}><option value="">Todos</option><option value="draft">Rascunho</option><option value="published">Publicado</option></Select></Label>
            <Label>Biblioteca livre<Select name="liberacao" defaultValue={query.liberacao ?? ""}><option value="">Todos</option><option value="liberado">Liberado</option><option value="restrito">Não liberado</option></Select></Label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><Button type="submit" variant="secondary">Aplicar filtros</Button><Link href={`/admin/biblioteca?organization=${organization.organization_id}`} className="inline-flex items-center text-sm font-semibold text-primary hover:underline">Limpar</Link></div>
          </form>
        </section>

        <LibraryTable title="Rascunhos" items={drafts} organizationId={organization.organization_id} empty="Nenhum rascunho neste filtro." editable />
        <LibraryTable title="Publicados" items={published} organizationId={organization.organization_id} empty="Nenhum conteúdo publicado neste filtro." />
      </div>
    </AppShell>
  );
}

function LibraryTable({
  title,
  items,
  organizationId,
  empty,
  editable = false,
}: {
  title: string;
  items: OperatorLibraryItem[];
  organizationId: string;
  empty: string;
  editable?: boolean;
}) {
  return (
    <section className="grid gap-4" aria-label={title}>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {items.length === 0 ? <EmptyState title={empty} tone="info">Ajuste os filtros ou cadastre um novo conteúdo.</EmptyState> : (
        <TableScroll>
          <Table>
            <thead><tr><Th>Conteúdo</Th><Th>Biblioteca livre</Th><Th>Jornadas</Th><Th>Versão</Th><Th className="text-right">Ações</Th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.library_item_version_id}>
                  <Td><div className="grid gap-1"><div className="flex flex-wrap items-center gap-2"><StatusPill tone={editable ? "neutral" : "success"}>{editable ? "Rascunho" : "Publicado"}</StatusPill><strong className="text-ink">{item.title}</strong></div><span className="text-xs text-muted">{kindLabels[item.content_kind] ?? item.content_kind}{item.original_filename ? ` · ${item.original_filename}` : ""}</span></div></Td>
                  <Td><StatusPill tone={item.discoverable_in_library ? "success" : "neutral"}>{item.discoverable_in_library ? "Liberado" : "Não liberado"}</StatusPill></Td>
                  <Td className="text-sm text-muted">{item.journey_version_ids.length ? `${item.journey_version_ids.length} associada(s)` : "Nenhuma"}</Td>
                  <Td>{item.version_number}</Td>
                  <Td><div className="flex flex-wrap justify-end gap-2">
                    {editable ? (
                      <><ButtonLink href={`/admin/biblioteca?organization=${organizationId}&edit=${item.library_item_version_id}`} variant="secondary" size="sm">Editar</ButtonLink><form action={publishLibraryContentAction}><input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="library_item_version_id" value={item.library_item_version_id} /><input type="hidden" name="content_hash" value={item.content_hash} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" size="sm">Publicar versão</Button></form></>
                    ) : <ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} variant="secondary" size="sm">Visualizar</ButtonLink>}
                  </div></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </section>
  );
}
