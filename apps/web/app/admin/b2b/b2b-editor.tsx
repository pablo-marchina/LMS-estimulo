"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { ExtensionParticipant, JsonRecord } from "@/lib/extensions/runtime";

type Block = { type: string; title?: string; body?: string; url?: string; label?: string; tone?: string };
type Option = { id: string; name: string };

const blockLabels: Record<string, string> = {
  heading: "Título",
  rich_text: "Texto",
  image: "Imagem",
  video: "Vídeo",
  download: "Arquivo",
  button: "Botão",
  notice: "Aviso",
  cards: "Lista de cards",
  divider: "Separador",
  embed: "Conteúdo incorporado",
};

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function arrayValue(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function blockValue(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item && typeof item === "object" && !Array.isArray(item) ? item as Block : null).filter((item): item is Block => Boolean(item));
}

export function B2bPageEditor({ page, participants, groups }: { page?: JsonRecord; participants: ExtensionParticipant[]; groups: Option[] }) {
  const versions = Array.isArray(page?.versions) ? page.versions.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  const current = versions.find((item) => item.status === "draft") ?? versions.find((item) => item.status === "published") ?? {};
  const [blocks, setBlocks] = useState<Block[]>(() => blockValue(current.blocks));

  function add(type: string) { setBlocks((items) => [...items, { type, title: "", body: "", url: "", label: "" }]); }
  function update(index: number, patch: Partial<Block>) { setBlocks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function remove(index: number) { setBlocks((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  function move(index: number, direction: -1 | 1) {
    setBlocks((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  const selectedUsers = arrayValue(page?.user_ids);
  const selectedGroups = arrayValue(page?.group_ids);

  return <form action={saveExtensionAction} className="grid gap-5">
    <input type="hidden" name="resource_type" value="b2b_page" />
    <input type="hidden" name="return_to" value="/admin/b2b" />
    <input type="hidden" name="json_fields" value="blocks" />
    <input type="hidden" name="array_fields" value="user_ids,group_ids" />
    <input type="hidden" name="id" value={stringValue(page?.id)} />
    <input type="hidden" name="version_id" value={stringValue(current.id)} />
    <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
    <input type="hidden" name="code" value={stringValue(page?.code)} />
    <input type="hidden" name="slug" value={stringValue(page?.slug)} />

    <div className="grid gap-4 sm:grid-cols-2">
      <Label>Nome da página<Input name="name" defaultValue={stringValue(page?.name)} placeholder="Conteúdo exclusivo para parceiros" required /></Label>
      <Label>Estado<Select name="status" defaultValue={stringValue(current.status) === "published" ? "published" : "draft"}><option value="draft">Salvar como rascunho</option><option value="published">Publicar para autorizados</option></Select></Label>
      <Label className="sm:col-span-2">Título mostrado ao participante<Input name="title" defaultValue={stringValue(current.title)} required /></Label>
      <Label className="sm:col-span-2">Descrição curta<Textarea name="description" rows={2} defaultValue={stringValue(current.description)} /></Label>
    </div>

    <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
      <legend className="px-2 text-sm font-black text-secondary">Monte o conteúdo</legend>
      <div className="flex flex-wrap gap-2">{[
        ["heading", "Título"], ["rich_text", "Texto"], ["image", "Imagem"], ["video", "Vídeo"], ["button", "Botão"], ["download", "Arquivo"],
      ].map(([type, label]) => <Button key={type} type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => add(type)}>{label}</Button>)}</div>
      <details className="rounded-xl bg-surface-muted/50"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-secondary">Outros tipos de bloco</summary><div className="flex flex-wrap gap-2 border-t border-border p-3">{[["notice","Aviso"],["cards","Lista de cards"],["divider","Separador"],["embed","Incorporação"]].map(([type,label]) => <Button key={type} type="button" variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => add(type)}>{label}</Button>)}</div></details>
      <div className="grid gap-3">{blocks.map((block, index) => <article key={`${block.type}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-secondary">{index + 1}. {blockLabels[block.type] ?? "Bloco"}</strong><div className="flex gap-1"><Button type="button" variant="ghost" size="sm" aria-label="Mover para cima" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></Button><Button type="button" variant="ghost" size="sm" aria-label="Mover para baixo" onClick={() => move(index, 1)} disabled={index === blocks.length - 1}><ArrowDown size={15} /></Button><Button type="button" variant="ghost" size="sm" aria-label="Excluir bloco" onClick={() => remove(index)}><Trash2 size={15} /></Button></div></div>
        {block.type !== "divider" ? <Input value={block.title ?? ""} onChange={(event) => update(index, { title: event.target.value })} placeholder="Título opcional" /> : null}
        {["rich_text", "notice", "cards", "heading"].includes(block.type) ? <Textarea value={block.body ?? ""} onChange={(event) => update(index, { body: event.target.value })} rows={3} placeholder={block.type === "cards" ? "Um item por linha: Título | descrição | link" : "Escreva o conteúdo"} /> : null}
        {["image", "video", "download", "button", "embed"].includes(block.type) ? <Input value={block.url ?? ""} onChange={(event) => update(index, { url: event.target.value })} type="url" placeholder="Cole o link aqui" /> : null}
        {["download", "button"].includes(block.type) ? <Input value={block.label ?? ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Texto do botão" /> : null}
        {block.type === "notice" ? <Select value={block.tone ?? "info"} onChange={(event) => update(index, { tone: event.target.value })}><option value="info">Informativo</option><option value="success">Sucesso</option><option value="warning">Atenção</option></Select> : null}
      </article>)}</div>
      {blocks.length === 0 ? <p className="text-sm text-muted">Use os botões acima para adicionar o primeiro conteúdo.</p> : null}
    </fieldset>

    <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
      <legend className="px-2 text-sm font-black text-secondary">Quem pode acessar?</legend>
      <p className="text-sm text-muted">Marque pessoas ou grupos. Sem seleção, ninguém verá a página.</p>
      {groups.length ? <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Grupos</p><div className="grid gap-2 sm:grid-cols-2">{groups.map((group) => <label key={group.id} className="flex items-center gap-2 rounded-lg bg-surface-muted p-2 text-sm"><input type="checkbox" name="group_ids" value={group.id} defaultChecked={selectedGroups.includes(group.id)} className="accent-primary" />{group.name}</label>)}</div></div> : null}
      <details className="rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">Selecionar pessoas individualmente</summary><div className="grid max-h-56 gap-2 overflow-y-auto border-t border-border p-3 sm:grid-cols-2">{participants.map((participant) => <label key={participant.user_account_id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-surface-muted"><input type="checkbox" name="user_ids" value={participant.user_account_id} defaultChecked={selectedUsers.includes(participant.user_account_id)} className="mt-0.5 accent-primary" /><span><strong className="block text-ink">{participant.name}</strong><small className="text-muted">{participant.email}</small></span></label>)}</div></details>
    </fieldset>

    <details className="rounded-xl border border-border bg-surface-muted/40">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Agendar disponibilidade</summary>
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2"><Label>Disponível a partir de<Input name="starts_at" type="datetime-local" defaultValue={stringValue(current.starts_at).slice(0, 16)} /></Label><Label>Disponível até<Input name="ends_at" type="datetime-local" defaultValue={stringValue(current.ends_at).slice(0, 16)} /></Label></div>
    </details>

    <PendingSubmitButton pendingLabel="Salvando página…" className="w-fit">Salvar página</PendingSubmitButton>
  </form>;
}
