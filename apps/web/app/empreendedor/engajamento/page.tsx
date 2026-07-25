import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const submissionDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" });

const reviewLabel: Record<string, string> = { accepted: "Aprovada", rejected: "Recusada" };
const statusTone: Record<string, "success" | "warning" | "info" | "neutral"> = { upload_pending: "warning", processing: "info", available: "success", awaiting_review: "info" };
const statusLabelMap: Record<string, string> = { upload_pending: "Envio pendente", processing: "Em verificação", available: "Disponível", awaiting_review: "Aguardando revisão" };
const frequencyLabel: Record<string, string> = {
  once: "uma única vez",
  per_activity: "uma vez por aula",
  per_assessment: "uma vez por avaliação",
  daily: "por dia",
  weekly: "por semana",
  unlimited: "sempre que acontecer",
};

export default async function ParticipantEngagementPage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const [engagement, pointRules, participantJourneys] = await Promise.all([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantPointRules(auth.identity.user_account_id).catch(() => ({ point_rules: [] })),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
  ]);

  const earned = engagement.rewards.filter((reward) => reward.earned);
  const available = engagement.rewards.filter((reward) => !reward.earned);
  const journeysWithActivity = participantJourneys.journeys.filter((journey) => journey.s?.step_instance_id);
  const submissionGroups = await Promise.all(
    journeysWithActivity.map(async (journey) => ({
      journey,
      result: await practiceRuntime.listParticipant(auth.identity.user_account_id, journey.s!.step_instance_id).catch(() => null),
    })),
  );
  const groupsWithSubmissions = submissionGroups.filter((group) => group.result && group.result.submissions.length > 0);
  const totalSubmissions = groupsWithSubmissions.reduce((sum, group) => sum + (group.result?.submissions.length ?? 0), 0);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Seu progresso" title="Pontuação e progresso" description="Veja como ganhar pontos, acompanhe seu histórico, posição e entregas. Esses dados refletem aprendizagem e não afetam crédito." />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo de engajamento">
        <MetricTile index={0} label="Conquistas" value={earned.length} />
        <MetricTile index={1} label="Pontos" value={engagement.own_rank?.points ?? 0} />
        <MetricTile index={2} label="Posição" value={engagement.own_rank ? `#${engagement.own_rank.position}` : "—"} />
        <MetricTile index={3} label="Entregas" value={totalSubmissions} />
      </section>

      <section className="grid gap-4" aria-labelledby="como-ganhar-pontos">
        <div>
          <h2 id="como-ganhar-pontos" className="display-font text-2xl text-ink">Como ganhar pontos</h2>
          <p className="mt-1 text-sm text-muted">A tabela é atualizada automaticamente quando a Estímulo publica uma nova regra.</p>
        </div>
        {pointRules.point_rules.length === 0 ? (
          <EmptyState title="Nenhuma regra de pontuação publicada" tone="info">Quando a equipe definir ações elegíveis, elas aparecerão aqui.</EmptyState>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-primary-soft text-ink"><tr><th className="px-5 py-3 font-semibold">Ação</th><th className="px-5 py-3 font-semibold">Pontos</th><th className="px-5 py-3 font-semibold">Frequência</th></tr></thead>
                <tbody>
                  {pointRules.point_rules.map((rule) => (
                    <tr key={rule.definition_id} className="border-t border-border bg-white">
                      <td className="px-5 py-4 font-semibold text-ink">{rule.name}</td>
                      <td className="px-5 py-4 font-bold tabular-nums text-primary">+{rule.amount}</td>
                      <td className="px-5 py-4 text-muted">{frequencyLabel[rule.frequency] ?? rule.frequency}{rule.maximum_awards > 1 ? ` · até ${rule.maximum_awards} vezes` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="historico-titulo">
        <h2 id="historico-titulo" className="display-font text-2xl text-ink">Histórico de pontuação</h2>
        {engagement.point_history.length === 0 ? <EmptyState title="Nenhum ponto registrado" tone="info">As ações elegíveis aparecerão neste histórico.</EmptyState> : (
          <ol className="grid gap-2">{engagement.point_history.map((entry) => <li key={entry.id} className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3"><span className={`w-16 shrink-0 text-right text-sm font-bold tabular-nums ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>{entry.amount >= 0 ? "+" : ""}{entry.amount}</span><div><strong className="font-semibold text-ink">{entry.reason}</strong><time dateTime={entry.occurred_at} className="block text-xs text-muted">{dateFormatter.format(new Date(entry.occurred_at))}</time></div></li>)}</ol>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="ranking-titulo">
        <div><h2 id="ranking-titulo" className="display-font text-2xl text-ink">Ranking</h2><p className="mt-1 text-sm text-muted">Sua posição considera somente pontos de aprendizagem. Outros participantes aparecem por pseudônimo.</p></div>
        {engagement.ranking.length === 0 ? <EmptyState title="Ranking ainda não disponível" tone="info">O ranking aparece quando há pontos registrados.</EmptyState> : (
          <ol className="grid gap-2">{engagement.ranking.map((entry) => <li key={`${entry.position}:${entry.participant}`} className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${entry.is_current ? "border-border-strong bg-primary-soft" : "border-border bg-surface"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{entry.position}</span><strong className="flex-1 font-semibold text-ink">{entry.participant}</strong><span className="text-sm font-medium text-muted">{entry.points} pontos</span></li>)}</ol>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="conquistas-titulo">
        <h2 id="conquistas-titulo" className="display-font text-2xl text-ink">Conquistas</h2>
        {earned.length === 0 ? <EmptyState title="Nenhuma conquista ainda" tone="info">Continue suas jornadas para desbloquear os primeiros selos e certificados.</EmptyState> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{earned.map((reward) => <Card key={`${reward.type}:${reward.version_id}`} className="border-success/30 bg-success-soft/40"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-success text-lg font-bold text-white" aria-hidden="true">{reward.type === "badge" ? "★" : "✓"}</span><div><StatusPill tone="success">Conquistado</StatusPill><h3 className="mt-2 font-semibold text-ink">{reward.title}</h3><p className="mt-1 text-sm text-muted">{reward.description}</p></div></div></Card>)}</div>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="disponiveis-titulo">
        <h2 id="disponiveis-titulo" className="display-font text-2xl text-ink">O que você pode ganhar</h2>
        {available.length === 0 ? <EmptyState title="Nenhuma recompensa pendente" tone="success">Você já conquistou todas as recompensas disponíveis.</EmptyState> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{available.map((reward) => <Card key={`${reward.type}:${reward.version_id}`}><StatusPill tone="neutral">Disponível</StatusPill><h3 className="mt-3 font-semibold text-ink">{reward.title}</h3><p className="mt-1 text-sm text-muted">{reward.description}</p></Card>)}</div>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="entregas-titulo">
        <div><h2 id="entregas-titulo" className="display-font text-2xl text-ink">Entregas</h2><p className="mt-1 text-sm text-muted">Acompanhe arquivos enviados e o status de revisão de cada atividade prática.</p></div>
        {groupsWithSubmissions.length === 0 ? <EmptyState title="Nenhuma entrega enviada ainda" tone="info">Quando você enviar uma evidência, ela aparecerá aqui.</EmptyState> : groupsWithSubmissions.map(({ journey, result }) => (
          <div key={journey.journey_instance_id} className="grid gap-3"><h3 className="font-semibold text-ink">{journey.journey_title ?? journey.journey_code}</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{result!.submissions.map((submission) => <Card key={submission.id} className="flex flex-col"><div className="mb-3 flex items-center justify-between gap-2"><StatusPill tone={statusTone[submission.status] ?? "neutral"}>{statusLabelMap[submission.status] ?? submission.status}</StatusPill><span className="text-xs text-muted">#{submission.submission_number}</span></div><h4 className="truncate font-semibold text-ink" title={submission.original_filename ?? undefined}>{submission.original_filename ?? "Arquivo enviado"}</h4><p className="mt-1 text-xs text-muted">{submissionDateFormatter.format(new Date(submission.submitted_at))}</p>{submission.review_status ? <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-ink"><strong>{reviewLabel[submission.review_status] ?? submission.review_status}</strong>{submission.review_feedback ? <span className="mt-1 block text-muted">{submission.review_feedback}</span> : null}</p> : <p className="mt-3 text-sm text-muted">Ainda sem retorno da revisão.</p>}</Card>)}</div></div>
        ))}
      </section>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"><ButtonLink href="/empreendedor" variant="secondary">Voltar ao painel</ButtonLink><ButtonLink href="/empreendedor/conquistas" variant="secondary">Ver conquistas</ButtonLink></div>
    </div>
  );
}