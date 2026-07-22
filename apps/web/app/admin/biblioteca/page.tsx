import Link from "next/link";
import { randomUUID } from "node:crypto";
import { publishLibraryContentAction, saveLibraryContentAction } from "@/app/actions/library";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
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
  if (auth.status !== "authenticated") return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre e vincule uma identidade interna.</p></StatusPanel></main>;
  const organization = auth.identity.organizations.find((item) => item.organization_id === query.organization) ?? auth.identity.organizations[0];
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;
  if (!organization.permissions.includes("library.manage")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Biblioteca somente para consulta" tone="warning"><p>Este vínculo não possui permissão editorial.</p></StatusPanel></AppShell>;

  const data = await libraryRuntime.listOperator(auth.identity.user_account_id, organization.organization_id);
  const editing = editableItem(data.items, query.edit);
  const drafts = data.items.filter((item) => item.status === "draft");
  const published = data.items.filter((item) => item.status === "published");

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading"><p className="eyebrow">Operação</p><h1>Biblioteca de conteúdos</h1><p>Crie artigos próprios ou referências externas, associe materiais às jornadas e publique versões imutáveis.</p></header>
    <div className="inline-actions"><Link className="button button--ghost" href="/admin">← Voltar à operação</Link><Link className="button button--secondary" href="/capacitacao/biblioteca">Abrir catálogo</Link></div>
    {query.salvo ? <StatusPanel title="Rascunho salvo" tone="success"><p>A versão editorial foi registrada com histórico e evento.</p></StatusPanel> : null}
    {query.publicado ? <StatusPanel title="Conteúdo publicado" tone="success"><p>A versão agora está disponível para o público autorizado.</p></StatusPanel> : null}

    <form className="inline-form" method="get"><label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}</select></label><button className="button button--secondary" type="submit">Selecionar</button></form>

    <section className="card stack stack--large" aria-labelledby="editor-biblioteca">
      <div><h2 id="editor-biblioteca">{editing ? `Editar ${editing.title}` : "Novo conteúdo"}</h2><p className="support-note">Artigos ficam no domínio do Estímulo. Links externos precisam usar HTTPS.</p></div>
      <form action={saveLibraryContentAction} className="stack">
        <input type="hidden" name="organization_id" value={organization.organization_id} />
        <input type="hidden" name="library_item_id" value={editing?.library_item_id ?? ""} />
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        <div className="admin-columns">
          <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={editing?.slug ?? ""} placeholder="fluxo-de-caixa-pratico" /></label>
          <label>Título<input name="title" required minLength={3} maxLength={200} defaultValue={editing?.title ?? ""} /></label>
        </div>
        <label>Resumo<textarea name="summary" required minLength={10} maxLength={600} rows={3} defaultValue={editing?.summary ?? ""} /></label>
        <div className="admin-columns">
          <label>Tipo<select name="content_kind" defaultValue={editing?.content_kind ?? "article"}><option value="article">Artigo próprio</option><option value="external_link">Link externo</option></select></label>
          <label>Formato<select name="content_format" defaultValue={editing?.content_format ?? "article"}><option value="article">Artigo</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="guide">Guia</option><option value="tool">Ferramenta</option><option value="course">Curso</option><option value="other">Outro</option></select></label>
          <label>Nível<select name="level" defaultValue={editing?.level ?? "introductory"}><option value="introductory">Introdutório</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option><option value="all">Todos os níveis</option></select></label>
          <label>Duração em minutos<input name="estimated_minutes" type="number" min={1} max={600} required defaultValue={editing?.estimated_minutes ?? 15} /></label>
        </div>
        <label>Texto do artigo<textarea name="body" rows={10} maxLength={30000} defaultValue={editing?.body ?? ""} placeholder="Preencha quando o tipo for artigo próprio." /></label>
        <label>URL externa<input name="external_url" type="url" defaultValue={editing?.external_url ?? ""} placeholder="https://... — preencha quando o tipo for link externo" /></label>
        <div className="admin-columns">
          <label>Origem<select name="source_type" defaultValue={editing?.source_type ?? "estimulo"}><option value="estimulo">Estímulo</option><option value="partner">Parceiro</option><option value="external">Fonte externa</option></select></label>
          <label>Nome da fonte<input name="source_name" required minLength={2} maxLength={120} defaultValue={editing?.source_name ?? "Estímulo"} /></label>
          <label>Idioma<input name="language_code" required defaultValue={editing?.language_code ?? "pt-BR"} pattern="[a-z]{2}(?:-[A-Z]{2})?" /></label>
          <label>Visibilidade<select name="visibility" defaultValue={editing?.visibility ?? "authenticated"}><option value="authenticated">Todos os autenticados</option><option value="organization">Somente organização vinculada</option></select></label>
        </div>
        <label>Temas separados por vírgula<input name="topics" defaultValue={editing?.topics.join(", ") ?? ""} placeholder="finanças, planejamento, vendas" /></label>
        {data.journey_versions.length ? <fieldset><legend>Jornadas relacionadas</legend><div className="option-grid">{data.journey_versions.map((journey) => <label className="option" key={journey.journey_version_id}><input type="checkbox" name="journey_version_ids" value={journey.journey_version_id} defaultChecked={editing?.journey_version_ids.includes(journey.journey_version_id)} /><span>{journey.title} · versão {journey.version_number}</span></label>)}</div></fieldset> : <p className="support-note">Nenhuma jornada versionada está disponível para associação.</p>}
        <div className="inline-actions"><button className="button button--primary" type="submit">Salvar rascunho</button>{editing ? <Link className="button button--ghost" href={`/admin/biblioteca?organization=${organization.organization_id}`}>Cancelar edição</Link> : null}</div>
      </form>
    </section>

    <section className="stack stack--large" aria-labelledby="rascunhos-biblioteca"><h2 id="rascunhos-biblioteca">Rascunhos</h2>
      {drafts.length === 0 ? <StatusPanel title="Nenhum rascunho" tone="info"><p>Use o editor para criar a primeira versão.</p></StatusPanel> : <div className="card-grid">{drafts.map((item) => <article className="card" key={item.library_item_version_id}><div className="card-meta"><span className="status-pill">Rascunho</span><span>Versão {item.version_number}</span></div><h3>{item.title}</h3><p>{item.summary}</p><div className="inline-actions"><Link className="button button--secondary" href={`/admin/biblioteca?organization=${organization.organization_id}&edit=${item.library_item_version_id}`}>Editar</Link><form action={publishLibraryContentAction}><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="library_item_version_id" value={item.library_item_version_id} /><input type="hidden" name="content_hash" value={item.content_hash} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><button className="button button--primary" type="submit">Publicar versão</button></form></div></article>)}</div>}
    </section>

    <section className="stack stack--large" aria-labelledby="publicados-biblioteca"><h2 id="publicados-biblioteca">Publicados</h2>
      {published.length === 0 ? <StatusPanel title="Nenhum conteúdo publicado" tone="info"><p>Os conteúdos aparecerão aqui após a publicação.</p></StatusPanel> : <div className="card-grid">{published.map((item) => <article className="card" key={item.library_item_version_id}><div className="card-meta"><span className="status-pill">Publicado</span><span>Versão {item.version_number}</span></div><h3>{item.title}</h3><p>{item.summary}</p><Link className="button button--secondary" href={`/capacitacao/biblioteca/${item.slug}`}>Visualizar</Link></article>)}</div>}
    </section>
  </AppShell>;
}
