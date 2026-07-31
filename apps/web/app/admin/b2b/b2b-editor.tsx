"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { ExtensionParticipant, JsonRecord } from "@/lib/extensions/runtime";

type Block = { type: string; title?: string; body?: string; url?: string; label?: string; tone?: string };
type Option = { id: string; name: string };

const blockLabels: Record<string, string> = { heading: "Título", rich_text: "Texto", image: "Imagem", video: "Vídeo", download: "Arquivo", button: "Botão", notice: "Aviso", divider: "Separador" };
const blockOptions = Object.entries(blockLabels);

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function arrayValue(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function blockValue(value: unknown): Block[] { if (!Array.isArray(value)) return []; return value.map((item) => item && typeof item === "object" && !Array.isArray(item) ? item as Block : null).filter((item): item is Block => Boolean(item)); }
function codeFrom(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "").slice(0, 79) || "pagina_b2b"; }

export function B2bPageEditor({ page, participants, groups }: { page?: JsonRecord; participants: ExtensionParticipant[]; groups: Option[] }) {
  const versions = Array.isArray(page?.versions) ? page.versions.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  const current = versions.find((item) => item.status === "draft") ?? versions.find((item) => item.status === "published") ?? {};
  const initialTitle = stringValue(current.title) || stringValue(page?.name);
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(stringValue(page?.slug));
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const existing = blockValue(current.blocks);
    return existing.length ? existing : [{ type: "heading", title: "", body: "" }, { type: "rich_text", title: "", body: "" }];
  });
  const selectedUsers = useMemo(() => new Set(arrayValue(page?.user_ids)), [page?.user_ids]);
  const selectedGroups = useMemo(() => new Set(arrayValue(page?.group_ids)), [page?.group_ids]);

  function add(type: string) { setBlocks((items) => [...items, { type, title: "", body: "", url: "", label: "" }]); }
  function update(index: number, patch: Partial<Block>) { setBlocks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function remove(index: number) { setBlocks((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  function move(index: number, direction: -1 | 1) { setBlocks((items) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target]!, next[index]!]; return next; }); }

  return <form action={saveExtensionAction} className="grid gap-5">
    <input type="hidden" name="resource_type" value="b2b_page" />
    <input type="hidden" name="return_to" value="/admin/b2b" />
    <input type="hidden" name="json_fields" value="blocks" />
    <input type="hidden" name="array_fields" value="user_ids,group_ids" />
    <input type="hidden" name="id" value={stringValue(page?.id)} />
    <input type="hidden" name="version_id" value={stringValue(current.id)} />
    <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
    <input type="hidden" name="name" value={title || stringValue(page?.name)} />
    <input type="hidden" name="code" value={stringValue(page?.code) || codeFrom(slug || title)} />

    <section className="grid gap-3 rounded-2xl border border-border bg-white p-4">
      <div><p className="text-xs font-bold uppercase tracking-wide text-primary">1. Identificação</p><h3 className="mt-1 font-black text-secondary">Como a página será apresentada</h3></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label>Título da página<Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Conteúdo exclusivo do parceiro" required /></Label>
        <Label>Endereço da página<Input name="slug" value={slug} onChange={(event) => setSlug(codeFrom(event.target.value))} placeholder="conteudo-parceiro" pattern="[a-z0-9][a-z0-9_-]{2,99}" required /><span className="text-[11px] font-normal text-muted">Será usado em /empreendedor/b2b/endereço</span></Label>
        <Label className="sm:col-span-2">Descrição curta<Textarea name="description" rows={2} defaultValue={stringValue(current.description)} placeholder="Explique em uma frase o que a pessoa encontrará aqui." /></Label>
      </div>
    </section>

    <section className="grid gap-3 rounded-2xl border border-border bg-white p-4">
      <div><p className="text-xs font-bold uppercase tracking-wide text-primary">2. Conteúdo</p><h3 className="mt-1 font-black text-secondary">Monte a página por blocos</h3><p className="mt-1 text-sm text-muted">Adicione somente o que precisar e organize na ordem de leitura.</p></div>
      <div className="flex flex-wrap gap-2">{blockOptions.map(([type, label]) => <Button key={type} type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => add(type)}>{label}</Button>)}</div>
      <div className="grid gap-3">{blocks.map((block, index) => <article key={`${block.type}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-secondary">{index + 1}. {blockLabels[block.type] ?? block.type}</strong><div className="flex gap-1"><Button type="button" variant="ghost" size="sm" aria-label="Mover para cima" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={14} /></Button><Button type="button" variant="ghost" size="sm" aria-label="Mover para baixo" onClick={() => move(index, 1)} disabled={index === blocks.length - 1}><ArrowDown size={14} /></Button><Button type="button" variant="ghost" size="sm" aria-label="Excluir bloco" onClick={() => remove(index)}><Trash2 size={14} /></Button></div></div>
        {block.type !== "divider" ? <Input value={block.title ?? ""} onChange={(event) => update(index, { title: event.target.value })} placeholder={block.type === "button" ? "Título opcional" : "Título do bloco"} /> : null}
        {["rich_text", "notice", "heading"].includes(block.type) ? <Textarea value={block.body ?? ""} onChange={(event) => update(index, { body: event.target.value })} rows={3} placeholder="Escreva o conteúdo" /> : null}
        {["image", "video", "download", "button"].includes(block.type) ? <Input value={block.url ?? ""} onChange={(event) => update(index, { url: event.target.value })} type="url" placeholder="Cole o link aqui" /> : null}
        {["download", "button"].includes(block.type) ? <Input value={block.label ?? ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Texto do botão" /> : null}
        {block.type === "notice" ? <Select value={block.tone ?? "info"} onChange={(event) => update(index, { tone: event.target.value })}><option value="info">Informativo</option><option value="success">Sucesso</option><option value="warning">Atenção</option></Select> : null}
      </article>)}</div>
    </section>

    <section className="grid gap-3 rounded-2xl border border-border bg-white p-4">
      <div><p className="text-xs font-bold uppercase tracking-wide text-primary">3. Acesso</p><h3 className="mt-1 font-black text-secondary">Escolha quem poderá ver</h3></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-border p-3"><legend className="px-2 text-sm font-bold text-secondary">Usuários</legend>{participants.map((participant) => <label key={participant.user_account_id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-surface-muted"><input type="checkbox" name="user_ids" value={participant.user_account_id} defaultChecked={selectedUsers.has(participant.user_account_id)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block text-ink">{participant.name}</strong><small className="text-muted">{participant.email}</small></span></label>)}{participants.length === 0 ? <p className="text-sm text-muted">Nenhum usuário disponível.</p> : null}</fieldset>
        <fieldset className="grid content-start gap-2 rounded-xl border border-border p-3"><legend className="px-2 text-sm font-bold text-secondary">Grupos</legend>{groups.map((group) => <label key={group.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-surface-muted"><input type="checkbox" name="group_ids" value={group.id} defaultChecked={selectedGroups.has(group.id)} className="size-4 accent-primary" />{group.name}</label>)}{groups.length === 0 ? <p className="text-sm text-muted">Nenhum grupo criado. Você pode liberar diretamente para usuários.</p> : null}</fieldset>
      </div>
    </section>

    <details className="rounded-2xl border border-border bg-white"><summary className="cursor-pointer p-4 text-sm font-bold text-secondary">Opções de publicação</summary><div className="grid gap-3 border-t border-border p-4 sm:grid-cols-3"><Label>Disponível a partir de<Input name="starts_at" type="datetime-local" defaultValue={stringValue(current.starts_at).slice(0, 16)} /></Label><Label>Disponível até<Input name="ends_at" type="datetime-local" defaultValue={stringValue(current.ends_at).slice(0, 16)} /></Label><Label>Estado<Select name="status" defaultValue={stringValue(current.status) === "published" ? "published" : "draft"}><option value="draft">Salvar como rascunho</option><option value="published">Publicar agora</option></Select></Label></div></details>

    <PendingSubmitButton pendingLabel="Salvando página…" className="w-fit">Salvar página</PendingSubmitButton>
  </form>;
}
