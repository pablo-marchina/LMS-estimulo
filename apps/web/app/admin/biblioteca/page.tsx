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
function editableItem(items: OperatorLibraryItem[], id: string | undefined) { if (!id) return null; return items.find((item) => item.library_item_version_id === id && item.status === "draft") ?? null; }
const kindLabels: Record<string, string> = { article: "Artigo próprio", external_link: "Link externo", file: "Arquivo" };

export default async function AdminLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const canEdit = organization.permissions.includes("library.manage");
  const data = await libraryRuntime.listOperator(auth.identity.user_account_id, organization.organization_id);
  const editing = editableItem(data.items, query.edit);
  const view = query.view === "conteudos" || !canEdit ? "conteudos" : "novo";
  const currentFileObjectId = query.arquivo ?? editing?.file_object_id ?? "";
  const currentFilename = query.nomeArquivo ?? editing?.original_filename ?? "";
  const topics = [...new Set(data.items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const normalizedQuery = (query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const filteredItems = data.items.filter((item) => {
    if (normalizedQuery && ![item.title, item.summary, ...item.topics].join(" ").toLocaleLowerCase("pt-BR").includes(normalizedQuery)) return false;
    if (query.tema && !item.topics.includes(query.tema)) return false;
    if (query.tipo && item.content_kind !== query.tipo) return false;
    return true;
  });

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Conteúdo reutilizável" title="Biblioteca" description="Cadastre uma vez e use o mesmo conteúdo em várias aulas e jornadas." actions={<ButtonLink href="/capacitacao/biblioteca" variant="secondary">Ver como participante</ButtonLink>} />
    {!canEdit ? <StatusPanel title="Acesso somente para visualização" tone="info">Você pode consultar os conteúdos, mas não alterá-los.</StatusPanel> : null}
    <nav className="flex gap-2 rounded-xl border border-border bg-white p-2" aria-label="Etapas da biblioteca">{canEdit ? <ButtonLink href="/admin/biblioteca?view=novo" variant={view === "novo" ? "primary" : "ghost"} size="sm">Novo conteúdo</ButtonLink> : null}<ButtonLink href="/admin/biblioteca?view=conteudos" variant={view === "conteudos" ? "primary" : "ghost"} size="sm">Conteúdos</ButtonLink></nav>
    {query.salvo ? <StatusPanel title="Rascunho salvo" tone="success">O conteúdo foi registrado.</StatusPanel> : null}
    {query.publicado ? <StatusPanel title="Conteúdo publicado" tone="success">A versão já pode ser reutilizada.</StatusPanel> : null}

    {view === "novo" && canEdit ? <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
      <Card className="grid content-start gap-4"><CardHeader className="flex-col items-start gap-1"><CardTitle>Arquivo</CardTitle><p className="text-[11px] text-muted">Use apenas para PDF, imagem, TXT ou DOCX. Vídeos podem ser cadastrados por link.</p></CardHeader><form action="/api/library-uploads" method="post" encType="multipart/form-data" className="grid gap-4"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="edit" value={editing?.library_item_version_id ?? ""} /><FileUploadPreview name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required label="Selecionar arquivo" help="Até 6 MB." /><Button type="submit" className="w-fit">Preparar arquivo</Button></form>{currentFilename ? <p className="rounded-xl bg-success-soft p-3 text-sm text-success"><strong>Pronto:</strong> {currentFilename}</p> : null}</Card>
      <Card className="grid gap-5"><CardHeader className="flex-col items-start gap-1"><CardTitle>{editing ? `Editar ${editing.title}` : "Descrever conteúdo"}</CardTitle><p className="text-[11px] text-muted">Preencha somente o que corresponde ao tipo escolhido.</p></CardHeader><form action={saveLibraryContentAction} className="grid gap-4"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="library_item_id" value={editing?.library_item_id ?? ""} /><input type="hidden" name="existing_slug" value={editing?.slug ?? ""} /><input type="hidden" name="file_object_id" value={currentFileObjectId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><input type="hidden" name="source_type" value="estimulo" /><input type="hidden" name="source_name" value="Estímulo" /><input type="hidden" name="language_code" value="pt-BR" /><input type="hidden" name="visibility" value="authenticated" />
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]"><Label>Título<Input name="title" required minLength={3} maxLength={200} defaultValue={editing?.title ?? ""} /><span className="text-[11px] font-normal text-muted">Nome visível.</span></Label><Label>Tipo<Select name="content_kind" defaultValue={editing?.content_kind ?? (currentFileObjectId ? "file" : "article")}><option value="article">Texto</option><option value="external_link">Link ou vídeo</option><option value="file">Arquivo</option></Select></Label></div>
        <Label>Resumo<Textarea name="summary" required minLength={10} maxLength={600} rows={2} defaultValue={editing?.summary ?? ""} /><span className="text-[11px] font-normal text-muted">Uma ou duas frases.</span></Label>
        <Label>Texto<Textarea name="body" rows={7} maxLength={30000} defaultValue={editing?.body ?? ""} placeholder="Somente para conteúdo em texto." /></Label>
        <Label>Endereço HTTPS<Input name="external_url" type="url" defaultValue={editing?.external_url ?? ""} placeholder="Somente para link, vídeo ou ferramenta." /></Label>
        <details className="rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">Detalhes opcionais</summary><div className="grid gap-4 border-t border-border p-3 sm:grid-cols-2"><Label>Formato<Select name="content_format" defaultValue={editing?.content_format ?? (currentFileObjectId ? "other" : "article")}><option value="article">Artigo</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="audio">Áudio</option><option value="image">Imagem</option><option value="pdf">PDF</option><option value="guide">Guia</option><option value="tool">Ferramenta</option><option value="course">Curso</option><option value="other">Outro</option></Select></Label><Label>Nível<Select name="level" defaultValue={editing?.level ?? "all"}><option value="all">Todos</option><option value="introductory">Introdutório</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option></Select></Label><Label>Duração<Input name="estimated_minutes" type="number" min={1} max={600} required defaultValue={editing?.estimated_minutes ?? 10} /></Label><Label>Temas<Input name="topics" defaultValue={editing?.topics.join(", ") ?? ""} placeholder="gestão, vendas" /></Label></div></details>
        <label className="flex items-start gap-3 rounded-lg bg-primary-soft p-3 text-sm text-ink"><input type="checkbox" name="discoverable_in_library" defaultChecked={editing?.discoverable_in_library ?? true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Mostrar aos participantes</strong><small className="text-muted">Desmarque para usar apenas em aulas.</small></span></label><Button type="submit" className="w-fit">Salvar rascunho</Button>
      </form></Card>
    </div> : <><Card><form method="get" className="grid gap-3 sm:grid-cols-4"><input type="hidden" name="view" value="conteudos" /><Label className="sm:col-span-2">Buscar<Input name="q" defaultValue={query.q ?? ""} /></Label><Label>Tema<Select name="tema" defaultValue={query.tema ?? ""}><option value="">Todos</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</Select></Label><Label>Tipo<Select name="tipo" defaultValue={query.tipo ?? ""}><option value="">Todos</option><option value="article">Texto</option><option value="external_link">Link</option><option value="file">Arquivo</option></Select></Label><Button type="submit" variant="secondary" className="w-fit">Filtrar</Button></form></Card><LibraryTable title="Rascunhos" items={filteredItems.filter((item) => item.status === "draft")} organizationId={organization.organization_id} empty="Nenhum rascunho." editable={canEdit} /><LibraryTable title="Publicados" items={filteredItems.filter((item) => item.status === "published")} organizationId={organization.organization_id} empty="Nenhum conteúdo publicado." /></>}
  </div></AppShell>;
}

function LibraryTable({ title, items, organizationId, empty, editable = false }: { title: string; items: OperatorLibraryItem[]; organizationId: string; empty: string; editable?: boolean }) {
  return <section className="grid gap-4"><h2 className="text-xl font-semibold text-ink">{title}</h2>{items.length === 0 ? <EmptyState title={empty} tone="info">Nenhum item neste estado.</EmptyState> : <TableScroll><Table><thead><tr><Th>Conteúdo</Th><Th>Visibilidade</Th><Th>Jornadas</Th><Th className="text-right">Ações</Th></tr></thead><tbody>{items.map((item) => <tr key={item.library_item_version_id}><Td><StatusPill tone={item.status === "published" ? "success" : "neutral"}>{item.status === "published" ? "Publicado" : "Rascunho"}</StatusPill><strong className="ml-2 text-ink">{item.title}</strong><p className="mt-1 text-xs text-muted">{kindLabels[item.content_kind] ?? item.content_kind}</p></Td><Td>{item.discoverable_in_library ? "Biblioteca" : "Somente aulas"}</Td><Td>{item.journey_version_ids.length || "Nenhuma"}</Td><Td><div className="flex justify-end gap-2">{editable ? <><ButtonLink href={`/admin/biblioteca?view=novo&edit=${item.library_item_version_id}`} variant="secondary" size="sm">Editar</ButtonLink><form action={publishLibraryContentAction}><input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="library_item_version_id" value={item.library_item_version_id} /><input type="hidden" name="content_hash" value={item.content_hash} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" size="sm">Publicar</Button></form></> : item.status === "published" ? <ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} variant="secondary" size="sm">Visualizar</ButtonLink> : <span className="text-sm text-muted">Consulta</span>}</div></Td></tr>)}</tbody></Table></TableScroll>}</section>;
}
