"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { Input, Select, Textarea } from "@/components/ui/input";

export type ActivityLibraryOption = {
  library_item_version_id: string;
  title: string;
  summary: string | null;
  body: string | null;
  external_url: string | null;
  original_filename: string | null;
  content_kind: string;
  content_format: string;
  source_name: string;
  discoverable_in_library: boolean;
};

export type CurrentActivityAsset = {
  title: string;
  asset_type: string;
  external_url: string | null;
  file_object_id: string | null;
  accessibility_metadata: Record<string, unknown>;
};

type ActivityContentFieldsProps = {
  items: ActivityLibraryOption[];
  currentLibraryItemVersionId?: string | null;
  currentAsset?: CurrentActivityAsset | null;
  currentContentRequired?: boolean;
  currentConfiguration?: Record<string, unknown>;
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function ConfigurationPreview({ configuration }: { configuration: Record<string, unknown> }) {
  const sections = Array.isArray(configuration.content_sections) ? configuration.content_sections.map(recordValue).filter((item) => textValue(item.heading) || textValue(item.body)) : [];
  const prompts = Array.isArray(configuration.prompts) ? configuration.prompts.map(recordValue).filter((item) => textValue(item.title) || textValue(item.text)) : [];
  if (!sections.length && !prompts.length) return null;
  return <div className="grid gap-3 rounded-xl border border-border bg-white p-3">
    <strong className="text-sm text-secondary">Texto e recursos salvos na atividade</strong>
    {sections.map((section, index) => <div key={`section-${index}`} className="rounded-lg bg-surface-muted p-3"><p className="text-sm font-bold text-ink">{textValue(section.heading) || `Parte ${index + 1}`}</p>{textValue(section.body) ? <p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted">{textValue(section.body)}</p> : null}</div>)}
    {prompts.length ? <div className="grid gap-2"><p className="text-xs font-black uppercase tracking-wide text-primary">Prompts</p>{prompts.map((prompt, index) => <div key={`prompt-${index}`} className="rounded-lg border border-border p-3"><p className="text-xs font-bold text-secondary">{textValue(prompt.title) || `Prompt ${index + 1}`}</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted">{textValue(prompt.text)}</p></div>)}</div> : null}
  </div>;
}

export function ActivityContentFields({
  items,
  currentLibraryItemVersionId,
  currentAsset = null,
  currentContentRequired = false,
  currentConfiguration = {},
}: ActivityContentFieldsProps) {
  const initialSource = currentLibraryItemVersionId ? "library" : currentAsset ? "current" : "none";
  const [source, setSource] = useState(initialSource);
  const [newKind, setNewKind] = useState("external_link");
  const [selectedLibraryItemVersionId, setSelectedLibraryItemVersionId] = useState(currentLibraryItemVersionId ?? "");
  const selectedLibraryItem = useMemo(() => items.find((item) => item.library_item_version_id === selectedLibraryItemVersionId) ?? null, [items, selectedLibraryItemVersionId]);
  const metadata = recordValue(currentAsset?.accessibility_metadata);

  return (
    <section className="grid gap-3 rounded-2xl border border-primary/15 bg-primary-soft/30 p-4">
      <div><h3 className="font-black text-secondary">Conteúdo principal</h3><p className="text-[11px] text-muted">Veja o conteúdo atual antes de mantê-lo, substituí-lo ou removê-lo.</p></div>

      {currentAsset ? <div className="grid gap-2 rounded-xl border border-border bg-white p-3">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><FileText size={18} aria-hidden="true" /></span><div><strong className="text-sm text-secondary">{currentAsset.title || "Conteúdo atual"}</strong><p className="text-xs text-muted">{currentAsset.asset_type}{textValue(metadata.source_name) ? ` · ${textValue(metadata.source_name)}` : ""}</p></div></div>
        {textValue(metadata.summary) ? <p className="text-xs leading-5 text-muted">{textValue(metadata.summary)}</p> : null}
        {currentAsset.external_url ? <a href={currentAsset.external_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-primary hover:underline"><ExternalLink size={13} />Abrir conteúdo atual</a> : currentAsset.file_object_id ? <p className="text-xs font-semibold text-primary">Arquivo armazenado na plataforma</p> : null}
      </div> : null}

      <ConfigurationPreview configuration={currentConfiguration} />

      <label className="grid gap-1 text-sm font-medium text-ink">Origem
        <Select name="content_source" value={source} onChange={(event) => setSource(event.target.value)}>
          {currentAsset && !currentLibraryItemVersionId ? <option value="current">Manter conteúdo atual</option> : null}
          <option value="none">Sem conteúdo principal</option>
          <option value="library">Usar da Biblioteca</option>
          <option value="new">Criar agora na Biblioteca</option>
        </Select>
        <span className="text-[11px] font-normal text-muted">Escolher “sem conteúdo” remove o material quando a aula for salva.</span>
      </label>

      {source === "library" ? <div className="grid gap-3"><label className="grid gap-1 text-sm font-medium text-ink">Material<Select name="library_item_version_id" value={selectedLibraryItemVersionId} onChange={(event) => setSelectedLibraryItemVersionId(event.target.value)} required><option value="">Selecione</option>{items.map((item) => <option key={item.library_item_version_id} value={item.library_item_version_id}>{item.title} · {item.content_format}</option>)}</Select><span className="text-[11px] font-normal text-muted">Somente conteúdos publicados.</span></label>{selectedLibraryItem ? <div className="grid gap-2 rounded-xl bg-white p-3"><strong className="text-sm text-secondary">{selectedLibraryItem.title}</strong>{selectedLibraryItem.summary ? <p className="text-xs leading-5 text-muted">{selectedLibraryItem.summary}</p> : null}{selectedLibraryItem.body ? <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-lg bg-surface-muted p-3 text-xs leading-5 text-muted">{selectedLibraryItem.body}</p> : null}{selectedLibraryItem.external_url ? <a href={selectedLibraryItem.external_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-primary hover:underline"><ExternalLink size={13} />Abrir material</a> : selectedLibraryItem.original_filename ? <p className="text-xs font-semibold text-primary">Arquivo: {selectedLibraryItem.original_filename}</p> : null}</div> : null}</div> : null}

      {source === "new" ? <div className="grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-ink">Tipo<Select name="new_content_kind" value={newKind} onChange={(event) => setNewKind(event.target.value)}><option value="external_link">Link ou vídeo</option><option value="article">Texto</option><option value="file">Arquivo</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="new_content_title" required /></label><label className="col-span-full grid gap-1 text-sm font-medium text-ink">Resumo<Input name="new_content_summary" required placeholder="Uma frase curta." /></label>{newKind === "external_link" ? <label className="col-span-full grid gap-1 text-sm font-medium text-ink">Endereço HTTPS<Input name="new_content_url" type="url" required placeholder="https://..." /></label> : newKind === "article" ? <label className="col-span-full grid gap-1 text-sm font-medium text-ink">Texto<Textarea name="new_content_body" rows={5} required placeholder="Escreva em parágrafos curtos." /></label> : <div className="col-span-full"><FileUploadPreview name="new_content_file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required label="Arquivo" help="PDF, imagem, TXT ou DOCX, até 6 MB." /></div>}<label className="grid gap-1 text-sm font-medium text-ink">Formato<Select name="new_content_format" defaultValue={newKind === "article" ? "article" : newKind === "file" ? "pdf" : "video"}><option value="video">Vídeo</option><option value="podcast">Áudio ou podcast</option><option value="tool">Ferramenta</option><option value="guide">Guia</option><option value="article">Artigo</option><option value="image">Imagem</option><option value="pdf">PDF</option><option value="course">Curso</option><option value="other">Outro</option></Select></label><label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm text-ink"><input type="checkbox" name="new_content_discoverable" defaultChecked className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Mostrar na Biblioteca</strong><small className="text-muted">Desmarque para uso só em jornadas.</small></span></label></div> : null}
      {source !== "none" ? <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="content_required" defaultChecked={currentContentRequired} className="size-4 accent-primary" /> Exigir antes da verificação</label> : null}
    </section>
  );
}
