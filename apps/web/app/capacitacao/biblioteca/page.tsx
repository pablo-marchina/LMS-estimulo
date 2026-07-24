import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
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

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Capacitação"
        title="Biblioteca de conteúdos"
        description="Encontre materiais próprios do Estímulo e referências externas selecionadas. A busca usa os textos e metadados editoriais publicados."
      />

      <Card>
        <form method="get" aria-label="Filtros da biblioteca" className="grid gap-4">
          <Label>
            Buscar
            <Input type="search" name="q" defaultValue={query.q} placeholder="Ex.: fluxo de caixa, planejamento" />
          </Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Label>
              Tema
              <Select name="topic" defaultValue={query.topic ?? ""}>
                <option value="">Todos</option>
                {data.facets.topics.map((topic) => (
                  <option value={topic} key={topic}>
                    {topic}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              Formato
              <Select name="format" defaultValue={query.format ?? ""}>
                <option value="">Todos</option>
                {data.facets.formats.map((format) => (
                  <option value={format} key={format}>
                    {formatLabels[format] ?? format}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              Nível
              <Select name="level" defaultValue={query.level ?? ""}>
                <option value="">Todos</option>
                {data.facets.levels.map((level) => (
                  <option value={level} key={level}>
                    {levelLabels[level] ?? level}
                  </option>
                ))}
              </Select>
            </Label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Aplicar filtros</Button>
            <ButtonLink href="/capacitacao/biblioteca" variant="ghost">
              Limpar
            </ButtonLink>
          </div>
        </form>
      </Card>

      <section className="grid gap-4" aria-labelledby="resultados-biblioteca">
        <h2 id="resultados-biblioteca" className="text-xl font-semibold text-ink">
          {data.total} {data.total === 1 ? "conteúdo encontrado" : "conteúdos encontrados"}
        </h2>

        {data.items.length === 0 ? (
          <EmptyState title="Nenhum conteúdo encontrado" tone="info">
            Revise a busca ou remova um dos filtros.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <Card key={item.library_item_version_id} className="flex flex-col">
                <div className="mb-3 flex items-center justify-between text-sm text-muted">
                  <StatusPill tone="info">{formatLabels[item.content_format] ?? item.content_format}</StatusPill>
                  <span>{levelLabels[item.level] ?? item.level}</span>
                </div>
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.summary}</p>
                <p className="mt-3 text-xs text-muted">
                  {item.estimated_minutes} min · {item.source_name}
                </p>
                {item.topics.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Temas">
                    {item.topics.map((topic) => (
                      <Badge key={topic}>{topic}</Badge>
                    ))}
                  </div>
                ) : null}
                {item.journeys.length ? (
                  <p className="mt-3 text-xs text-muted">
                    Relacionado a {item.journeys.map((journey) => journey.journey_title).join(", ")}.
                  </p>
                ) : null}
                <div className="mt-auto pt-4">
                  <ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} variant="secondary" size="sm">
                    Ver conteúdo
                  </ButtonLink>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {data.total > data.limit ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Paginação da biblioteca">
          {offset > 0 ? (
            <ButtonLink href={pageHref(query, offset - data.limit)} variant="secondary" size="sm">
              Página anterior
            </ButtonLink>
          ) : (
            <span />
          )}
          {offset + data.limit < data.total ? (
            <ButtonLink href={pageHref(query, offset + data.limit)} variant="secondary" size="sm">
              Próxima página
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
