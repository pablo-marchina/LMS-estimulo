import { Calculator, Database, ShieldCheck } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { BehaviorScoreEditor } from "@/components/behavior-score-editor";
import { AppShell } from "@/components/app-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function percent(value: unknown) { return `${Math.round(number(value) * 100)}%`; }

export default async function AdminBehaviorPage({ searchParams }: { searchParams: Promise<{ sucesso?: string; erro?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();

  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Análise" title="Comportamento" description="Defina como as interações coletadas se transformam em score e acompanhe o resultado continuamente." />
    {query.sucesso === "behavior_score_configuration" ? <StatusPanel title="Cálculo atualizado" tone="success">A nova configuração foi validada, salva e aplicada aos participantes.</StatusPanel> : null}
    {query.sucesso === "behavior_recalculate" ? <StatusPanel title="Scores recalculados" tone="success">Os valores foram atualizados com os eventos disponíveis.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">A configuração anterior foi preservada. Revise dimensões, pesos, normalização e faixas.</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Calculator size={19} /></span><div><h2 className="text-lg font-black text-secondary">Contrato do score</h2><p className="text-sm text-muted">Eventos brutos continuam armazenados. A configuração abaixo controla somente a transformação analítica desses dados.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-xl bg-info-soft p-3 text-xs leading-5 text-info"><Database size={16} className="mt-0.5 shrink-0" /><p>Eventos, valores intermediários, configuração utilizada e snapshots ficam prontos para exportação por ETL.</p></div>
        <div className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-xs leading-5 text-success"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>O editor aceita somente métricas e operações permitidas. Nenhum código arbitrário é executado.</p></div>
      </div>
    </Card>

    <BehaviorScoreEditor initialConfiguration={workspace.behavior_score_configuration} />

    <div className="flex justify-end"><form action={saveExtensionAction}><input type="hidden" name="resource_type" value="behavior_recalculate" /><input type="hidden" name="return_to" value="/admin/comportamento" /><PendingSubmitButton pendingLabel="Recalculando…">Recalcular agora</PendingSubmitButton></form></div>

    <section className="grid gap-3">
      <h2 className="text-lg font-black text-secondary">Participantes calculados</h2>
      {workspace.behavior_scores.map((score) => {
        const dimensions = score.dimensions && typeof score.dimensions === "object" && !Array.isArray(score.dimensions) ? score.dimensions as Record<string, unknown> : {};
        return <Card key={text(score.id)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><strong className="text-ink">{text(score.preferred_name) || text(score.legal_name) || "Participante"}</strong><p className="text-xs text-muted">{number(score.event_count)} eventos · confiança {percent(score.confidence)}{text(score.classification) ? ` · ${text(score.classification)}` : ""}</p></div>
            <StatusPill tone={number(score.confidence) >= .7 ? "success" : "warning"}>{number(score.total_score).toFixed(1)} / 100</StatusPill>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(dimensions).map(([key, value]) => {
            const current = Math.min(100, Math.max(0, number(value)));
            return <div key={key} className="rounded-xl bg-surface-muted p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs capitalize text-muted">{key.replaceAll("_", " ")}</span><strong className="text-sm tabular-nums text-secondary">{current.toFixed(1)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${current}%` }} /></div></div>;
          })}</div>
        </Card>;
      })}
      {workspace.behavior_scores.length === 0 ? <Card><p className="text-sm text-muted">Ainda não existem scores calculados.</p></Card> : null}
    </section>
  </div></AppShell>;
}
