import { ClipboardList } from "lucide-react";
import { OptionalDiagnosticForm } from "@/app/admin/diagnosticos-opcionais/optional-diagnostic-form";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { JsonRecord } from "@/lib/extensions/runtime";
import { num, str } from "./page-model-utils";

export function OptionalDiagnosticSection({ workspace, canEdit }: { workspace: { diagnostic_versions: JsonRecord[]; participants: JsonRecord[]; optional_diagnostics: JsonRecord[] } | null; canEdit: boolean }) {
  return <>
    <StatusPanel title="Sem impacto no arquétipo ou nas jornadas" tone="info">Diagnósticos opcionais servem apenas para reflexão e análise. Eles não alteram o arquétipo principal nem liberam ou bloqueiam jornadas.</StatusPanel>
    {!workspace ? <StatusPanel title="Diagnósticos opcionais temporariamente indisponíveis" tone="warning">O diagnóstico principal continua disponível para edição. Apenas os dados opcionais não puderam ser carregados agora.</StatusPanel> : <>
      <fieldset disabled={!canEdit} className="contents">
        <Card className="grid gap-4"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Adicionar ao perfil</h2><p className="text-sm text-muted">Escolha um diagnóstico já preparado, defina quem poderá vê-lo e publique quando estiver pronto.</p></div></div><OptionalDiagnosticForm diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></Card>
      </fieldset>
      <section className="grid gap-3"><div><p className="brand-kicker">No perfil</p><h2 className="display-font mt-1 text-2xl text-secondary">Diagnósticos disponíveis</h2></div>{workspace.optional_diagnostics.length === 0 ? <Card><p className="text-sm text-muted">Nenhum diagnóstico opcional configurado.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.optional_diagnostics.map((item) => <Card key={str(item.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{str(item.display_title)}</h3><p className="text-sm text-muted">{str(item.diagnostic_name)}</p></div><StatusPill tone={str(item.status) === "published" ? "success" : "neutral"}>{str(item.status) === "published" ? "Visível no perfil" : str(item.status) === "inactive" ? "Retirado" : "Em preparação"}</StatusPill></div><p className="text-sm text-muted">{str(item.display_description)}</p><p className="text-xs text-muted">{num(item.session_count)} resposta(s) iniciada(s) · {item.max_attempts === null ? "sem limite de tentativas" : `${num(item.max_attempts)} tentativa(s)`}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar disponibilidade</summary><div className="border-t border-border p-4"><OptionalDiagnosticForm item={item} diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></div></details></Card>)}</div>}</section>
    </>}
  </>;
}
