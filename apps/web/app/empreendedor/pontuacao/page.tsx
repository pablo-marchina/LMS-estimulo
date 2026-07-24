import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Sao_Paulo"
});

export default async function ParticipantScorePage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const engagement = await engagementRuntime.participantHub(auth.identity.user_account_id);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Engajamento"
        title="Pontuação"
        description="Pontos de aprendizagem acumulados nas suas jornadas e o ranking entre participantes. Isso não afeta crédito."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Resumo de pontuação">
        <MetricTile index={0} label="Pontos acumulados" value={engagement.own_rank?.points ?? 0} />
        <MetricTile
          index={1}
          label="Posição no ranking"
          value={engagement.own_rank ? `#${engagement.own_rank.position}` : "—"}
        />
        <MetricTile index={2} label="Lançamentos registrados" value={engagement.point_history.length} />
      </section>

      <section className="grid gap-4" aria-labelledby="ranking-completo-titulo">
        <h2 id="ranking-completo-titulo" className="display-font text-xl text-ink">
          Ranking de pontos
        </h2>
        {engagement.ranking.length === 0 ? (
          <EmptyState title="Ranking ainda não disponível" tone="info">
            O ranking aparece quando há pontos registrados na sua organização.
          </EmptyState>
        ) : (
          <ol className="grid gap-2">
            {engagement.ranking.map((entry) => (
              <li
                key={`${entry.position}:${entry.participant}`}
                className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
                  entry.is_current ? "border-border-strong bg-primary-soft" : "border-border bg-surface"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                  {entry.position}
                </span>
                <strong className="flex-1 font-semibold text-ink">{entry.participant}</strong>
                <span className="text-sm font-medium text-muted">{entry.points} pontos</span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-sm text-muted">
          Outros participantes são exibidos por pseudônimo. O ranking mede somente pontos de aprendizagem e não afeta crédito.
        </p>
      </section>

      <section className="grid gap-4" aria-labelledby="historico-completo-titulo">
        <h2 id="historico-completo-titulo" className="display-font text-xl text-ink">
          Histórico de pontuação
        </h2>
        {engagement.point_history.length === 0 ? (
          <EmptyState title="Nenhum ponto registrado" tone="info">
            As ações elegíveis aparecerão neste histórico.
          </EmptyState>
        ) : (
          <ol className="grid gap-2">
            {engagement.point_history.map((entry) => (
              <li key={entry.id} className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
                <span
                  className={`w-16 shrink-0 text-right text-sm font-bold tabular-nums ${
                    entry.amount >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount}
                </span>
                <div>
                  <strong className="font-semibold text-ink">{entry.reason}</strong>
                  <time dateTime={entry.occurred_at} className="block text-xs text-muted">
                    {dateFormatter.format(new Date(entry.occurred_at))}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="no-print flex items-center justify-between gap-3 border-t border-border pt-6">
        <ButtonLink href="/empreendedor" variant="secondary">
          Voltar ao painel
        </ButtonLink>
      </div>
    </div>
  );
}
