import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { openLibraryContentAction } from "@/app/actions/library";
import { LibraryAccessTracker } from "@/components/library-access-tracker";
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

export default async function LibraryContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const { slug } = await params;
  const content = await libraryRuntime.get(auth.identity.user_account_id, slug).catch(() => null);
  if (!content) notFound();

  return <>
    <LibraryAccessTracker libraryItemVersionId={content.library_item_version_id} />
    <Link className="back-link" href="/capacitacao/biblioteca">← Voltar à biblioteca</Link>
    <article className="stack stack--large" aria-labelledby="library-content-title">
      <header className="page-heading">
        <p className="eyebrow">{formatLabels[content.content_format] ?? content.content_format}</p>
        <h1 id="library-content-title">{content.title}</h1>
        <p>{content.summary}</p>
        <div className="card-meta"><span>{levelLabels[content.level] ?? content.level}</span><span>{content.estimated_minutes} min</span><span>{content.source_name}</span></div>
        <div className="tag-list" aria-label="Temas">{content.topics.map((topic) => <span className="status-pill" key={topic}>{topic}</span>)}</div>
      </header>

      {content.journeys.length ? <section className="card"><h2>Relacionado às jornadas</h2><ul>{content.journeys.map((journey) => <li key={journey.journey_version_id}>{journey.journey_title}</li>)}</ul></section> : null}

      {content.content_kind === "article" ? <section className="card stack" id="conteudo" aria-labelledby="conteudo-titulo">
        <h2 id="conteudo-titulo">Conteúdo</h2>
        {content.body?.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>)}
      </section> : <section className="card stack" id="conteudo">
        <h2>Conteúdo externo</h2>
        <p>O material será aberto no site da fonte. O acesso é registrado para medir uso da biblioteca, sem enviar o conteúdo da sua navegação ao parceiro.</p>
        <form action={openLibraryContentAction}>
          <input type="hidden" name="library_item_version_id" value={content.library_item_version_id} />
          <input type="hidden" name="slug" value={content.slug} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <button className="button button--primary" type="submit">Abrir material de {content.source_name}</button>
        </form>
      </section>}
    </article>
  </>;
}
