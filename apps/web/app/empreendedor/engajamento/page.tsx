import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const frequencyLabel: Record<string, string> = {
  once: "uma única vez",
  per_activity: "uma vez por aula",
  per_assessment: "uma vez por avaliação",
  per_path: "uma vez por trilha",
  per_journey: "uma vez por jornada",
  daily: "por dia",
  weekly: "por semana",
  unlimited: "sempre que acontecer",
};

export default async function ParticipantEngagementPage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const [engagement, pointRules] = await Promise.all([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantPointRules(auth.identity.user_account_id).catch(() => ({ point_rules: [] })),
  ]);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Seu progresso" title="Pontuação" description="Veja como ganhar pontos, acompanhe seu histórico e sua posição no ranking. Esses dados refletem aprendizagem e não afetam crédito." />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Resumo de pontuação">
        <MetricTile index={0} label="Pontos" value={engagement.own_rank?.points ?? 0} />
        <MetricTile index={1} label="Posição" value={engagement.own_rank ? `#${engagement.own_rank.position}` : "—"} />
        <MetricTile index={2} label="Ações pontuadas" value={engagement.point_history.length} />
      </section>

      <section className="grid gap-4" aria-labelledby="como-ganhar-pontos">
        <div><h2 id="como-ganhar-pontos" className="display-font text-2xl text-ink">Como ganhar pontos</h2><p className="mt-1 text-sm text-muted">A tabela é atualizada automaticamente quando a Estímulo publica uma nova regra funcional.</p></div>
        {pointRules.point_rules.length === 0 ? <EmptyState title="Nenhuma regra de pontuação publicada" tone="info">Quando a equipe definir ações elegíveis, elas aparecerão aqui.</EmptyState> : (
          <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead className="bg-primary-soft text-ink"><tr><th className="px-5 py-3 font-semibold">Ação</th><th className="px-5 py-3 font-semibold">Pontos</th><th className="px-5 py-3 font-semibold">Frequência</th></tr></thead><tbody>{pointRules.point_rules.map((rule) => <tr key={rule.definition_id} className="border-t border-border bg-white align-top"><td className="px-5 py-4"><strong className="block font-semibold text-ink">{rule.name}</strong>{rule.description ? <span className="mt-1 block max-w-xl text-sm leading-5 text-muted">{rule.description}</span> : null}</td><td className="px-5 py-4 font-bold tabular-nums text-primary">+{rule.amount}</td><td className="px-5 py-4 text-muted">{frequencyLabel[rule.frequency] ?? rule.frequency}{rule.maximum_awards > 1 ? ` · até ${rule.maximum_awards} vezes` : ""}</td></tr>)}</tbody></table></div></Card>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="historico-titulo">
        <h2 id="historico-titulo" className="display-font text-2xl text-ink">Histórico de pontuação</h2>
        {engagement.point_history.length === 0 ? <EmptyState title="Nenhum ponto registrado" tone="info">As ações elegíveis aparecerão neste histórico.</EmptyState> : <ol className="grid gap-2">{engagement.point_history.map((entry) => <li key={entry.id} className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3"><span className={`w-16 shrink-0 text-right text-sm font-bold tabular-nums ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>{entry.amount >= 0 ? "+" : ""}{entry.amount}</span><div><strong className="font-semibold text-ink">{entry.reason}</strong><time dateTime={entry.occurred_at} className="block text-xs text-muted">{dateFormatter.format(new Date(entry.occurred_at))}</time></div></li>)}</ol>}
      </section>

      <section className="grid gap-4" aria-labelledby="ranking-titulo">
        <div><h2 id="ranking-titulo" className="display-font text-2xl text-ink">Ranking</h2><p className="mt-1 text-sm text-muted">Sua posição considera somente pontos de aprendizagem. Outros participantes aparecem por pseudônimo.</p></div>
        {engagement.ranking.length === 0 ? <EmptyState title="Ranking ainda não disponível" tone="info">O ranking aparece quando há pontos registrados.</EmptyState> : <ol className="grid gap-2">{engagement.ranking.map((entry) => <li key={`${entry.position}:${entry.participant}`} className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${entry.is_current ? "border-border-strong bg-primary-soft" : "border-border bg-surface"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{entry.position}</span><strong className="flex-1 font-semibold text-ink">{entry.participant}</strong><span className="text-sm font-medium text-muted">{entry.points} pontos</span></li>)}</ol>}
      </section>

      <div className="no-print border-t border-border pt-6"><ButtonLink href="/empreendedor" variant="secondary">Voltar ao painel</ButtonLink></div>
    </div>
  );
}
