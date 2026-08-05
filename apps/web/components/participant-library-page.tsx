import { redirect } from "next/navigation";
import { BookOpen, Clock, ExternalLink, FileText, GraduationCap, Newspaper, Podcast, Search, Video, Wrench } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import type { LibraryItemSummary, LibraryListing } from "@/lib/library/contracts";
import { libraryRuntime } from "@/lib/library/runtime";

const formatLabels: Record<string, string> = { article: "Artigo", video: "Vídeo", podcast: "Podcast", guide: "Guia", tool: "Ferramenta", course: "Curso", image: "Imagem", pdf: "PDF", audio: "Áudio", other: "Outro" };
const levelLabels: Record<string, string> = { introductory: "Começando", intermediate: "Em desenvolvimento", advanced: "Avançado", all: "Todos os momentos" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function formatIcon(format: string, kind: string) {
  const props = { size: 21, "aria-hidden": true } as const;
  if (format === "article") return <Newspaper {...props} />;
  if (format === "video") return <Video {...props} />;
  if (format === "podcast" || format === "audio") return <Podcast {...props} />;
  if (format === "guide") return <BookOpen {...props} />;
  if (format === "tool") return <Wrench {...props} />;
  if (format === "course") return <GraduationCap {...props} />;
  if (kind === "file") return <FileText {...props} />;
  if (kind === "external_link") return <ExternalLink {...props} />;
  return <BookOpen {...props} />;
}

async function adminPreviewListing(actorUserAccountId: string, organizationId: string): Promise<LibraryListing> {
  const data = await libraryRuntime.listOperator(actorUserAccountId, organizationId);
  const journeyById = new Map(data.journey_versions.map((journey) => [journey.journey_version_id, journey]));
  const items: LibraryItemSummary[] = data.items
    .filter((item) => item.status === "published" && item.discoverable_in_library)
    .map((item) => ({
      library_item_id: item.library_item_id,
      library_item_version_id: item.library_item_version_id,
      slug: item.slug,
      version_number: item.version_number,
      title: item.title,
      summary: item.summary,
      content_kind: item.content_kind,
      content_format: item.content_format,
      level: item.level,
      estimated_minutes: item.estimated_minutes,
      source_type: item.source_type,
      source_name: item.source_name,
      external_url: item.external_url,
      language_code: item.language_code,
      topics: item.topics,
      visibility: item.visibility,
      published_at: item.published_at ?? new Date(0).toISOString(),
      journeys: item.journey_version_ids.map((id) => ({ journey_version_id: id, relation_type: "supplemental" as const, journey_title: journeyById.get(id)?.title ?? "Jornada" })),
      rank: 0,
      file_object_id: item.file_object_id,
      original_filename: item.original_filename,
      file_content_type: item.file_content_type,
    }));
  return {
    items,
    total: items.length,
    limit: items.length,
    offset: 0,
    facets: {
      topics: [...new Set(items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR")),
      formats: [...new Set(items.map((item) => item.content_format))].sort(),
      levels: [...new Set(items.map((item) => item.level))].sort(),
    },
  };
}

function searchableText(item: LibraryItemSummary) {
  return normalize([
    item.title,
    item.summary,
    item.source_name ?? "",
    item.original_filename ?? "",
    ...item.topics,
    ...item.journeys.map((journey) => journey.journey_title),
  ].join(" "));
}

export async function ParticipantLibraryPage({ searchParams, basePath }: { searchParams: SearchParams; basePath: string }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const adminOrganization = administrativeOrganization(auth.identity);
  const previewMode = !auth.identity.entrepreneur_id && Boolean(adminOrganization);
  if (!auth.identity.entrepreneur_id && !adminOrganization) redirect("/cadastro/concluir");

  const selectedTopic = typeof query.tema === "string" ? query.tema : "";
  const selectedFormat = typeof query.formato === "string" ? query.formato : "";
  const selectedLevel = typeof query.nivel === "string" ? query.nivel : "";
  const rawSearch = typeof query.q === "string" ? query.q : "";
  const rawData = previewMode && adminOrganization
    ? await adminPreviewListing(auth.identity.user_account_id, adminOrganization.organization_id)
    : await libraryRuntime.list({ actorUserAccountId: auth.identity.user_account_id, query: rawSearch || null, topic: selectedTopic || null, contentFormat: selectedFormat || null, level: selectedLevel || null });
  const normalizedSearch = normalize(rawSearch);
  const items = rawData.items.filter((item) => {
    if (normalizedSearch && !searchableText(item).includes(normalizedSearch)) return false;
    if (selectedTopic && !item.topics.includes(selectedTopic)) return false;
    if (selectedFormat && item.content_format !== selectedFormat) return false;
    if (selectedLevel && item.level !== selectedLevel) return false;
    return true;
  });
  const topics = rawData.facets.topics.length ? rawData.facets.topics : [...new Set(rawData.items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow={previewMode ? "Prévia administrativa" : "Conteúdo complementar"} title="Biblioteca" description={previewMode ? "Visualização com o mesmo layout do participante. Esta prévia não registra acesso, progresso, pontos ou entregas." : "Encontre materiais por assunto, formato ou momento de aprendizagem. Conteúdos ligados às jornadas também aparecem nos resultados quando estão publicados para a Biblioteca."} actions={previewMode ? <ButtonLink href="/admin/biblioteca?view=conteudos" variant="secondary">Voltar à administração</ButtonLink> : undefined} />
    <Card><form method="get" role="search" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Label className="sm:col-span-2">Buscar<Input name="q" defaultValue={rawSearch} placeholder="Ex.: OpenAI, ChatGPT, contabilidade ou atendimento" /></Label><Label>Tema<Select name="tema" defaultValue={selectedTopic}><option value="">Todos</option>{topics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}</Select></Label><Label>Formato<Select name="formato" defaultValue={selectedFormat}><option value="">Todos</option>{rawData.facets.formats.map((format) => <option value={format} key={format}>{formatLabels[format] ?? format}</option>)}</Select></Label><Label>Momento<Select name="nivel" defaultValue={selectedLevel}><option value="">Todos</option>{rawData.facets.levels.map((level) => <option value={level} key={level}>{levelLabels[level] ?? level}</option>)}</Select></Label><div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5"><Button type="submit" size="sm" icon={<Search size={16} />}>BUSCAR</Button><ButtonLink href={basePath} variant="secondary" size="sm">Limpar filtros</ButtonLink></div></form></Card>
    {items.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Materiais da biblioteca">{items.map((item) => <LibraryCard item={item} basePath={basePath} key={item.library_item_version_id} />)}</section> : <EmptyState icon={<BookOpen size={24} />} title="Nenhum material encontrado" tone="info">Revise a busca ou os filtros. Temas disponíveis são criados a partir dos conteúdos publicados pela administração.</EmptyState>}
  </div>;
}

function LibraryCard({ item, basePath }: { item: LibraryItemSummary; basePath: string }) {
  return <Card className="flex flex-col"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary" aria-label={`Formato: ${formatLabels[item.content_format] ?? item.content_format}`}>{formatIcon(item.content_format, item.content_kind)}</span><StatusPill tone="neutral">{formatLabels[item.content_format] ?? item.content_format}</StatusPill></div><h2 className="mt-5 text-lg font-black text-secondary">{item.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted">{item.summary}</p><div className="mt-4 flex flex-wrap gap-2">{item.topics.slice(0, 3).map((topic) => <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted" key={topic}>{topic}</span>)}</div>{item.journeys.length ? <p className="mt-3 text-xs text-muted">Relacionado a: {item.journeys.map((journey) => journey.journey_title).join(", ")}</p> : null}<div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><span className="inline-flex items-center gap-1.5 text-xs text-muted"><Clock size={14} /> {item.estimated_minutes} min · {levelLabels[item.level] ?? item.level}</span><ButtonLink href={`${basePath}/${item.slug}`} size="sm">Abrir</ButtonLink></div></Card>;
}
