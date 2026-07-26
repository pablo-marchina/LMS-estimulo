import { BookOpen, Clock, ExternalLink, FileText } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import type { LibraryItemSummary } from "@/lib/library/contracts";
import { libraryRuntime } from "@/lib/library/runtime";

export const dynamic = "force-dynamic";
const formatLabels: Record<string, string> = { article: "Artigo", video: "Vídeo", podcast: "Podcast", guide: "Guia", tool: "Ferramenta", course: "Curso", other: "Outro" };
const levelLabels: Record<string, string> = { introductory: "Introdutório", intermediate: "Intermediário", advanced: "Avançado", all: "Todos os níveis" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const data = await libraryRuntime.list(auth.identity.user_account_id);
  const topics = [...new Set(data.items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const selectedTopic = typeof query.tema === "string" ? query.tema : "";
  const selectedFormat = typeof query.formato === "string" ? query.formato : "";
  const selectedLevel = typeof query.nivel === "string" ? query.nivel : "";
  const rawSearch = typeof query.q === "string" ? query.q : "";
  const search = rawSearch.trim().toLocaleLowerCase("pt-BR");
  const filtered = data.items.filter((item) => {
    if (selectedTopic && !item.topics.includes(selectedTopic)) return false;
    if (selectedFormat && item.content_format !== selectedFormat) return false;
    if (selectedLevel && item.level !== selectedLevel) return false;
    if (search && ![item.title, item.summary, ...item.topics].join(" ").toLocaleLowerCase("pt-BR").includes(search)) return false;
    return true;
  });

  return <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow="Conteúdo complementar" title="Biblioteca" description="Artigos, arquivos, links e materiais para consultar no seu ritmo." />
    <Card><form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Label className="sm:col-span-2">Buscar<Input name="q" defaultValue={rawSearch} placeholder="Título, resumo ou tema" /></Label><Label>Tema<Select name="tema" defaultValue={selectedTopic}><option value="">Todos</option>{topics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}</Select></Label><Label>Formato<Select name="formato" defaultValue={selectedFormat}><option value="">Todos</option>{data.facets.formats.map((format) => <option value={format} key={format}>{formatLabels[format] ?? format}</option>)}</Select></Label><Label>Nível<Select name="nivel" defaultValue={selectedLevel}><option value="">Todos</option>{data.facets.levels.map((level) => <option value={level} key={level}>{levelLabels[level] ?? level}</option>)}</Select></Label><div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5"><Button type="submit" size="sm">Aplicar filtros</Button><ButtonLink href="/capacitacao/biblioteca" variant="secondary" size="sm">Limpar</ButtonLink></div></form></Card>
    {filtered.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Materiais da biblioteca">{filtered.map((item) => <LibraryCard item={item} key={item.library_item_version_id} />)}</section> : <EmptyState icon={<BookOpen size={24} />} title="Nenhum material encontrado" tone="info">Ajuste os filtros ou volte mais tarde para consultar novos conteúdos.</EmptyState>}
  </div>;
}

function LibraryCard({ item }: { item: LibraryItemSummary }) {
  const Icon = item.content_kind === "file" ? FileText : item.content_kind === "external_link" ? ExternalLink : BookOpen;
  return <Card className="flex flex-col"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon size={21} /></span><StatusPill tone="neutral">{formatLabels[item.content_format] ?? item.content_format}</StatusPill></div><h2 className="mt-5 text-lg font-black text-secondary">{item.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted">{item.summary}</p><div className="mt-4 flex flex-wrap gap-2">{item.topics.slice(0, 3).map((topic) => <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted" key={topic}>{topic}</span>)}</div><div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><span className="inline-flex items-center gap-1.5 text-xs text-muted"><Clock size={14} /> {item.estimated_minutes} min · {levelLabels[item.level] ?? item.level}</span><ButtonLink href={`/capacitacao/biblioteca/${item.slug}`} size="sm">Abrir</ButtonLink></div></Card>;
}
