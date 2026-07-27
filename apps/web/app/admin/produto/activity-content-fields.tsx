"use client";

import { useState } from "react";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { Input, Select, Textarea } from "@/components/ui/input";

export type ActivityLibraryOption = {
  library_item_version_id: string;
  title: string;
  content_kind: string;
  content_format: string;
  source_name: string;
  discoverable_in_library: boolean;
};

export function ActivityContentFields({ items, currentLibraryItemVersionId }: { items: ActivityLibraryOption[]; currentLibraryItemVersionId?: string | null }) {
  const [source, setSource] = useState(currentLibraryItemVersionId ? "library" : "none");
  const [newKind, setNewKind] = useState("external_link");
  return (
    <section className="grid gap-3 rounded-2xl border border-primary/15 bg-primary-soft/30 p-4">
      <div><h3 className="font-black text-secondary">Conteúdo principal</h3><p className="text-[11px] text-muted">Escolha um material reutilizável ou crie um novo.</p></div>
      <label className="grid gap-1 text-sm font-medium text-ink">Origem<Select name="content_source" value={source} onChange={(event) => setSource(event.target.value)}><option value="none">Sem conteúdo principal</option><option value="library">Usar da Biblioteca</option><option value="new">Criar agora na Biblioteca</option></Select><span className="text-[11px] font-normal text-muted">Evita duplicar o mesmo material.</span></label>
      {source === "library" ? <label className="grid gap-1 text-sm font-medium text-ink">Material<Select name="library_item_version_id" defaultValue={currentLibraryItemVersionId ?? ""} required><option value="">Selecione</option>{items.map((item) => <option key={item.library_item_version_id} value={item.library_item_version_id}>{item.title} · {item.content_format}</option>)}</Select><span className="text-[11px] font-normal text-muted">Somente conteúdos publicados.</span></label> : null}
      {source === "new" ? <div className="grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-ink">Tipo<Select name="new_content_kind" value={newKind} onChange={(event) => setNewKind(event.target.value)}><option value="external_link">Link ou vídeo</option><option value="article">Texto</option><option value="file">Arquivo</option></Select></label><label className="grid gap-1 text-sm font-medium text-ink">Título<Input name="new_content_title" required /></label><label className="col-span-full grid gap-1 text-sm font-medium text-ink">Resumo<Input name="new_content_summary" required placeholder="Uma frase curta." /></label>{newKind === "external_link" ? <label className="col-span-full grid gap-1 text-sm font-medium text-ink">Endereço HTTPS<Input name="new_content_url" type="url" required placeholder="https://..." /></label> : newKind === "article" ? <label className="col-span-full grid gap-1 text-sm font-medium text-ink">Texto<Textarea name="new_content_body" rows={5} required placeholder="Escreva em parágrafos curtos." /></label> : <div className="col-span-full"><FileUploadPreview name="new_content_file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required label="Arquivo" help="PDF, imagem, TXT ou DOCX, até 6 MB." /></div>}<label className="grid gap-1 text-sm font-medium text-ink">Formato<Select name="new_content_format" defaultValue={newKind === "article" ? "article" : newKind === "file" ? "pdf" : "video"}><option value="video">Vídeo</option><option value="podcast">Áudio ou podcast</option><option value="tool">Ferramenta</option><option value="guide">Guia</option><option value="article">Artigo</option><option value="image">Imagem</option><option value="pdf">PDF</option><option value="course">Curso</option><option value="other">Outro</option></Select></label><label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm text-ink"><input type="checkbox" name="new_content_discoverable" defaultChecked className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Mostrar na Biblioteca</strong><small className="text-muted">Desmarque para uso só em jornadas.</small></span></label></div> : null}
      {source !== "none" ? <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="content_required" className="size-4 accent-primary" /> Exigir antes da verificação</label> : null}
    </section>
  );
}
