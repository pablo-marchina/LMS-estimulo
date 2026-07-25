import Link from "next/link";
import { randomUUID } from "node:crypto";
import { publishLibraryContentAction, saveLibraryContentAction } from "@/app/actions/library";
import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { TableScroll, Table, Th, Td } from "@/components/ui/table";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import type { OperatorLibraryItem } from "@/lib/library/contracts";
import { libraryRuntime } from "@/lib/library/runtime";

export const dynamic = "force-dynamic";

function editableItem(items: OperatorLibraryItem[], id: string | undefined) {
  if (!id) return null;
  return items.find((item) => item.library_item_version_id === id && item.status === "draft") ?? null;
}

const kindLabels: Record<string, string> = { article: "Artigo próprio", external_link: "Link externo", file: "Arquivo" };

export default async function AdminLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("library.manage")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Biblioteca restrita" tone="warning">Seu acesso não permite editar conteúdos.</StatusPanel></AppShell>;

  const data = await libraryRuntime.listOperator(auth.identity.user_account_id, organization.organization_id);
  const editing = editableItem(data.items, query.edit);
  const view = query.view === "conteudos" ? "conteudos" : "novo";
  const currentFileObjectId = query.arquivo ?? editing?.file_object_id ?? "";
  const currentFilename = query.nomeArquivo ?? editing?.original_filename ?? "";
  const topics = [...new Set(data.items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const normalizedQuery = (query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const filteredItems = data.items.filter((item) => {
    if (normalizedQuery && ![item.title, item.summary, ...item.topics].join(" ").toLocaleLowerCase("pt-BR").includes(normalizedQuery)) return false;
    if (query.tema && !item.topics.includes(query.tema)) return false;
    if (query.tipo && item.content_kind !== query.tipo) return false;
    if (query.statusItem && item.status !== query.statusItem) return false;
    return true;
  });

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-7">
        <PageHeader eyebrow="Conteúdo" title="Biblioteca" description="Crie um material por vez e depois acompanhe o que está em rascunho ou publicado." actions={<ButtonLink href="/capacitacao/biblioteca" variant="secondary">Ver como participante</ButtonLink>} />

        <nav className="flex gap-2 rounded-xl border border-border bg-white p-2" aria-label="Etapas da biblioteca">
          <ButtonLink href="/admin/biblioteca?view=novo" variant={view === "novo" ? "primary" : "ghost"} size="sm">1. Criar conteúdo</ButtonLink>
          <ButtonLink href="/admin/biblioteca?view=conteudos" variant={view === "conteudos" ? "primary" : "ghost"} size="sm">2. Gerenciar conteúdos</ButtonLink>
        </nav>

        {query.salvo ? <StatusPanel title="Rascunho salvo" tone="success">O conteúdo foi registrado.</StatusPanel> : null}
        {query.publicado ? <StatusPanel title="Conteúdo publicado" tone="success">A versão já está disponível conforme os acessos definidos.</StatusPanel> : null}
        {query.upload === "concluido" ? <StatusPanel title="Arquivo preparado" tone="success">Complete os dados editoriais e salve o rascunho.</StatusPanel> : null}
        {query.upload === "erro" ? <StatusPanel title="Não foi possível enviar" tone="warning">Confira formato e tamanho do arquivo.</StatusPanel> : null}

        {view === "novo" ? (
          <>
            <Card className="grid gap-5">
              <CardHeader className="flex-col items-start gap-1"><CardTitle>1. Preparar arquivo, quando necessário</CardTitle><p className="text-sm text-muted">Pule esta etapa para artigos e links externos.</p></CardHeader>
              <form action="/api/library-uploads" method="post" encType="multipart/form-data" className="grid gap-4">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="edit" value={editing?.library_item_version_id ?? ""} />
                <FileUploadPreview name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required label="Arquivo" help="PDF, imagem, TXT ou DOCX, até 6 MB." />
                <Button type="submit" className="w-fit">Enviar e preparar</Button>
              </form>
            </Card>

            <Card className="grid gap-6">
              <CardHeader className="flex-col items-start gap-1"><CardTitle>{editing ? `Editar ${editing.title}` : "2. Descrever o conteúdo"}</CardTitle><p className="text-sm text-muted">Somente os campos relacionados ao tipo escolhido serão utilizados.</p></CardHeader>
              <form action={saveLibraryContentAction} className="grid gap-5">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="library_item_id" value={editing?.library_item_id ?? ""} />
                <input type="hidden" name="existing_slug" value={editing?.slug ?? ""} />
                <input type="hidden" name="file_object_id" value={currentFileObjectId} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <div className="grid gap-4 sm:grid-cols-2"><Label>Título<Input name="title" required minLength={3} maxLength={200} defaultValue={editing?.title ?? ""} /></Label><Label>Tipo de entrega<Select name="content_kind" defaultValue={editing?.content_kind ?? (currentFileObjectId ? "file" : "article")}><option value="article">Artigo na plataforma</option><option value="external_link">Link externo</option><option value="file">Arquivo para baixar</option></Select></Label></div>
                <Label>Resumo<Textarea name="summary" required minLength={10} maxLength={600} rows={3} defaultValue={editing?.summary ?? ""} /></Label>
                <div className="grid gap-4 sm:grid-cols-3"><Label>Formato<Select name="content_format" defaultValue={editing?.content_format ?? "article"}><option value="article">Artigo</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="guide">Guia</option><option value="tool">Ferramenta</option><option value="course">Curso</option><option value="other">Outro</option></Select></Label><Label>Nível<Select name="level" defaultValue={editing?.level ?? "introductory"}><option value="introductory">Introdutório</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option><option value="all">Todos</option></Select></Label><Label>Duração em minutos<Input name="estimated_minutes" type="number" min={1} max={600} required defaultValue={editing?.estimated_minutes ?? 15} /></Label></div>
                <Label>Texto do artigo<Textarea name="body" rows={9} maxLength={30000} defaultValue={editing?.body ?? ""} placeholder="Preencha somente para artigos." /></Label>
                <Label>Endereço externo<Input name="external_url" type="url" defaultValue={editing?.external_url ?? ""} placeholder="https://..." /></Label>
                <div className="rounded-xl border border-border bg-surface-muted p-4"><p className="text-sm font-semibold text-ink">Arquivo vinculado</p><p className="mt-1 text-sm text-muted">{currentFilename || "Nenhum arquivo preparado."}</p></div>
                <div className="grid gap-4 sm:grid-cols-2"><Label>Nome da fonte<Input name="source_name" required minLength={2} maxLength={120} defaultValue={editing?.source_name ?? "Estímulo"} /></Label><Label>Temas separados por vírgula<Input name="topics" defaultValue={editing?.topics.join(", ") ?? ""} placeholder="finanças, vendas, planejamento" /></Label></div>
                <input type="hidden" name="source_type" value="estimulo" /><input type="hidden" name="language_code" value="pt-BR" /><input type="hidden" name="visibility" value="authenticated" />
                <fieldset className="grid gap-4 rounded-xl border border-border p-4"><legend className="px-1 text-sm font-semibold text-ink">3. Definir onde aparece</legend><label className="flex items-start gap-3 rounded-lg bg-primary-soft p-4 text-sm text-ink"><input type="checkbox" name="discoverable_in_library" defaultChecked={editing?.discoverable_in_library ?? true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Exibir na Biblioteca</strong><span className="text-muted">Desmarque para usar o material somente dentro de jornadas.</span></span></label>{data.journey_versions.length ? <div className="grid gap-2"><p className="text-sm font-medium text-ink">Associar também a jornadas</p><div className="grid gap-2 sm:grid-cols-2">{data.journey_versions.map((journey) => <label key={journey.journey_version_id} className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm has-checked:border-primary has-checked:bg-primary-soft"><input type="checkbox" name="journey_version_ids" value={journey.journey_version_id} defaultChecked={editing?.journey_version_ids.includes(journey.journey_version_id)} className="size-4 accent-primary" /><span>{journey.title}</span></label>)}</div></div> : <p className="text-sm text-muted">Nenhuma jornada publicada está disponível.</p>}</fieldset>
                <div className="flex gap-3"><Button type="submit">Salvar rascunho</Button>{editing ? <ButtonLink href="/admin/biblioteca?view=novo" variant="ghost">Cancelar</ButtonLink> : null}</div>
              </form>
            </Card>
          </>
        ) : (
          <>
            <Card><form method="get" className="grid gap-3 sm:grid-cols-4"><input type="hidden" name="view" value="conteudos" /><Label className="sm:col-span-2">Buscar<Input name="q" defaultValue={query.q ?? ""} placeholder="Título, resumo ou tema" /></Label><Label>Tema<Select name="tema" defaultValue={query.tema ?? ""}><option value="">Todos</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</Select></Label><Label>Tipo<Select name="tipo" defaultValue={query.tipo ?? ""}><option value="">Todos</option><option value="article">Artigo</option><option value="external_link">Link</option><option value="file">Arquivo</option></Select></Label><div className="flex gap-2 sm:col-span-4"><Button type="submit" variant="secondary">Filtrar</Button><ButtonLink href="/admin/biblioteca?view=conteudos" variant="ghost">Limpar</ButtonLink></div></form></Card>
            <LibraryTable title="Rascunhos" items={filteredItems.filter((item) => item.status === "draft")} organizationId={organization.organization_id} empty="Nenhum rascunho." editable />
            <LibraryTable title="Publicados" items={filteredItems.filter((item) => item.status === "published")} organizationId={organization.organization_id} empty="Nenhum conteúdo publicado." />
          </>
        )}
      </div>
    </AppShell>
  );
}

function LibraryTable({ title, items, organizationId, empty, editable = false }: { title: string; items: OperatorLibraryItem[]; organizationId: string; empty: string; editable?: boolean }) {
  return <section className="grid gap-4"><h2 className="text-xl font-semibold text-ink">{title}</h2>{items.length === 0 ? <EmptyState title={empty} tone="info">Crie ou ajuste um conteúdo.</EmptyState> : <TableScroll><Table><thead><tr><Th>Conteúdo</Th><Th>Biblioteca</Th><Th>Jornadas</Th><Th className="text-right">Ações</Th></tr></thead><tbody>{items.map((item) => <tr key={item.library_item_version_id}><Td><StatusPill tone={editable ? "neutral" : "success"}>{editable ? "Rascunho" : "Publicado"}</StatusPill><strong className="ml-2 text-ink">{item.title}</strong><p className="mt-1 text-xs text-muted">{kindLabels[item.content_kind] ?? item.content_kind}</p></Td><Td>{item.discoverable_in_library ? "Liberado" : "Restrito"}</Td><Td>{item.journey_version_ids.length || "Nenhuma"}</Td><Td><div className="flex justify-end gap-2">{editable ? <><ButtonLink href={`/admin/biblioteca?view=novo&edit=${item.library_item_version_id}`} variant="secondary" size="sm">Editar</ButtonLink><form action={publishLibraryContentAction}><input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="library_item_version_id" value={item.library_item_version_id} /><input type="hidden" name="content_hash" value={item.content_hash} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" size="sm">Publicar</Button></form></> : <ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} variant="secondary" size="sm">Visualizar</ButtonLink>}</div></Td></tr>)}</tbody></Table></TableScroll>}</section>;
}