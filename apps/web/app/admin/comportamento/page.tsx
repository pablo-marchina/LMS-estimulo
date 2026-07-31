import { Calculator, Database, ShieldCheck } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
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

const dimensions = [
  ["Engajamento", "2,5 pontos por evento comportamental", "eventos × 2,5"],
  ["Consistência", "8 pontos por dia diferente com atividade", "dias ativos × 8"],
  ["Profundidade", "5 pontos por visualização de página, conteúdo, vídeo ou biblioteca", "eventos de profundidade × 5"],
  ["Conclusão", "12 pontos por conteúdo, atividade, entrega ou diagnóstico concluído", "conclusões × 12"],
  ["Autonomia", "7 pontos por busca ou abertura espontânea de biblioteca, B2B ou recompensa", "ações autônomas × 7"],
  ["Qualidade", "média das notas finais das entregas corrigidas", "média de 0 a 100"],
  ["Evolução", "8 pontos por conclusão registrada", "conclusões × 8"],
  ["Frequência de retorno", "15 pontos por semana diferente com atividade", "semanas ativas × 15"],
] as const;

export default async function AdminBehaviorPage({ searchParams }: { searchParams: Promise<{ sucesso?: string; erro?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();
  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Análise" title="Comportamento" description="Acompanhe sinais agregados de participação. Este score é somente analítico e nunca muda acesso, recomendações, pontos ou recompensas." />
    {query.sucesso ? <StatusPanel title="Scores recalculados" tone="success">Os valores foram atualizados com os eventos disponíveis até agora.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível recalcular" tone="warning">Nenhum valor anterior foi removido. Tente novamente.</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Calculator size={19} /></span><div><h2 className="text-lg font-black text-secondary">Como o score é calculado</h2><p className="text-sm text-muted">Cada dimensão é calculada de 0 a 100 e limitada nesse teto. O score total é a média simples das oito dimensões, portanto cada uma vale 12,5% do resultado.</p></div></div>
      <div className="grid gap-2 md:grid-cols-2">{dimensions.map(([name, explanation, formula]) => <div key={name} className="rounded-xl border border-border p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-secondary">{name}</strong><code className="rounded bg-surface-muted px-2 py-1 text-[11px] text-primary">{formula}</code></div><p className="mt-2 text-xs leading-5 text-muted">{explanation}. O resultado desta dimensão para em 100.</p></div>)}</div>
      <div className="rounded-xl bg-surface-muted p-4 text-sm text-ink"><p><strong>Fórmula total:</strong> (engajamento + consistência + profundidade + conclusão + autonomia + qualidade + evolução + frequência de retorno) ÷ 8.</p><p className="mt-2"><strong>Confiança:</strong> quantidade de eventos ÷ 30, limitada a 100%. Com 15 eventos a confiança é 50%; com 30 ou mais é 100%. A confiança informa a quantidade de evidência, não aumenta nem reduz o score.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="flex items-start gap-2 rounded-xl bg-info-soft p-3 text-xs leading-5 text-info"><Database size={16} className="mt-0.5 shrink-0" /><p>São usados somente eventos capturados desde a ativação do monitoramento. Não existe preenchimento retroativo.</p></div><div className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-xs leading-5 text-success"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>O participante não vê este score. Ele não interfere na experiência, elegibilidade, navegação, certificado, pontuação ou recompensa.</p></div></div>
    </Card>

    <div className="flex justify-end"><form action={saveExtensionAction}><input type="hidden" name="resource_type" value="behavior_recalculate" /><input type="hidden" name="return_to" value="/admin/comportamento" /><PendingSubmitButton pendingLabel="Recalculando…">Recalcular agora</PendingSubmitButton></form></div>
    <section className="grid gap-3"><h2 className="text-lg font-black text-secondary">Participantes calculados</h2>{workspace.behavior_scores.map((score) => { const dimensionsValue = score.dimensions && typeof score.dimensions === "object" && !Array.isArray(score.dimensions) ? score.dimensions as Record<string,unknown> : {}; return <Card key={text(score.id)}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-ink">{text(score.preferred_name) || text(score.legal_name) || "Participante"}</strong><p className="text-xs text-muted">{number(score.event_count)} eventos · confiança {percent(score.confidence)}</p></div><StatusPill tone={number(score.confidence) >= .7 ? "success" : "warning"}>{number(score.total_score).toFixed(1)} / 100</StatusPill></div><div className="mt-3 grid gap-2 sm:grid-cols-4">{Object.entries(dimensionsValue).map(([key,value]) => <div key={key} className="rounded-lg bg-surface-muted p-2"><span className="block text-[11px] capitalize text-muted">{key.replaceAll("_"," ")}</span><strong className="text-sm text-secondary">{number(value).toFixed(1)}</strong></div>)}</div></Card>; })}{workspace.behavior_scores.length === 0 ? <Card><p className="text-sm text-muted">Ainda não existem scores calculados.</p></Card> : null}</section>
  </div></AppShell>;
}
