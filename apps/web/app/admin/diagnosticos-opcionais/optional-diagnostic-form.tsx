"use client";

import { useMemo, useState } from "react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { JsonRecord } from "@/lib/extensions/runtime";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }

export function OptionalDiagnosticForm({ item = {}, diagnosticVersions, participants, returnTo = "/admin/diagnostico?tipo=opcionais" }: { item?: JsonRecord; diagnosticVersions: JsonRecord[]; participants: Array<{ user_account_id: string; name: string; email: string }>; returnTo?: string }) {
  const initialAudience = record(item.audience);
  const initialIds = Array.isArray(initialAudience.user_ids) ? initialAudience.user_ids.map(String) : [];
  const [audienceType, setAudienceType] = useState(initialAudience.type === "users" ? "users" : "all");
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const audience = useMemo(() => audienceType === "users" ? { type: "users", user_ids: selectedIds } : { type: "all" }, [audienceType, selectedIds]);

  function toggleUser(id: string, checked: boolean) { setSelectedIds((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id)); }

  return <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="optional_diagnostic" /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="json_fields" value="audience" /><input type="hidden" name="boolean_fields" value="show_result" /><input type="hidden" name="id" value={text(item.id)} /><input type="hidden" name="audience" value={JSON.stringify(audience)} />
    <Label className="sm:col-span-2">Qual diagnóstico será oferecido?<Select name="diagnostic_version_id" defaultValue={text(item.diagnostic_version_id)} required><option value="">Selecione</option>{diagnosticVersions.map((version) => <option key={text(version.id)} value={text(version.id)}>{text(version.name)}</option>)}</Select></Label>
    <Label className="sm:col-span-2">Título para o participante<Input name="display_title" defaultValue={text(item.display_title)} placeholder="Ex.: Diagnóstico de liderança" required /></Label>
    <Label className="sm:col-span-2">Explicação curta<Textarea name="display_description" rows={2} defaultValue={text(item.display_description)} placeholder="Explique por que vale a pena responder." /></Label>
    <Label>Quem poderá ver<Select value={audienceType} onChange={(event) => setAudienceType(event.target.value)}><option value="all">Todos os participantes</option><option value="users">Somente pessoas escolhidas</option></Select></Label>
    <Label>Disponibilidade<Select name="status" defaultValue={text(item.status) || "draft"}><option value="draft">Preparar sem mostrar</option><option value="published">Mostrar no perfil</option><option value="inactive">Retirar do perfil</option></Select></Label>
    {audienceType === "users" ? <fieldset className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-border p-3 sm:col-span-2"><legend className="px-2 text-sm font-bold text-secondary">Escolha as pessoas</legend>{participants.map((participant) => <label key={participant.user_account_id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-surface-muted"><input type="checkbox" checked={selectedIds.includes(participant.user_account_id)} onChange={(event) => toggleUser(participant.user_account_id, event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block text-ink">{participant.name}</strong><small className="text-muted">{participant.email}</small></span></label>)}</fieldset> : null}
    <details className="rounded-xl border border-border sm:col-span-2"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Prazo, novas tentativas e pontos</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2"><Label>Disponível a partir de<Input name="starts_at" type="datetime-local" defaultValue={text(item.starts_at).slice(0,16)} /></Label><Label>Disponível até<Input name="ends_at" type="datetime-local" defaultValue={text(item.ends_at).slice(0,16)} /></Label><Label>Quantidade de tentativas<Input name="max_attempts" type="number" min="1" defaultValue={item.max_attempts === null ? "" : String(number(item.max_attempts))} placeholder="Vazio = sem limite" /></Label><Label>Dias antes de refazer<Input name="retry_interval_days" type="number" min="0" defaultValue={String(number(item.retry_interval_days))} /></Label><Label>Pontos pela conclusão<Input name="points_on_completion" type="number" min="0" defaultValue={String(number(item.points_on_completion))} /></Label><label className="flex items-center gap-2 rounded-xl bg-surface-muted p-3 text-sm"><input type="hidden" name="show_result" value="false" /><input type="checkbox" name="show_result" value="true" defaultChecked={item.show_result !== false} className="size-4 accent-primary" />Mostrar o resultado ao participante</label></div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar diagnóstico opcional</PendingSubmitButton>
  </form>;
}
