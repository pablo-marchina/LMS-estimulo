import { randomUUID } from "node:crypto";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { retireDiagnosticAction } from "./actions";
import { DiagnosticBuilder } from "./diagnostic-builder";
import { DiagnosticVersionSelector } from "./diagnostic-version-selector";
import { profileInputs } from "./page-model-utils";
import type { ReturnTypeOfDiagnosticModel } from "./principal-types";

export function PrincipalDiagnosticSection({ model, canEdit }: { model: ReturnTypeOfDiagnosticModel; canEdit: boolean }) {
  return <>
    <StatusPanel title="O que o diagnóstico principal controla" tone="info">Somente um diagnóstico permanece publicado por vez. Ele define o perfil principal e pode ajudar a personalizar quais jornadas fazem mais sentido para cada participante. Ao publicar uma mudança, a plataforma preserva a relação entre os perfis antigos e os novos.</StatusPanel>
    <Card><DiagnosticVersionSelector value={model.selectorValue} options={model.selectorOptions} /></Card>
    {!model.seed ? <StatusPanel title="Nenhum diagnóstico principal configurado" tone="warning">Crie o primeiro diagnóstico abaixo e publique quando estiver pronto.</StatusPanel> : null}
    <fieldset disabled={!canEdit} className="contents"><DiagnosticBuilder key={model.selectorValue || "novo"} initial={model.initial} previousProfiles={profileInputs(model.published)} canPublish={canEdit} /></fieldset>
    <AdminDisclosure title="Diagnósticos salvos" description="Retirar uma configuração não apaga respostas nem resultados; ela é movida para o histórico preservado abaixo.">
      <div className="grid gap-3 sm:grid-cols-2">{model.active.map((item) => <div key={item.definition_id} className="rounded-xl border border-border p-4"><strong className="text-ink">{item.name}</strong><p className="mt-1 text-xs text-muted">{item.versions.some((version) => version.status === "published") ? "Em uso" : "Em preparação"}</p>{canEdit ? <details className="mt-4 rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">Retirar diagnóstico</summary><form action={retireDiagnosticAction} className="grid gap-2 border-t border-border p-3"><input type="hidden" name="definition_id" value={item.definition_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Label className="text-xs">Confirme digitando EXCLUIR<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm" className="w-fit">Retirar</Button></form></details> : null}</div>)}</div>
    </AdminDisclosure>
    {model.retired.length ? <AdminDisclosure title="Histórico preservado" description="Diagnósticos retirados continuam visíveis para auditoria. Respostas, resultados e versões anteriores permanecem armazenados."><div className="grid gap-3 sm:grid-cols-2">{model.retired.map((item) => { const latest = [...item.versions].sort((a, b) => b.version_number - a.version_number)[0]; return <div key={item.definition_id} className="rounded-xl border border-border bg-surface-muted/35 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-ink">{item.name}</strong><StatusPill tone="neutral">Retirado</StatusPill></div><p className="mt-2 text-xs text-muted">Código: {item.code}</p><p className="mt-1 text-xs text-muted">{latest ? `Última versão preservada: v${latest.version_number}` : "Sem versão registrada"}</p></div>; })}</div></AdminDisclosure> : null}
  </>;
}
