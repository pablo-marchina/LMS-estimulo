import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function blocks(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function safeHttps(value: unknown) { try { const url = new URL(text(value)); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }

export default async function ParticipantB2bPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requireParticipantContext();
  const workspace = await extensionsRuntime.participantWorkspace(auth.identity.user_account_id);
  const page = workspace.b2b_pages.find((item) => text(item.slug) === slug);
  if (!page) notFound();

  return <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:px-9 lg:py-10">
    <Link href="/empreendedor/b2b" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} />Voltar ao B2B</Link>
    <PageHeader eyebrow="Conteúdo exclusivo" title={text(page.title)} description={text(page.description)} />
    <main className="grid gap-5">{blocks(page.blocks).map((block, index) => <BlockRenderer key={`${text(block.type)}-${index}`} block={block} />)}</main>
  </div>;
}

function BlockRenderer({ block }: { block: JsonRecord }) {
  const type = text(block.type);
  const title = text(block.title);
  const body = text(block.body);
  const url = safeHttps(block.url);
  if (type === "divider") return <hr className="border-border" />;
  if (type === "heading") return <header><h2 className="display-font text-3xl text-secondary">{title}</h2>{body ? <p className="mt-2 whitespace-pre-wrap text-muted">{body}</p> : null}</header>;
  if (type === "rich_text") return <Card>{title ? <h2 className="text-xl font-black text-secondary">{title}</h2> : null}<div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink">{body}</div></Card>;
  if (type === "notice") return <div className={`rounded-2xl border p-5 ${text(block.tone) === "warning" ? "border-warning/30 bg-warning/10" : text(block.tone) === "success" ? "border-success/30 bg-success/10" : "border-primary/25 bg-primary-soft/50"}`}><h2 className="font-black text-secondary">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-ink">{body}</p></div>;
  if (type === "image" && url) return <figure className="overflow-hidden rounded-2xl border border-border bg-white"><Image src={url} alt={title || "Imagem do conteúdo B2B"} width={1600} height={900} unoptimized className="h-auto max-h-[80dvh] w-full object-contain" />{title ? <figcaption className="p-3 text-sm text-muted">{title}</figcaption> : null}</figure>;
  if (type === "video" && url) return <Card>{title ? <h2 className="mb-4 font-black text-secondary">{title}</h2> : null}<div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black" style={{ maxHeight: "min(70dvh, 720px)" }}><iframe src={url} title={title || "Vídeo B2B"} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" /></div></Card>;
  if ((type === "download" || type === "button") && url) return <Link href={url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:brightness-95">{type === "download" ? <Download size={17} /> : <ExternalLink size={17} />}{text(block.label) || title || "Abrir"}</Link>;
  if (type === "embed" && url) return <Card>{title ? <h2 className="mb-4 font-black text-secondary">{title}</h2> : null}<iframe src={url} title={title || "Conteúdo incorporado"} className="min-h-[480px] w-full rounded-xl border border-border" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" /></Card>;
  if (type === "cards") { const rows = body.split("\n").map((row) => row.split("|").map((part) => part.trim())).filter((row) => row[0]); return <section><h2 className="mb-4 text-xl font-black text-secondary">{title}</h2><div className="grid gap-3 sm:grid-cols-2">{rows.map((row, index) => <Card key={`${row[0]}-${index}`}><h3 className="font-bold text-ink">{row[0]}</h3>{row[1] ? <p className="mt-2 text-sm text-muted">{row[1]}</p> : null}{safeHttps(row[2]) ? <Link href={safeHttps(row[2])!} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Abrir <ExternalLink size={14} /></Link> : null}</Card>)}</div></section>; }
  return null;
}
