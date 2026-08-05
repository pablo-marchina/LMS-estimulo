"use client";

import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { saveHomeBadgeHighlightsAction } from "@/app/admin/gamificacao/badge-highlight-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import type { AdminHomeBadgeWorkspace } from "@/lib/engagement/badge-highlights-runtime";

export function HomeBadgeHighlightsEditor({ workspace }: { workspace: AdminHomeBadgeWorkspace }) {
  const initial = workspace.selected_badges
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => item.badge_version_id);
  const [selected, setSelected] = useState(initial);
  const [candidate, setCandidate] = useState("");
  const badges = useMemo(() => new Map(workspace.available_badges.map((badge) => [badge.badge_version_id, badge])), [workspace.available_badges]);
  const available = workspace.available_badges.filter((badge) => !selected.includes(badge.badge_version_id));

  function add() {
    if (!candidate || selected.includes(candidate)) return;
    setSelected((items) => [...items, candidate]);
    setCandidate("");
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= selected.length) return;
    setSelected((items) => {
      const next = [...items];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  return (
    <Card className="grid gap-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Sparkles size={20} /></span>
        <div><h2 className="text-lg font-black text-secondary">Selos em destaque na Home</h2><p className="mt-1 text-sm leading-6 text-muted">Escolha quais selos aparecem, organize a ordem e defina quantos serão exibidos. O participante verá apenas os primeiros itens dentro do limite.</p></div>
      </div>

      <form action={saveHomeBadgeHighlightsAction} className="grid gap-5">
        {selected.map((badgeVersionId) => <input key={badgeVersionId} type="hidden" name="badge_version_id" value={badgeVersionId} />)}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Label>Adicionar selo<Select value={candidate} onChange={(event) => setCandidate(event.target.value)}><option value="">Selecione um selo publicado</option>{available.map((badge) => <option key={badge.badge_version_id} value={badge.badge_version_id}>{badge.title}</option>)}</Select></Label>
          <Button type="button" variant="secondary" onClick={add} disabled={!candidate} icon={<Plus size={16} />}>Adicionar</Button>
        </div>

        <div className="grid gap-2">
          {selected.length ? selected.map((badgeVersionId, index) => {
            const badge = badges.get(badgeVersionId);
            if (!badge) return null;
            return (
              <div key={badgeVersionId} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span>
                <div className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{badge.title}</strong><span className="block truncate text-xs text-muted">{badge.description}</span></div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary disabled:opacity-30" aria-label={`Mover ${badge.title} para cima`}><ArrowUp size={16} /></button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary disabled:opacity-30" aria-label={`Mover ${badge.title} para baixo`}><ArrowDown size={16} /></button>
                  <button type="button" onClick={() => setSelected((items) => items.filter((id) => id !== badgeVersionId))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label={`Remover ${badge.title}`}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          }) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Nenhum selo foi selecionado para destaque.</p>}
        </div>

        <Label className="max-w-xs">Limite de selos exibidos<Input name="display_limit" type="number" min={1} max={12} defaultValue={workspace.display_limit} required /><span className="text-[11px] font-normal text-muted">Pode ser menor que a lista; os primeiros itens têm prioridade.</span></Label>
        <Button type="submit" className="w-fit">Salvar destaques da Home</Button>
      </form>
    </Card>
  );
}
