import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { openLibraryContentAction } from "@/app/actions/library";
import { LibraryAccessTracker } from "@/components/library-access-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <LibraryAccessTracker libraryItemVersionId={content.library_item_version_id} />

      <Link href="/capacitacao/biblioteca" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline">
        ← Voltar à biblioteca
      </Link>

      <article className="grid gap-8" aria-labelledby="library-content-title">
        <PageHeader
          eyebrow={formatLabels[content.content_format] ?? content.content_format}
          title={<span id="library-content-title">{content.title}</span>}
          description={content.summary}
        />

        <div className="grid gap-4">
          <p className="text-sm text-muted">
            {levelLabels[content.level] ?? content.level} · {content.estimated_minutes} min · {content.source_name}
          </p>
          {content.topics.length ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Temas">
              {content.topics.map((topic) => (
                <Badge key={topic}>{topic}</Badge>
              ))}
            </div>
          ) : null}
        </div>

        {content.journeys.length ? (
          <Card>
            <h2 className="text-lg font-semibold text-ink">Relacionado às jornadas</h2>
            <ul className="mt-2 grid gap-1 text-sm text-muted">
              {content.journeys.map((journey) => (
                <li key={journey.journey_version_id}>{journey.journey_title}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {content.content_kind === "article" ? (
          <Card className="grid gap-3" id="conteudo" aria-labelledby="conteudo-titulo">
            <h2 id="conteudo-titulo" className="text-lg font-semibold text-ink">
              Conteúdo
            </h2>
            <div className="grid gap-3 text-sm text-ink/90">
              {content.body?.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="grid gap-4" id="conteudo">
            <h2 className="text-lg font-semibold text-ink">Conteúdo externo</h2>
            <p className="text-sm text-muted">
              O material será aberto no site da fonte. O acesso é registrado para medir uso da biblioteca, sem enviar o
              conteúdo da sua navegação ao parceiro.
            </p>
            <form action={openLibraryContentAction}>
              <input type="hidden" name="library_item_version_id" value={content.library_item_version_id} />
              <input type="hidden" name="slug" value={content.slug} />
              <input type="hidden" name="idempotency_key" value={randomUUID()} />
              <Button type="submit" className="w-fit">
                Abrir material de {content.source_name}
              </Button>
            </form>
          </Card>
        )}
      </article>
    </div>
  );
}
