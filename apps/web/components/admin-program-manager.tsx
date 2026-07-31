"use client";

import { Archive, FolderKanban, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

type Program = {
  id: string;
  name: string;
  description?: string;
  status: string;
  journey_count: number;
};

export function AdminProgramManager() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/programs", { cache: "no-store" });
    const data = await response.json().catch(() => ({})) as { programs?: Program[]; error?: string };
    if (!response.ok) setMessage(data.error || "Não foi possível carregar os programas.");
    setPrograms(data.programs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error || "Não foi possível salvar o programa.");
      return false;
    }
    setMessage("Programa salvo.");
    await load();
    return true;
  }

  return (
    <details className="mt-7 rounded-2xl border border-border bg-white shadow-sm">
      <summary className="cursor-pointer list-none p-5">
        <span className="flex items-center justify-between gap-4">
          <span className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FolderKanban size={20} /></span>
            <span>
              <strong className="block text-secondary">Organizar programas</strong>
              <small className="mt-1 block text-muted">Agrupe jornadas relacionadas sem sair desta tela.</small>
            </span>
          </span>
          <span className="text-xs font-bold text-primary">Abrir</span>
        </span>
      </summary>
      <div className="grid gap-5 border-t border-border p-5">
        {message ? <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-secondary">{message}</p> : null}

        <Card className="grid gap-4 shadow-none">
          <div className="flex items-start gap-3"><Plus className="mt-0.5 text-primary" /><div><h3 className="font-black text-secondary">Criar programa</h3><p className="text-sm text-muted">Use programas para reunir jornadas que fazem parte da mesma iniciativa.</p></div></div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ok = await save({ name: form.get("name"), description: form.get("description") });
            if (ok) event.currentTarget.reset();
          }}>
            <Label>Nome do programa<Input name="name" placeholder="Ex.: Formação empreendedora" required /></Label>
            <Label className="sm:col-span-2">Descrição curta<Textarea name="description" rows={2} placeholder="Explique quais jornadas pertencem a este programa." /></Label>
            <Button type="submit" disabled={saving} className="w-fit">{saving ? "Salvando…" : "Criar programa"}</Button>
          </form>
        </Card>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-secondary">Programas atuais</h3><p className="text-sm text-muted">Edite nomes e descrições. Um programa só pode ser arquivado quando estiver vazio.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</Button></div>
          {loading ? <p className="text-sm text-muted">Carregando programas…</p> : null}
          {!loading && programs.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Nenhum programa criado.</p> : null}
          <div className="grid gap-3 lg:grid-cols-2">{programs.map((program) => (
            <details key={program.id} className="rounded-xl border border-border bg-white">
              <summary className="cursor-pointer p-4">
                <span className="flex items-start justify-between gap-3"><span><strong className="block text-ink">{program.name}</strong><small className="text-muted">{program.journey_count} jornada(s)</small></span><span className="text-xs font-bold text-primary">Editar</span></span>
              </summary>
              <form className="grid gap-3 border-t border-border p-4" onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                await save({ id: program.id, name: form.get("name"), description: form.get("description"), status: "active" });
              }}>
                <Label>Nome<Input name="name" defaultValue={program.name} required /></Label>
                <Label>Descrição<Textarea name="description" rows={2} defaultValue={program.description ?? ""} /></Label>
                <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={saving}>Salvar alterações</Button><Button type="button" variant="secondary" size="sm" disabled={saving || program.journey_count > 0} onClick={() => void save({ id: program.id, name: program.name, description: program.description, status: "retired" })}><Archive size={15} /> Arquivar</Button></div>
                {program.journey_count > 0 ? <p className="text-xs text-muted">Mova as jornadas para outro programa antes de arquivar.</p> : null}
              </form>
            </details>
          ))}</div>
        </section>
      </div>
    </details>
  );
}
