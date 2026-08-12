"use client";

import { ExternalLink, FileText, Save } from "lucide-react";
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
  id: string;
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
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function ActivityContentFields({
  items,
  currentLibraryItemVersionId,
  currentAsset = null,
  currentContentRequired = false,
}: ActivityContentFieldsProps) {
  const initialSource = currentLibraryItemVersionId ? "library" : currentAsset ? "current" : "none";
  const [source, setSource] = useState(initialSource);
  const [newKind, setNewKind] = useState("external_link");
  const [selectedLibraryItemVersionId, setSelectedLibraryItemVersionId] = useState(currentLibraryItemVersionId ?? "");
  const selectedLibraryItem = useMemo(() => items.find((item) => item.library_item_version_id === selectedLibraryItemVersionId) ?? null, [items, selectedLibraryItemVersionId]);
  const metadata = recordValue(currentAsset?.accessibility_metadata);
  const [assetTitle, setAssetTitle] = useState(currentAsset?.title ?? "");
  const [assetDescription, setAssetDescription] = useState(textValue(metadata.description));
  const [assetSaveState, setAssetSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function saveCurrentAssetCopy() {
    if (!currentAsset?.id || !assetTitle.trim()) return;
    setAssetSaveState("saving");
    try {
      const response = await fetch(`/api/admin/activity-assets/${encodeURIComponent(currentAsset.id)}/metadata`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: assetTitle, description: assetDescription }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      setAssetSaveState("saved");
    } catch {
      setAssetSaveState("error");
    }
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-primary/15 bg-primary-soft/30 p-4">
      <div><h3 className="font-black text-secondary">Conteúdo principal</h3><p className="text-[11px] text-muted">Veja o conteúdo atual antes de mantê-lo, substituí-lo ou removê-lo.</p></div>

      {currentAsset ? <div className="grid gap-3 rounded-xl border border-border bg-white p-3">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><FileText size={18} aria-hidden="true" /></span><div><strong className="text-sm text-secondary">{assetTitle || "Conteúdo atual"}</strong><p className="text-xs text-muted">{currentAsset.asset_type}{textValue(metadata.source_name) ? ` · ${textValue(metadata.source_name)}` : ""}</p></div></div>
        {textValue(metadata.summary) ? <p className="text-xs leading-5 text-muted">{textValue(metadata.summary)}</p> : null}
        {currentAsset.external_url ? <a href={currentAsset.external_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-primary hover:underline"><ExternalLink size={13} />Abrir conteúdo atual</a> : currentAsset.file_object_id ? <p className="text-xs font-semibold text-primary">Arquivo armazenado na plataforma</p> : null}

        {!currentLibraryItemVersionId ? <div className="grid gap-3 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">Texto exibido ao participante</p>
          <label className="grid gap-1 text-sm font-medium text-ink">Título do conteúdo<Input value={assetTitle} onChange={(event) => { setAssetTitle(event.target.value); setAssetSaveState("idle"); }} maxLength={240} /></label>
          <label className="grid gap-1 text-sm font-medium text-ink">Descrição<Textarea value={assetDescription} onChange={(event) => { setAssetDescription(event.target.value); setAssetSaveState("idle"); }} rows={3} maxLength={2000} /><span className="text-[11px] font-normal text-muted">Este é o texto que aparece acima do player. Pode ser alterado sem recriar o conteúdo.</span></label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={saveCurrentAssetCopy} disabled={assetSaveState === "saving" || !assetTitle.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"><Save size={15} />{assetSaveState === "saving" ? "Salvando…" : "Salvar texto do conteúdo"}</button>
            {assetSaveState === "saved" ? <span className="text-xs font-bold text-success">Texto salvo.</span> : null}
            {assetSaveState === "error" ? <span className="text-xs font-bold text-danger">Não foi possível salvar. Tente novamente.</span> : null}
          </div>
        </div> : null}
      </div> : null}

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
