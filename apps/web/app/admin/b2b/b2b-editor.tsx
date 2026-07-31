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

  return <form action={saveExtensionAction} className="grid gap-5">
    <input type="hidden" name="resource_type" value="b2b_page" />
    <input type="hidden" name="return_to" value="/admin/b2b" />
    <input type="hidden" name="json_fields" value="blocks" />
    <input type="hidden" name="array_fields" value="user_ids,group_ids" />
    <input type="hidden" name="id" value={stringValue(page?.id)} />
    <input type="hidden" name="version_id" value={stringValue(current.id)} />
    <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

    <div className="grid gap-3 sm:grid-cols-2">
      <Label>Nome interno<Input name="name" defaultValue={stringValue(page?.name)} required /></Label>
      <Label>Código<Input name="code" defaultValue={stringValue(page?.code)} pattern="[a-z][a-z0-9_-]{1,79}" required /></Label>
      <Label>Slug da página<Input name="slug" defaultValue={stringValue(page?.slug)} pattern="[a-z0-9][a-z0-9_-]{2,99}" required /></Label>
      <Label>Título para o participante<Input name="title" defaultValue={stringValue(current.title)} required /></Label>
      <Label className="sm:col-span-2">Descrição<Textarea name="description" rows={3} defaultValue={stringValue(current.description)} /></Label>
      <Label>Disponível a partir de<Input name="starts_at" type="datetime-local" defaultValue={stringValue(current.starts_at).slice(0, 16)} /></Label>
      <Label>Disponível até<Input name="ends_at" type="datetime-local" defaultValue={stringValue(current.ends_at).slice(0, 16)} /></Label>
      <Label>Estado<Select name="status" defaultValue={stringValue(current.status) === "published" ? "published" : "draft"}><option value="draft">Rascunho</option><option value="published">Publicada</option></Select></Label>
    </div>

    <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
      <legend className="px-2 text-sm font-black text-secondary">Conteúdo em blocos</legend>
      <div className="flex flex-wrap gap-2">{[
        ["heading", "Título"], ["rich_text", "Texto"], ["image", "Imagem"], ["video", "Vídeo"], ["download", "Arquivo"],
        ["button", "Botão"], ["notice", "Aviso"], ["cards", "Cards"], ["divider", "Separador"], ["embed", "Incorporação"],
      ].map(([type, label]) => <Button key={type} type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => add(type)}>{label}</Button>)}</div>
      <div className="grid gap-3">{blocks.map((block, index) => <article key={`${block.type}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-secondary">{index + 1}. {block.type}</strong><div className="flex gap-1"><Button type="button" variant="ghost" size="sm" aria-label="Mover para cima" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></Button><Button type="button" variant="ghost" size="sm" aria-label="Mover para baixo" onClick={() => move(index, 1)} disabled={index === blocks.length - 1}><ArrowDown size={15} /></Button><Button type="button" variant="ghost" size="sm" aria-label="Excluir bloco" onClick={() => remove(index)}><Trash2 size={15} /></Button></div></div>
        {block.type !== "divider" ? <Input value={block.title ?? ""} onChange={(event) => update(index, { title: event.target.value })} placeholder="Título do bloco" /> : null}
        {["rich_text", "notice", "cards", "heading"].includes(block.type) ? <Textarea value={block.body ?? ""} onChange={(event) => update(index, { body: event.target.value })} rows={4} placeholder={block.type === "cards" ? "Um card por linha: Título | descrição | URL" : "Conteúdo"} /> : null}
        {["image", "video", "download", "button", "embed"].includes(block.type) ? <Input value={block.url ?? ""} onChange={(event) => update(index, { url: event.target.value })} type="url" placeholder="https://..." /> : null}
        {["download", "button"].includes(block.type) ? <Input value={block.label ?? ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Texto do botão" /> : null}
        {block.type === "notice" ? <Select value={block.tone ?? "info"} onChange={(event) => update(index, { tone: event.target.value })}><option value="info">Informativo</option><option value="success">Sucesso</option><option value="warning">Atenção</option></Select> : null}
      </article>)}</div>
      {blocks.length === 0 ? <p className="text-sm text-muted">Adicione blocos para construir a página.</p> : null}
    </fieldset>

    <div className="grid gap-4 lg:grid-cols-2">
      <Label>Usuários com acesso<Select name="user_ids" multiple className="min-h-48" defaultValue={arrayValue(page?.user_ids)}>{participants.map((participant) => <option key={participant.user_account_id} value={participant.user_account_id}>{participant.name} · {participant.email}</option>)}</Select><span className="text-[11px] font-normal text-muted">Use Ctrl/Cmd para selecionar vários usuários.</span></Label>
      <Label>Grupos com acesso<Select name="group_ids" multiple className="min-h-48" defaultValue={arrayValue(page?.group_ids)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</Select></Label>
    </div>

    <PendingSubmitButton pendingLabel="Salvando página…" className="w-fit">Salvar página B2B</PendingSubmitButton>
  </form>;
}
