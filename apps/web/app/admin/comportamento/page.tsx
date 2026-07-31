import { Activity, BarChart3, DatabaseZap } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function dimensions(value: unknown): Array<[string, number]> { if (!value || typeof value !== "object" || Array.isArray(value)) return []; return Object.entries(value).map(([key,current]) => [key,number(current)]); }

export default async function AdminBehaviorPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();

  return <div className="grid gap-6">
    <PageHeader eyebrow="Inteligência analítica" title="Score comportamental" description="Visão multidimensional calculada somente para análise administrativa, relatórios e exportação ETL." />
    {query.sucesso ? <StatusPanel title="Scores recalculados" tone="success">Os eventos capturados desde a implantação foram processados.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível recalcular" tone="warning">Código: {query.erro}</StatusPanel> : null}
    <StatusPanel title="Uso estritamente analítico" tone="info">Este score não altera acesso, jornadas, recompensas, recomendações, mensagens, navegação ou qualquer experiência do participante.</StatusPanel>

    <section className="grid gap-4 sm:grid-cols-3"><Metric icon={<Activity size={19} />} label="Pessoas calculadas" value={workspace.behavior_scores.length} /><Metric icon={<BarChart3 size={19} />} label="Dimensões" value={8} /><Metric icon={<DatabaseZap size={19} />} label="Cobertura histórica" value="A partir desta versão" /></section>

    <Card><form action={saveExtensionAction} className="flex flex-wrap items-center justify-between gap-4"><input type="hidden" name="resource_type" value="behavior_recalculate" /><input type="hidden" name="return_to" value="/admin/comportamento" /><div><h2 className="font-black text-secondary">Recalcular snapshots</h2><p className="text-sm text-muted">Os eventos brutos permanecem imutáveis e podem ser recalculados por versões futuras do modelo.</p></div><PendingSubmitButton pendingLabel="Recalculando…">Recalcular agora</PendingSubmitButton></form></Card>

    <div className="grid gap-4">{workspace.behavior_scores.map((score) => <Card key={text(score.id)} className="grid gap-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black text-ink">{text(score.preferred_name) || text(score.legal_name) || text(score.email_normalized)}</h2><p className="text-xs text-muted">{text(score.email_normalized)} · {number(score.event_count)} evento(s)</p></div><div className="text-right"><p className="display-font text-3xl text-secondary">{number(score.total_score).toFixed(1)}</p><StatusPill tone={number(score.confidence) >= 0.65 ? "success" : "warning"}>Confiança {number(score.confidence).toFixed(2)}</StatusPill></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dimensions(score.dimensions).map(([name,value]) => <div key={name} className="rounded-xl bg-surface-muted p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold capitalize text-muted">{name.replaceAll("_"," ")}</span><strong className="text-secondary">{value.toFixed(1)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0,Math.min(100,value))}%` }} /></div></div>)}</div><p className="text-xs text-muted">Cobertura iniciada em {text(score.coverage_started_at) ? new Date(text(score.coverage_started_at)).toLocaleString("pt-BR") : "—"} · Calculado em {text(score.calculated_at) ? new Date(text(score.calculated_at)).toLocaleString("pt-BR") : "—"}</p></Card>)}{workspace.behavior_scores.length === 0 ? <Card><p className="text-sm text-muted">Ainda não há snapshots. A captura começa nesta implantação; use “Recalcular agora” após existirem eventos.</p></Card> : null}</div>
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <Card><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div><p className="mt-3 text-2xl font-black text-secondary">{value}</p></Card>; }
