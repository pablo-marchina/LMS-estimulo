import Link from "next/link";
import { CheckCircle2, Crown, Gift, History, ImageIcon, LockKeyhole, Medal, Sparkles, Trophy } from "lucide-react";
import { performExtensionAction } from "@/app/empreendedor/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { ParticipantPointRule, PointHistoryEntry, RankingEntry } from "@/lib/engagement/contracts";
import type { JsonRecord } from "@/lib/extensions/runtime";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const statusLabels: Record<string, string> = {
  pending: "Pedido recebido",
  approved: "Aprovada",
  preparing: "Em preparação",
  sent: "Enviada",
  available: "Disponível",
  delivered: "Concluída",
  cancelled: "Cancelada",
};

const typeLabels: Record<string, string> = {
  digital: "Digital",
  physical: "Produto",
  experience: "Experiência",
  service: "Serviço",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Sao_Paulo",
});

const frequencyLabels: Record<ParticipantPointRule["frequency"], string> = {
  once: "uma única vez por participante",
  per_activity: "uma vez por aula",
  per_assessment: "uma vez por avaliação",
  per_certificate: "uma vez por certificado confirmado",
  per_path: "uma vez por trilha",
  per_journey: "uma vez por jornada",
  daily: "até o limite configurado por dia",
  weekly: "até o limite configurado por semana",
  unlimited: "sempre que a ação elegível acontecer",
};

type RewardsWorkspace = {
  reward_balance: number;
  catalog: JsonRecord[];
  redemptions: JsonRecord[];
};

export function RewardsExperience({ rewards, ranking, ownRank, pointHistory, pointRules, activeTab }: {
  rewards: RewardsWorkspace;
  ranking: RankingEntry[];
  ownRank: { position: number; points: number } | null;
  pointHistory: PointHistoryEntry[];
  pointRules: ParticipantPointRule[];
  activeTab: "recompensas" | "como-conseguir-pontos" | "historico" | "ranking";
}) {
  const nextReward = rewards.catalog
    .slice()
    .sort((a, b) => number(a.cost_points) - number(b.cost_points))
    .find((reward) => number(reward.cost_points) > rewards.reward_balance);
  const nextCost = nextReward ? number(nextReward.cost_points) : 0;
  const progress = nextCost > 0 ? Math.min(100, Math.round((rewards.reward_balance / nextCost) * 100)) : 100;

  return <div className="grid gap-8">
    <section className="relative max-h-[40vh] min-h-[280px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-active to-secondary p-6 text-white shadow-xl sm:p-8">
      <Sparkles className="absolute right-6 top-5 text-white/25" size={72} aria-hidden="true" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[.14em] text-white/75"><Crown size={18} /> Central de recompensas</div>
          <h1 className="display-font mt-3 text-4xl sm:text-5xl">Transforme seu progresso em conquistas</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">Os pontos que você conquista já ficam disponíveis automaticamente para resgatar recompensas. Não é necessário converter nada.</p>
          <div className="mt-5"><Link href="/empreendedor/recompensas?tab=como-conseguir-pontos" className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-primary shadow-sm">Como conseguir pontos</Link></div>
        </div>
        <div className="grid min-w-52 gap-3 rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur">
          <div><p className="text-xs font-bold uppercase tracking-wide text-white/70">Seu saldo</p><p className="display-font mt-1 text-5xl">{rewards.reward_balance}</p><p className="text-sm text-white/75">pontos disponíveis</p></div>
          <div className="border-t border-white/20 pt-3"><p className="text-xs text-white/65">Ranking de aprendizagem</p><p className="mt-1 font-black">{ownRank ? `#${ownRank.position} · ${ownRank.points} pontos` : "Ainda sem posição"}</p></div>
        </div>
      </div>
      {nextReward ? <div className="relative mt-6 rounded-2xl bg-black/15 p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Próximo objetivo: <strong>{text(nextReward.name)}</strong></span><span>{Math.max(0, nextCost - rewards.reward_balance)} pontos restantes</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div></div> : null}
    </section>

    <nav aria-label="Abas da central de recompensas" className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-sm">
      {[
        ["recompensas", "Recompensas"],
        ["como-conseguir-pontos", "Como conseguir pontos"],
        ["historico", "Histórico"],
        ["ranking", "Ranking"],
      ].map(([tab, label]) => <Link key={tab} href={tab === "recompensas" ? "/empreendedor/recompensas" : `/empreendedor/recompensas?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined} className={`inline-flex min-h-11 min-w-fit flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold ${activeTab === tab ? "bg-primary text-white" : "text-secondary hover:bg-primary-soft hover:text-primary"}`}>{label}</Link>)}
    </nav>

    {activeTab === "recompensas" ? <section id="catalogo" className="grid scroll-mt-24 gap-4">
      <div className="flex items-end justify-between gap-4"><div><p className="brand-kicker">Escolha sua próxima conquista</p><h2 className="display-font mt-1 text-3xl text-secondary">Recompensas disponíveis</h2></div><Trophy className="hidden text-warning sm:block" size={38} /></div>
      {rewards.catalog.length === 0 ? <Card><p className="text-sm text-muted">Novas recompensas aparecerão aqui em breve.</p></Card> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{rewards.catalog.map((reward) => <RewardCard key={text(reward.id)} reward={reward} balance={rewards.reward_balance} />)}</div>}
    </section> : null}

    {activeTab === "como-conseguir-pontos" ? <PointsTable pointRules={pointRules} /> : null}

    {activeTab === "historico" ? <section id="historico" className="grid scroll-mt-24 gap-5 xl:grid-cols-2">
      <Card><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><History size={20} /></span><div><h2 className="font-black text-secondary">Histórico de pontuação</h2><p className="text-sm text-muted">Veja como seus pontos de aprendizagem foram acumulados.</p></div></div><div className="mt-5 grid gap-3">{pointHistory.length ? pointHistory.map((entry) => <article key={entry.id} className="flex items-center gap-4 rounded-xl border border-border p-4"><span className={`w-16 shrink-0 text-right text-sm font-black tabular-nums ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>{entry.amount >= 0 ? "+" : ""}{entry.amount}</span><div><h3 className="font-bold text-ink">{entry.reason}</h3><time dateTime={entry.occurred_at} className="block text-xs text-muted">{dateFormatter.format(new Date(entry.occurred_at))}</time></div></article>) : <p className="text-sm text-muted">As ações elegíveis aparecerão neste histórico.</p>}</div></Card>
      <Card><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Gift size={20} /></span><div><h2 className="font-black text-secondary">Minha jornada de resgates</h2><p className="text-sm text-muted">Acompanhe cada etapa até a recompensa chegar.</p></div></div><div className="mt-5 grid gap-3">{rewards.redemptions.map((redemption) => <article key={text(redemption.id)} className="flex gap-3 rounded-xl border border-border p-4"><span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${text(redemption.status) === "delivered" ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}>{text(redemption.status) === "delivered" ? <CheckCircle2 size={18} /> : <Gift size={17} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{text(redemption.reward_name)}</h3><p className="text-xs text-muted">{number(redemption.points_spent)} pontos utilizados</p></div><StatusPill tone={text(redemption.status) === "cancelled" ? "warning" : text(redemption.status) === "delivered" ? "success" : "info"}>{statusLabels[text(redemption.status)] ?? "Em andamento"}</StatusPill></div>{text(redemption.cancellation_reason) ? <p className="mt-3 text-sm text-warning">{text(redemption.cancellation_reason)}</p> : null}</div></article>)}{rewards.redemptions.length === 0 ? <p className="text-sm text-muted">Seu primeiro resgate aparecerá aqui.</p> : null}</div></Card>
    </section> : null}

    {activeTab === "ranking" ? <section id="ranking" className="scroll-mt-24" aria-labelledby="ranking-titulo">
      <Card><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning"><Medal size={20} /></span><div><h2 id="ranking-titulo" className="font-black text-secondary">Ranking de pontos</h2><p className="text-sm text-muted">Participantes são identificados por pseudônimo para preservar a privacidade.</p></div></div>{ranking.length ? <ol className="mt-5 grid gap-2">{ranking.map((entry) => <li key={`${entry.position}:${entry.participant}`} className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${entry.is_current ? "border-primary/35 bg-primary-soft" : "border-border bg-surface"}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white">{entry.position}</span><strong className="flex-1 font-semibold text-ink">{entry.participant}</strong><span className="text-sm font-bold text-muted">{entry.points} pontos</span></li>)}</ol> : <EmptyState title="Ranking ainda não disponível" tone="info" className="mt-5">O ranking aparece quando há pontos registrados na sua organização.</EmptyState>}</Card>
    </section> : null}
  </div>;
}

function PointsTable({ pointRules }: { pointRules: ParticipantPointRule[] }) {
  return <section className="grid gap-4" aria-labelledby="como-conseguir-pontos-titulo">
    <div><p className="brand-kicker">Regras transparentes</p><h2 id="como-conseguir-pontos-titulo" className="display-font mt-1 text-3xl text-secondary">Como conseguir pontos</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Cada regra define qual ação gera pontos, quantos pontos são concedidos e com que frequência a mesma ação pode pontuar. Por exemplo, “uma vez por aula” permite uma concessão para cada aula diferente; “uma vez por certificado” usa cada certificado confirmado como uma referência própria.</p></div>
    <Card className="overflow-hidden p-0">{pointRules.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface-muted text-secondary"><tr><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3 text-right">Pontos</th><th className="px-4 py-3">Frequência</th></tr></thead><tbody className="divide-y divide-border">{pointRules.map((rule) => <tr key={rule.definition_id}><td className="px-4 py-3 font-bold text-ink">{rule.name}</td><td className="px-4 py-3 text-muted">{rule.description}</td><td className="px-4 py-3 text-right text-lg font-black text-primary">+{rule.amount}</td><td className="px-4 py-3 text-muted">{frequencyLabels[rule.frequency] ?? rule.frequency}</td></tr>)}</tbody></table></div> : <EmptyState title="Nenhuma regra de pontuação ativa" tone="info">As ações configuradas pelo administrador aparecerão aqui.</EmptyState>}</Card>
  </section>;
}

function RewardCard({ reward, balance }: { reward: JsonRecord; balance: number }) {
  const cost = number(reward.cost_points);
  const unlocked = balance >= cost;
  const missing = Math.max(0, cost - balance);
  const progress = cost > 0 ? Math.min(100, Math.round((balance / cost) * 100)) : 100;
  const imageFileObjectId = text(reward.image_file_object_id);

  return <Card className={`flex flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-xl ${unlocked ? "ring-1 ring-primary/15" : ""}`}>
    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-soft to-surface-muted">{imageFileObjectId ? <img src={`/api/rewards/${text(reward.id)}/image`} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-primary/45"><ImageIcon size={48} aria-hidden="true" /></div>}<span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-muted shadow-sm">{typeLabels[text(reward.reward_type)] ?? "Recompensa"}</span></div>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-3"><span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${unlocked ? "bg-primary text-white shadow-lg" : "bg-surface-muted text-muted"}`}>{unlocked ? <Gift size={24} /> : <LockKeyhole size={22} />}</span></div>
      <h3 className="mt-4 text-xl font-black text-ink">{text(reward.name)}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{text(reward.description)}</p>
      <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Custo</p><p className="display-font text-3xl text-secondary">{cost}</p></div><span className={`text-xs font-bold ${unlocked ? "text-success" : "text-muted"}`}>{unlocked ? "Pronta para resgatar" : `Faltam ${missing}`}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
      <details className="mt-4 rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-semibold text-secondary">Ver detalhes</summary><div className="border-t border-border p-3 text-sm whitespace-pre-wrap text-muted">{text(reward.regulation)}</div></details>
      <form action={performExtensionAction} className="mt-4 grid gap-3"><input type="hidden" name="action_type" value="reward_redeem" /><input type="hidden" name="return_to" value="/empreendedor/recompensas" /><input type="hidden" name="reward_id" value={text(reward.id)} /><input type="hidden" name="json_fields" value="fulfillment_details" /><input type="hidden" name="fulfillment_details" value="{}" /><PendingSubmitButton pendingLabel="Solicitando…" disabled={!unlocked}>{unlocked ? "Resgatar recompensa" : `Junte mais ${missing} pontos`}</PendingSubmitButton></form>
    </div>
  </Card>;
}
