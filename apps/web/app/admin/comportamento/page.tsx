import { Activity, RefreshCw } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
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
  const { workspace } = await requireAdminExtensionsWorkspace();
  const people = workspace.behavior_scores.length;
  const events = workspace.behavior_scores.reduce((sum, score) => sum + number(score.event_count), 0);

  return <div className="grid gap-5">
    <PageHeader eyebrow="Análise" title="Comportamento" description="Acompanhe sinais de engajamento sem alterar a experiência do participante." />
    {query.sucesso ? <StatusPanel title="Dados atualizados" tone="success">Os scores foram recalculados.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível atualizar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><Activity className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Resumo atual</h2><p className="text-sm text-muted">{people} pessoa(s) analisada(s) a partir de {events} evento(s).</p><p className="mt-1 text-xs text-muted">Este score serve somente para análise e relatórios.</p></div></div>
      <form action={saveExtensionAction}><input type="hidden" name="resource_type" value="behavior_recalculate" /><input type="hidden" name="return_to" value="/admin/comportamento" /><PendingSubmitButton pendingLabel="Atualizando…" icon={<RefreshCw size={16} />}>Atualizar dados</PendingSubmitButton></form>
    </Card>

    <section className="grid gap-3">
      <h2 className="text-lg font-black text-secondary">Participantes</h2>
      {workspace.behavior_scores.map((score) => {
        const scoreDimensions = dimensions(score.dimensions);
        return <Card key={text(score.id)} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-ink">{text(score.preferred_name) || text(score.legal_name) || text(score.email_normalized)}</h3><p className="text-xs text-muted">{number(score.event_count)} evento(s) registrados</p></div><div className="flex items-center gap-3"><strong className="text-2xl text-secondary">{number(score.total_score).toFixed(0)}</strong><StatusPill tone={number(score.confidence) >= 0.65 ? "success" : "warning"}>{number(score.confidence) >= 0.65 ? "Boa cobertura" : "Poucos dados"}</StatusPill></div></div>
          <details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Ver detalhes</summary><div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">{scoreDimensions.map(([name,value]) => <div key={name} className="rounded-xl bg-surface-muted p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold capitalize text-muted">{name.replaceAll("_"," ")}</span><strong className="text-secondary">{value.toFixed(0)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0,Math.min(100,value))}%` }} /></div></div>)}</div></details>
        </Card>;
      })}
      {workspace.behavior_scores.length === 0 ? <Card><p className="text-sm text-muted">Ainda não há dados suficientes. Use “Atualizar dados” depois que os participantes começarem a usar a plataforma.</p></Card> : null}
    </section>
  </div>;
}
