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

export default async function AdminLibraryPage({
  searchParams
}: {
  searchParams: Promise<{ organization?: string; edit?: string; salvo?: string; publicado?: string }>;
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
  const drafts = data.items.filter((item) => item.status === "draft");
  const published = data.items.filter((item) => item.status === "published");

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Operação"
          title="Biblioteca de conteúdos"
          description="Crie artigos próprios ou referências externas, associe materiais às jornadas e publique versões imutáveis."
          actions={
            <>
              <ButtonLink href="/admin" variant="ghost">← Voltar à operação</ButtonLink>
              <ButtonLink href="/capacitacao/biblioteca" variant="secondary">Abrir catálogo</ButtonLink>
            </>
          }
        />

        {query.salvo ? <StatusPanel title="Rascunho salvo" tone="success"><p>A versão editorial foi registrada com histórico e evento.</p></StatusPanel> : null}
        {query.publicado ? <StatusPanel title="Conteúdo publicado" tone="success"><p>A versão agora está disponível para o público autorizado.</p></StatusPanel> : null}

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label className="min-w-56">
            Organização
            <Select name="organization" defaultValue={organization.organization_id}>
              {auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Button type="submit" variant="secondary">Selecionar</Button>
        </form>

        <Card className="grid gap-6" aria-labelledby="editor-biblioteca">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle id="editor-biblioteca">{editing ? `Editar ${editing.title}` : "Novo conteúdo"}</CardTitle>
            <p className="text-sm text-muted">Artigos ficam no domínio do Estímulo. Links externos precisam usar HTTPS.</p>
          </CardHeader>
          <form action={saveLibraryContentAction} className="grid gap-4">
            <input type="hidden" name="organization_id" value={organization.organization_id} />
            <input type="hidden" name="library_item_id" value={editing?.library_item_id ?? ""} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Label>Slug<Input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={editing?.slug ?? ""} placeholder="fluxo-de-caixa-pratico" /></Label>
              <Label>Título<Input name="title" required minLength={3} maxLength={200} defaultValue={editing?.title ?? ""} /></Label>
            </div>
            <Label>Resumo<Textarea name="summary" required minLength={10} maxLength={600} rows={3} defaultValue={editing?.summary ?? ""} /></Label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Label>Tipo
                <Select name="content_kind" defaultValue={editing?.content_kind ?? "article"}>
                  <option value="article">Artigo próprio</option>
                  <option value="external_link">Link externo</option>
                </Select>
              </Label>
              <Label>Formato
                <Select name="content_format" defaultValue={editing?.content_format ?? "article"}>
                  <option value="article">Artigo</option>
                  <option value="video">Vídeo</option>
                  <option value="podcast">Podcast</option>
                  <option value="guide">Guia</option>
                  <option value="tool">Ferramenta</option>
                  <option value="course">Curso</option>
                  <option value="other">Outro</option>
                </Select>
              </Label>
              <Label>Nível
                <Select name="level" defaultValue={editing?.level ?? "introductory"}>
                  <option value="introductory">Introdutório</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                  <option value="all">Todos os níveis</option>
                </Select>
              </Label>
              <Label>Duração em minutos<Input name="estimated_minutes" type="number" min={1} max={600} required defaultValue={editing?.estimated_minutes ?? 15} /></Label>
            </div>
            <Label>Texto do artigo<Textarea name="body" rows={10} maxLength={30000} defaultValue={editing?.body ?? ""} placeholder="Preencha quando o tipo for artigo próprio." /></Label>
            <Label>URL externa<Input name="external_url" type="url" defaultValue={editing?.external_url ?? ""} placeholder="https://... — preencha quando o tipo for link externo" /></Label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Label>Origem
                <Select name="source_type" defaultValue={editing?.source_type ?? "estimulo"}>
                  <option value="estimulo">Estímulo</option>
                  <option value="partner">Parceiro</option>
                  <option value="external">Fonte externa</option>
                </Select>
              </Label>
              <Label>Nome da fonte<Input name="source_name" required minLength={2} maxLength={120} defaultValue={editing?.source_name ?? "Estímulo"} /></Label>
              <Label>Idioma<Input name="language_code" required defaultValue={editing?.language_code ?? "pt-BR"} pattern="[a-z]{2}(?:-[A-Z]{2})?" /></Label>
              <Label>Visibilidade
                <Select name="visibility" defaultValue={editing?.visibility ?? "authenticated"}>
                  <option value="authenticated">Todos os autenticados</option>
                  <option value="organization">Somente organização vinculada</option>
                </Select>
              </Label>
            </div>
            <Label>Temas separados por vírgula<Input name="topics" defaultValue={editing?.topics.join(", ") ?? ""} placeholder="finanças, planejamento, vendas" /></Label>
            {data.journey_versions.length ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium text-ink">Jornadas relacionadas</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.journey_versions.map((journey) => (
                    <label
                      key={journey.journey_version_id}
                      className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm has-checked:border-primary has-checked:bg-primary-soft"
                    >
                      <input
                        type="checkbox"
                        name="journey_version_ids"
                        value={journey.journey_version_id}
                        defaultChecked={editing?.journey_version_ids.includes(journey.journey_version_id)}
                        className="size-4 accent-primary"
                      />
                      <span>{journey.title} · versão {journey.version_number}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : <p className="text-sm text-muted">Nenhuma jornada versionada está disponível para associação.</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="w-fit">Salvar rascunho</Button>
              {editing ? <ButtonLink href={`/admin/biblioteca?organization=${organization.organization_id}`} variant="ghost">Cancelar edição</ButtonLink> : null}
            </div>
          </form>
        </Card>

        <section className="grid gap-4" aria-labelledby="rascunhos-biblioteca">
          <h2 id="rascunhos-biblioteca" className="text-xl font-semibold text-ink">Rascunhos</h2>
          {drafts.length === 0 ? (
            <EmptyState title="Nenhum rascunho" tone="info">Use o editor para criar a primeira versão.</EmptyState>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>Título</Th>
                    <Th>Resumo</Th>
                    <Th>Versão</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((item) => (
                    <tr key={item.library_item_version_id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <StatusPill tone="neutral">Rascunho</StatusPill>
                          <span className="font-semibold text-ink">{item.title}</span>
                        </div>
                      </Td>
                      <Td className="max-w-sm text-sm text-muted">{item.summary}</Td>
                      <Td>{item.version_number}</Td>
                      <Td>
                        <div className="flex flex-wrap justify-end gap-2">
                          <ButtonLink href={`/admin/biblioteca?organization=${organization.organization_id}&edit=${item.library_item_version_id}`} variant="secondary" size="sm">Editar</ButtonLink>
                          <form action={publishLibraryContentAction}>
                            <input type="hidden" name="organization_id" value={organization.organization_id} />
                            <input type="hidden" name="library_item_version_id" value={item.library_item_version_id} />
                            <input type="hidden" name="content_hash" value={item.content_hash} />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            <Button type="submit" size="sm">Publicar versão</Button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </section>

        <section className="grid gap-4" aria-labelledby="publicados-biblioteca">
          <h2 id="publicados-biblioteca" className="text-xl font-semibold text-ink">Publicados</h2>
          {published.length === 0 ? (
            <EmptyState title="Nenhum conteúdo publicado" tone="info">Os conteúdos aparecerão aqui após a publicação.</EmptyState>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>Título</Th>
                    <Th>Resumo</Th>
                    <Th>Versão</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {published.map((item) => (
                    <tr key={item.library_item_version_id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <StatusPill tone="success">Publicado</StatusPill>
                          <span className="font-semibold text-ink">{item.title}</span>
                        </div>
                      </Td>
                      <Td className="max-w-sm text-sm text-muted">{item.summary}</Td>
                      <Td>{item.version_number}</Td>
                      <Td className="text-right">
                        <ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} variant="secondary" size="sm">Visualizar</ButtonLink>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </section>
      </div>
    </AppShell>
  );
}
