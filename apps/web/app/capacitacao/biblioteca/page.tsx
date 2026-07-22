import Link from "next/link";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";

export const dynamic = "force-dynamic";

const formatLabels: Record<string, string> = {
  article: "Artigo",
  video: "Vídeo",
  podcast: "Podcast",
  guide: "Guia",
  tool: "Ferramenta",
  course: "Curso",
  other: "Outro"
};

const levelLabels: Record<string, string> = {
  introductory: "Introdutório",
  intermediate: "Intermediário",
  advanced: "Avançado",
  all: "Todos os níveis"
};

function pageHref(query: Record<string, string | undefined>, offset: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  params.set("offset", String(Math.max(0, offset)));
  return `/capacitacao/biblioteca?${params.toString()}`;
}

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; topic?: string; format?: string; level?: string; offset?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const offset = Math.max(0, Number.parseInt(query.offset ?? "0", 10) || 0);
  const data = await libraryRuntime.list({
    actorUserAccountId: auth.identity.user_account_id,
    query: query.q,
    topic: query.topic,
    contentFormat: query.format,
    level: query.level,
    limit: 24,
    offset
  });

  return <>
    <header className="page-heading">
      <p className="eyebrow">Capacitação</p>
      <h1>Biblioteca de conteúdos</h1>
      <p>Encontre materiais próprios do Estímulo e referências externas selecionadas. A busca usa os textos e metadados editoriais publicados.</p>
    </header>

    <form className="card stack" method="get" aria-label="Filtros da biblioteca">
      <label>Buscar<input type="search" name="q" defaultValue={query.q} placeholder="Ex.: fluxo de caixa, planejamento" /></label>
      <div className="admin-columns">
        <label>Tema<select name="topic" defaultValue={query.topic ?? ""}><option value="">Todos</option>{data.facets.topics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}</select></label>
        <label>Formato<select name="format" defaultValue={query.format ?? ""}><option value="">Todos</option>{data.facets.formats.map((format) => <option value={format} key={format}>{formatLabels[format] ?? format}</option>)}</select></label>
        <label>Nível<select name="level" defaultValue={query.level ?? ""}><option value="">Todos</option>{data.facets.levels.map((level) => <option value={level} key={level}>{levelLabels[level] ?? level}</option>)}</select></label>
      </div>
      <div className="inline-actions"><button className="button button--primary" type="submit">Aplicar filtros</button><Link className="button button--ghost" href="/capacitacao/biblioteca">Limpar</Link></div>
    </form>

    <section className="stack stack--large" aria-labelledby="resultados-biblioteca">
      <h2 id="resultados-biblioteca">{data.total} {data.total === 1 ? "conteúdo encontrado" : "conteúdos encontrados"}</h2>
      {data.items.length === 0 ? <StatusPanel title="Nenhum conteúdo encontrado" tone="info"><p>Revise a busca ou remova um dos filtros.</p></StatusPanel> : <div className="card-grid">
        {data.items.map((item) => <article className="card" key={item.library_item_version_id}>
          <div className="card-meta"><span className="status-pill">{formatLabels[item.content_format] ?? item.content_format}</span><span>{levelLabels[item.level] ?? item.level}</span></div>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
          <p className="metadata">{item.estimated_minutes} min · {item.source_name}</p>
          <div className="tag-list" aria-label="Temas">{item.topics.map((topic) => <span className="status-pill" key={topic}>{topic}</span>)}</div>
          {item.journeys.length ? <p className="support-note">Relacionado a {item.journeys.map((journey) => journey.journey_title).join(", ")}.</p> : null}
          <Link className="button button--secondary" href={`/capacitacao/biblioteca/${item.slug}`}>Ver conteúdo</Link>
        </article>)}
      </div>}
    </section>

    {data.total > data.limit ? <nav className="inline-actions" aria-label="Paginação da biblioteca">
      {offset > 0 ? <Link className="button button--secondary" href={pageHref(query, offset - data.limit)}>Página anterior</Link> : <span />}
      {offset + data.limit < data.total ? <Link className="button button--secondary" href={pageHref(query, offset + data.limit)}>Próxima página</Link> : null}
    </nav> : null}
  </>;
}
