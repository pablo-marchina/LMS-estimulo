import { randomUUID } from "node:crypto";
import { publishLibraryContentAction, saveLibraryContentAction } from "@/app/actions/library";
import { AdminDisclosure, AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
const kindLabels: Record<string, string> = { article: "Texto", external_link: "Link ou vídeo", file: "Arquivo" };

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

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Conteúdo" title="Biblioteca" description="Cadastre um material e reutilize-o em diferentes aulas." actions={<ButtonLink href="/capacitacao/biblioteca" variant="secondary">Ver como participante</ButtonLink>} />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode consultar os conteúdos, mas não alterá-los.</StatusPanel> : null}
    <AdminSectionNav items={[...(canEdit ? [{ href: "/admin/biblioteca?view=novo", label: editing ? "Editar conteúdo" : "Novo conteúdo", active: view === "novo" }] : []), { href: "/admin/biblioteca?view=conteudos", label: "Conteúdos cadastrados", active: view === "conteudos" }]} />
    {query.salvo ? <StatusPanel title="Rascunho salvo" tone="success">Revise o conteúdo e publique quando estiver pronto.</StatusPanel> : null}
    {query.publicado ? <StatusPanel title="Conteúdo publicado" tone="success">O material já pode ser reutilizado.</StatusPanel> : null}

    {view === "novo" && canEdit ? <div className="grid gap-5">
      <Card className="grid gap-5"><div><h2 className="text-lg font-black text-secondary">{editing ? `Editar ${editing.title}` : "Informações principais"}</h2><p className="mt-1 text-sm text-muted">Título, tipo e resumo são suficientes para criar o rascunho. Abra as opções somente quando precisar.</p></div>
        <form action={saveLibraryContentAction} className="grid gap-4"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="library_item_id" value={editing?.library_item_id ?? ""} /><input type="hidden" name="existing_slug" value={editing?.slug ?? ""} /><input type="hidden" name="file_object_id" value={currentFileObjectId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><input type="hidden" name="source_type" value="estimulo" /><input type="hidden" name="source_name" value="Estímulo" /><input type="hidden" name="language_code" value="pt-BR" /><input type="hidden" name="visibility" value="authenticated" />
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]"><Label>Título<Input name="title" required minLength={3} maxLength={200} defaultValue={editing?.title ?? ""} /><span className="text-[11px] font-normal text-muted">Nome mostrado para administradores e participantes.</span></Label><Label>Tipo<Select name="content_kind" defaultValue={editing?.content_kind ?? (currentFileObjectId ? "file" : "article")}><option value="article">Texto</option><option value="external_link">Link ou vídeo</option><option value="file">Arquivo</option></Select><span className="text-[11px] font-normal text-muted">Define como o conteúdo será aberto.</span></Label></div>
          <Label>Resumo<Textarea name="summary" required minLength={10} maxLength={600} rows={3} defaultValue={editing?.summary ?? ""} /><span className="text-[11px] font-normal text-muted">Explique em uma ou duas frases o que a pessoa encontrará.</span></Label>
          <AdminDisclosure title="Conteúdo ou destino" description="Preencha apenas o campo correspondente ao tipo escolhido.">
            <div className="grid gap-4"><Label>Texto completo<Textarea name="body" rows={8} maxLength={30000} defaultValue={editing?.body ?? ""} placeholder="Use quando o tipo for Texto." /></Label><Label>Endereço HTTPS<Input name="external_url" type="url" defaultValue={editing?.external_url ?? ""} placeholder="Use para link, vídeo ou ferramenta." /></Label>{currentFilename ? <p className="rounded-xl bg-success-soft p-3 text-sm text-success"><strong>Arquivo preparado:</strong> {currentFilename}</p> : <p className="text-sm text-muted">Nenhum arquivo foi preparado.</p>}</div>
          </AdminDisclosure>
          <AdminDisclosure title="Organização e visibilidade" description="Campos opcionais usados para busca, recomendação e tempo estimado.">
            <div className="grid gap-4 sm:grid-cols-2"><Label>Formato<Select name="content_format" defaultValue={editing?.content_format ?? (currentFileObjectId ? "other" : "article")}><option value="article">Artigo</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="audio">Áudio</option><option value="image">Imagem</option><option value="pdf">PDF</option><option value="guide">Guia</option><option value="tool">Ferramenta</option><option value="course">Curso</option><option value="other">Outro</option></Select></Label><Label>Nível<Select name="level" defaultValue={editing?.level ?? "all"}><option value="all">Todos</option><option value="introductory">Introdutório</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option></Select></Label><Label>Duração em minutos<Input name="estimated_minutes" type="number" min={1} max={600} required defaultValue={editing?.estimated_minutes ?? 10} /></Label><Label>Temas<Input name="topics" defaultValue={editing?.topics.join(", ") ?? ""} placeholder="gestão, vendas" /></Label></div><label className="mt-4 flex items-start gap-3 rounded-lg bg-primary-soft p-3 text-sm text-ink"><input type="checkbox" name="discoverable_in_library" defaultChecked={editing?.discoverable_in_library ?? true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Mostrar na biblioteca do participante</strong><small className="text-muted">Desmarque para disponibilizar o material apenas dentro de aulas.</small></span></label>
          </AdminDisclosure>
          <Button type="submit" className="w-fit">Salvar rascunho</Button>
        </form>
      </Card>
      <AdminDisclosure title="Preparar um arquivo" description="Abra somente quando o conteúdo for PDF, imagem, TXT ou DOCX.">
        <form action="/api/library-uploads" method="post" encType="multipart/form-data" className="grid gap-4"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="edit" value={editing?.library_item_version_id ?? ""} /><FileUploadPreview name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required label="Selecionar arquivo" help="Até 6 MB." /><Button type="submit" variant="secondary" className="w-fit">Preparar arquivo</Button></form>
      </AdminDisclosure>
    </div> : <><Card><form method="get" className="grid gap-3 sm:grid-cols-4"><input type="hidden" name="view" value="conteudos" /><Label className="sm:col-span-2">Buscar<Input name="q" defaultValue={query.q ?? ""} placeholder="Título, resumo ou tema" /></Label><Label>Tema<Select name="tema" defaultValue={query.tema ?? ""}><option value="">Todos</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</Select></Label><Label>Tipo<Select name="tipo" defaultValue={query.tipo ?? ""}><option value="">Todos</option><option value="article">Texto</option><option value="external_link">Link</option><option value="file">Arquivo</option></Select></Label><Button type="submit" variant="secondary" className="w-fit">Filtrar</Button></form></Card><LibraryTable title="Rascunhos" items={filteredItems.filter((item) => item.status === "draft")} organizationId={organization.organization_id} empty="Nenhum rascunho." editable={canEdit} /><LibraryTable title="Publicados" items={filteredItems.filter((item) => item.status === "published")} organizationId={organization.organization_id} empty="Nenhum conteúdo publicado." /></>}
  </div></AppShell>;
}

function LibraryTable({ title, items, organizationId, empty, editable = false }: { title: string; items: OperatorLibraryItem[]; organizationId: string; empty: string; editable?: boolean }) {
  return <section className="grid gap-4"><h2 className="text-lg font-semibold text-ink">{title}</h2>{items.length === 0 ? <EmptyState title={empty} tone="info">Nenhum item neste estado.</EmptyState> : <TableScroll><Table><thead><tr><Th>Conteúdo</Th><Th>Onde aparece</Th><Th>Uso em jornadas</Th><Th className="text-right">Ação</Th></tr></thead><tbody>{items.map((item) => <tr key={item.library_item_version_id}><Td><StatusPill tone={item.status === "published" ? "success" : "neutral"}>{item.status === "published" ? "Publicado" : "Rascunho"}</StatusPill><strong className="ml-2 text-ink">{item.title}</strong><p className="mt-1 text-xs text-muted">{kindLabels[item.content_kind] ?? item.content_kind}</p></Td><Td>{item.discoverable_in_library ? "Biblioteca e aulas" : "Somente aulas"}</Td><Td>{item.journey_version_ids.length || "Nenhuma"}</Td><Td><div className="flex justify-end gap-2">{editable ? <><ButtonLink href={`/admin/biblioteca?view=novo&edit=${item.library_item_version_id}`} variant="secondary" size="sm">Editar</ButtonLink><form action={publishLibraryContentAction}><input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="library_item_version_id" value={item.library_item_version_id} /><input type="hidden" name="content_hash" value={item.content_hash} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" size="sm">Publicar</Button></form></> : item.status === "published" ? <ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} variant="secondary" size="sm">Visualizar</ButtonLink> : <span className="text-sm text-muted">Consulta</span>}</div></Td></tr>)}</tbody></Table></TableScroll>}</section>;
}
