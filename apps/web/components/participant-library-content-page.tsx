import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { BookOpen, ExternalLink, Layers3 } from "lucide-react";
import { openLibraryContentAction } from "@/app/actions/library";
import { ContentAssetViewer } from "@/components/content-asset-viewer";
import { LibraryAccessTracker } from "@/components/library-access-tracker";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import type { LibraryContent } from "@/lib/library/contracts";
import { libraryRuntime } from "@/lib/library/runtime";

const formatLabels: Record<string, string> = { article: "Artigo", video: "Vídeo", podcast: "Podcast", audio: "Áudio", image: "Imagem", pdf: "PDF", guide: "Guia", tool: "Ferramenta", course: "Curso", other: "Outro" };
const levelLabels: Record<string, string> = { introductory: "Introdutório", intermediate: "Intermediário", advanced: "Avançado", all: "Todos os níveis" };

function viewerType(format: string, contentType: string | null) {
  if (format === "podcast") return "audio";
  if (["video", "audio", "image", "pdf"].includes(format)) return format;
  if (contentType?.startsWith("video/")) return "video";
  if (contentType?.startsWith("audio/")) return "audio";
  if (contentType?.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "pdf";
  return "external_link";
}

async function adminPreviewContent(actorUserAccountId: string, organizationId: string, slug: string): Promise<LibraryContent | null> {
  const data = await libraryRuntime.listOperator(actorUserAccountId, organizationId);
  const item = data.items.find((entry) => entry.slug === slug && entry.status === "published");
  if (!item || item.estimated_minutes === null) return null;
  const journeyById = new Map(data.journey_versions.map((journey) => [journey.journey_version_id, journey]));
  return {
    library_item_id: item.library_item_id,
    library_item_version_id: item.library_item_version_id,
    slug: item.slug,
    version_number: item.version_number,
    title: item.title,
    summary: item.summary,
    body: item.body,
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
    journeys: item.journey_version_ids.map((id) => ({ journey_version_id: id, relation_type: "supplemental", journey_title: journeyById.get(id)?.title ?? "Jornada" })),
    rank: 0,
    file_object_id: item.file_object_id,
    original_filename: item.original_filename,
    file_content_type: item.file_content_type,
    accessibility_metadata: {},
    has_external_link: Boolean(item.external_url),
    has_file: Boolean(item.file_object_id),
  };
}

export async function ParticipantLibraryContentPage({ params, basePath }: { params: Promise<{ slug: string }>; basePath: string }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const adminOrganization = administrativeOrganization(auth.identity);
  const previewMode = basePath.startsWith("/capacitacao/") && Boolean(adminOrganization);
  if (!auth.identity.entrepreneur_id && !adminOrganization) redirect("/cadastro/concluir");
  const { slug } = await params;
  const content = previewMode && adminOrganization
    ? await adminPreviewContent(auth.identity.user_account_id, adminOrganization.organization_id, slug)
    : await libraryRuntime.get(auth.identity.user_account_id, slug).catch(() => null);
  if (!content) notFound();

  const downloadHref = content.has_file ? `/api/library-content/${content.library_item_version_id}/download` : null;
  const type = viewerType(content.content_format, content.file_content_type);
  const hasPlayableContent = Boolean(content.external_url || downloadHref);

  return (
    <div className="participant-stage mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      {!previewMode ? <LibraryAccessTracker libraryItemVersionId={content.library_item_version_id} /> : null}
      <Link href={basePath} className="brand-button inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary hover:text-white">← Voltar à biblioteca</Link>

      <article className="grid gap-8" aria-labelledby="library-content-title">
        <PageHeader eyebrow={previewMode ? `Prévia · ${formatLabels[content.content_format] ?? content.content_format}` : formatLabels[content.content_format] ?? content.content_format} title={<span id="library-content-title">{content.title}</span>} description={previewMode ? `${content.summary} Esta visualização não registra progresso, pontos, respostas ou entregas.` : content.summary} />

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm" aria-label="Informações do conteúdo">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted"><BookOpen size={16} className="text-primary" /> {levelLabels[content.level] ?? content.level}</span>
          <span className="text-border-strong">•</span><span className="text-sm font-semibold text-muted">{content.estimated_minutes} min</span>
          <span className="text-border-strong">•</span><span className="text-sm font-semibold text-muted">Fonte: {content.source_name}</span>
          {content.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)}
        </section>

        {content.journeys.length ? <Card className="border-brand-cyan/35 bg-info-soft/55"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-cyan text-secondary"><Layers3 size={19} /></span><div><h2 className="font-black text-secondary">Complementa estas jornadas</h2><ul className="mt-2 grid gap-1 text-sm text-muted">{content.journeys.map((journey) => <li key={journey.journey_version_id}>{journey.journey_title}</li>)}</ul></div></div></Card> : null}

        {content.content_kind === "article" ? (
          <Card className="grid gap-4" id="conteudo" aria-labelledby="conteudo-titulo"><div><p className="brand-kicker">Leitura</p><h2 id="conteudo-titulo" className="display-font mt-1 text-2xl text-secondary">Conteúdo</h2></div><div className="grid gap-4 text-sm leading-7 text-ink/90">{content.body?.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`} className="whitespace-pre-line">{paragraph}</p>)}</div></Card>
        ) : hasPlayableContent ? (
          <section id="conteudo" className="grid gap-4"><div><p className="brand-kicker">Acesse sem sair da plataforma</p><h2 className="display-font mt-1 text-2xl text-secondary">{type === "video" ? "Assista agora" : type === "audio" ? "Ouça agora" : type === "image" ? "Visualize o material" : type === "pdf" ? "Leia o documento" : "Explore o conteúdo"}</h2></div><ContentAssetViewer asset={{ id: content.library_item_version_id, asset_type: type, title: content.title, external_url: content.external_url, description: content.summary, original_filename: content.original_filename, content_type: content.file_content_type, accessibility_metadata: content.accessibility_metadata, is_required: false }} downloadHref={downloadHref} /></section>
        ) : <Card><p className="text-sm text-muted">O material está temporariamente indisponível.</p></Card>}

        {content.content_kind === "external_link" && content.external_url && type === "external_link" ? (
          <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/20 bg-primary-soft/45"><div><h2 className="font-black text-secondary">Continuar no site da fonte</h2><p className="mt-1 text-sm text-muted">{previewMode ? "Na prévia, o link é aberto sem registrar acesso." : "O acesso é registrado para medir o uso da Biblioteca, sem enviar o conteúdo da sua navegação ao parceiro."}</p></div>{previewMode ? <ButtonLink href={content.external_url} target="_blank" rel="noreferrer" icon={<ExternalLink size={15} />}>Abrir material</ButtonLink> : <form action={openLibraryContentAction}><input type="hidden" name="library_item_version_id" value={content.library_item_version_id} /><input type="hidden" name="slug" value={content.slug} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" icon={<ExternalLink size={15} />}>Abrir material de {content.source_name}</Button></form>}</Card>
        ) : null}
      </article>
    </div>
  );
}
