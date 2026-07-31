import { Activity, BarChart3, DatabaseZap } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { AppShell } from "@/components/app-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function dimensions(value: unknown): Array<[string, number]> { if (!value || typeof value !== "object" || Array.isArray(value)) return []; return Object.entries(value).map(([key,current]) => [key,number(current)]); }

export default async function AdminBehaviorPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();

  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Análise" title="Comportamento" description="Acompanhe engajamento sem alterar a experiência do participante." />
    {query.sucesso ? <StatusPanel title="Dados atualizados" tone="success">Os eventos recentes foram processados.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível atualizar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <section className="grid gap-3 sm:grid-cols-3"><Metric icon={<Activity size={18} />} label="Pessoas" value={workspace.behavior_scores.length} /><Metric icon={<BarChart3 size={18} />} label="Dimensões" value={8} /><Metric icon={<DatabaseZap size={18} />} label="Período" value="Desde a ativação" /></section>

    <Card><form action={saveExtensionAction} className="flex flex-wrap items-center justify-between gap-3"><input type="hidden" name="resource_type" value="behavior_recalculate" /><input type="hidden" name="return_to" value="/admin/comportamento" /><div><h2 className="font-black text-secondary">Atualizar resultados</h2><p className="text-sm text-muted">O score é apenas informativo e não libera ou bloqueia nada.</p></div><PendingSubmitButton pendingLabel="Atualizando…">Atualizar agora</PendingSubmitButton></form></Card>

    <section className="grid gap-3"><div><p className="brand-kicker">Resultados</p><h2 className="display-font mt-1 text-2xl text-secondary">Participantes</h2></div>{workspace.behavior_scores.map((score) => <details key={text(score.id)} className="rounded-2xl border border-border bg-white shadow-sm"><summary className="cursor-pointer p-4"><span className="flex flex-wrap items-center justify-between gap-3"><span><strong className="block text-ink">{text(score.preferred_name) || text(score.legal_name) || text(score.email_normalized)}</strong><small className="text-muted">{number(score.event_count)} evento(s)</small></span><span className="text-right"><strong className="display-font block text-2xl text-secondary">{number(score.total_score).toFixed(1)}</strong><StatusPill tone={number(score.confidence) >= 0.65 ? "success" : "warning"}>Confiança {number(score.confidence).toFixed(2)}</StatusPill></span></span></summary><div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">{dimensions(score.dimensions).map(([name,current]) => <div key={name} className="rounded-xl bg-surface-muted p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold capitalize text-muted">{name.replaceAll("_"," ")}</span><strong className="text-secondary">{current.toFixed(1)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0,Math.min(100,current))}%` }} /></div></div>)}</div></details>)}{workspace.behavior_scores.length === 0 ? <Card><p className="text-sm text-muted">Ainda não há dados suficientes. Clique em “Atualizar agora” depois que houver interações.</p></Card> : null}</section>
  </div></AppShell>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <Card className="p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div><p className="mt-2 text-xl font-black text-secondary">{value}</p></Card>; }
