import Link from "next/link";
import { CheckCircle2, Gift, History, LockKeyhole, Medal, Trophy } from "lucide-react";
import { performExtensionAction } from "@/app/empreendedor/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { ParticipantPointRule, PointHistoryEntry, RankingEntry } from "@/lib/engagement/contracts";
import type { JsonRecord } from "@/lib/extensions/runtime";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function rewardOrder(reward: JsonRecord) { const configured = Number(record(reward.fulfillment_configuration).display_order); return Number.isFinite(configured) && configured >= 0 ? configured : 100; }

const statusLabels: Record<string, string> = {
  pending: "Pedido recebido", approved: "Aprovada", preparing: "Em preparação", sent: "Enviada",
  available: "Disponível", delivered: "Concluída", cancelled: "Cancelada",
};
const typeLabels: Record<string, string> = { digital: "Digital", physical: "Produto", experience: "Experiência", service: "Serviço" };
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const frequencyLabels: Record<ParticipantPointRule["frequency"], string> = {
  once: "uma única vez por participante", per_activity: "uma vez por aula", per_assessment: "uma vez por avaliação",
  per_certificate: "uma vez por certificado confirmado", per_path: "uma vez por trilha", per_journey: "uma vez por jornada",
  daily: "até o limite configurado por dia", weekly: "até o limite configurado por semana", unlimited: "sempre que a ação elegível acontecer",
};

type RewardsWorkspace = { reward_balance: number; catalog: JsonRecord[]; redemptions: JsonRecord[] };

export function RewardsExperience({ rewards, ranking, pointHistory, pointRules, activeTab }: {
  rewards: RewardsWorkspace;
  ranking: RankingEntry[];
  ownRank: { position: number; points: number } | null;
  pointHistory: PointHistoryEntry[];
  pointRules: ParticipantPointRule[];
  activeTab: "recompensas" | "como-conseguir-pontos" | "historico" | "ranking";
}) {
  const orderedCatalog = [...rewards.catalog].sort((left, right) => rewardOrder(left) - rewardOrder(right) || number(left.cost_points) - number(right.cost_points) || text(left.name).localeCompare(text(right.name), "pt-BR"));

  return <div className="grid gap-7">
    <nav aria-label="Abas da central de recompensas" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-transparent">
      {[["recompensas", "Recompensas"],["como-conseguir-pontos", "Como conseguir pontos"],["historico", "Histórico"],["ranking", "Ranking"]].map(([tab, label]) => <Link key={tab} href={tab === "recompensas" ? "/empreendedor/recompensas" : `/empreendedor/recompensas?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined} className={`inline-flex min-h-11 min-w-fit items-center justify-center border-b-2 px-3 py-2.5 text-sm font-semibold ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary"}`}>{label}</Link>)}
    </nav>

    {activeTab === "recompensas" ? <section id="catalogo" className="grid scroll-mt-24 gap-4">
      <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Escolha sua próxima conquista</p><h2 className="mt-1 text-2xl font-bold text-ink">Recompensas disponíveis</h2><p className="mt-1.5 text-sm text-muted">Saldo disponível: <strong className="text-secondary">{rewards.reward_balance} pontos</strong></p></div><Trophy className="hidden text-primary sm:block" size={30} /></div>
      {orderedCatalog.length === 0 ? <Card><p className="text-sm text-muted">Novas recompensas aparecerão aqui em breve.</p></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{orderedCatalog.map((reward) => <RewardCard key={text(reward.id)} reward={reward} balance={rewards.reward_balance} />)}</div>}
    </section> : null}

    {activeTab === "como-conseguir-pontos" ? <PointsTable pointRules={pointRules} /> : null}

    {activeTab === "historico" ? <section id="historico" className="grid scroll-mt-24 gap-5 xl:grid-cols-2">
      <Card><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><History size={20} /></span><div><h2 className="font-black text-secondary">Histórico de pontuação</h2><p className="text-sm text-muted">Veja como seus pontos de aprendizagem foram acumulados.</p></div></div><div className="mt-5 grid gap-3">{pointHistory.length ? pointHistory.map((entry) => <article key={entry.id} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"><span className={`w-16 shrink-0 text-right text-sm font-black tabular-nums ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>{entry.amount >= 0 ? "+" : ""}{entry.amount}</span><div><h3 className="font-bold text-ink">{entry.reason}</h3><time dateTime={entry.occurred_at} className="block text-xs text-muted">{dateFormatter.format(new Date(entry.occurred_at))}</time></div></article>) : <p className="text-sm text-muted">As ações elegíveis aparecerão neste histórico.</p>}</div></Card>
      <Card><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Gift size={20} /></span><div><h2 className="font-black text-secondary">Minha jornada de resgates</h2><p className="text-sm text-muted">Acompanhe cada etapa até a recompensa chegar.</p></div></div><div className="mt-5 grid gap-3">{rewards.redemptions.map((redemption) => <article key={text(redemption.id)} className="flex gap-3 rounded-xl border border-slate-200 p-4"><span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${text(redemption.status) === "delivered" ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}>{text(redemption.status) === "delivered" ? <CheckCircle2 size={18} /> : <Gift size={17} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{text(redemption.reward_name)}</h3><p className="text-xs text-muted">{number(redemption.points_spent)} pontos utilizados</p></div><StatusPill tone={text(redemption.status) === "cancelled" ? "warning" : text(redemption.status) === "delivered" ? "success" : "info"}>{statusLabels[text(redemption.status)] ?? "Em andamento"}</StatusPill></div>{text(redemption.cancellation_reason) ? <p className="mt-3 text-sm text-warning">{text(redemption.cancellation_reason)}</p> : null}</div></article>)}{rewards.redemptions.length === 0 ? <p className="text-sm text-muted">Seu primeiro resgate aparecerá aqui.</p> : null}</div></Card>
    </section> : null}

    {activeTab === "ranking" ? <section id="ranking" className="scroll-mt-24" aria-labelledby="ranking-titulo">
      <Card><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning"><Medal size={20} /></span><div><h2 id="ranking-titulo" className="font-black text-secondary">Ranking de pontos</h2><p className="text-sm text-muted">Participantes são identificados por pseudônimo para preservar a privacidade.</p></div></div>{ranking.length ? <ol className="mt-5 grid gap-2">{ranking.map((entry) => <li key={`${entry.position}:${entry.participant}`} className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${entry.is_current ? "border-primary/35 bg-primary-soft" : "border-slate-200 bg-white"}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white">{entry.position}</span><strong className="flex-1 font-semibold text-ink">{entry.participant}</strong><span className="text-sm font-bold text-muted">{entry.points} pontos</span></li>)}</ol> : <EmptyState title="Ranking ainda não disponível" tone="info" className="mt-5">O ranking aparece quando há pontos registrados na sua organização.</EmptyState>}</Card>
    </section> : null}
  </div>;
}

function PointsTable({ pointRules }: { pointRules: ParticipantPointRule[] }) {
  return <section className="grid gap-4" aria-labelledby="como-conseguir-pontos-titulo">
    <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Regras transparentes</p><h2 id="como-conseguir-pontos-titulo" className="mt-1 text-2xl font-bold text-ink">Como conseguir pontos</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Cada regra define qual ação gera pontos, quantos pontos são concedidos e com que frequência a mesma ação pode pontuar. Por exemplo, “uma vez por aula” permite uma concessão para cada aula diferente; “uma vez por certificado” usa cada certificado confirmado como uma referência própria.</p></div>
    <Card className="overflow-hidden p-0">{pointRules.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-secondary"><tr><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3 text-right">Pontos</th><th className="px-4 py-3">Frequência</th></tr></thead><tbody className="divide-y divide-slate-200">{pointRules.map((rule) => <tr key={rule.definition_id}><td className="px-4 py-3 font-bold text-ink">{rule.name}</td><td className="px-4 py-3 text-muted">{rule.description}</td><td className="px-4 py-3 text-right text-lg font-black text-primary">+{rule.amount}</td><td className="px-4 py-3 text-muted">{frequencyLabels[rule.frequency] ?? rule.frequency}</td></tr>)}</tbody></table></div> : <EmptyState title="Nenhuma regra de pontuação ativa" tone="info">As ações configuradas pelo administrador aparecerão aqui.</EmptyState>}</Card>
  </section>;
}

function RewardDescription({ description }: { description: string }) {
  if (!description) return null;
  return (
    <details className="group mt-2 text-sm leading-6 text-muted">
      <summary className="cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-4 group-open:hidden">{description}</span>
        <span className="mt-1 inline-block text-xs font-bold text-primary group-open:hidden">Ler mais…</span>
        <span className="hidden text-xs font-bold text-primary group-open:inline">Ler menos</span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap">{description}</p>
    </details>
  );
}

function RewardCard({ reward, balance }: { reward: JsonRecord; balance: number }) {
  const cost = number(reward.cost_points);
  const unlocked = balance >= cost;
  const missing = Math.max(0, cost - balance);
  const progress = cost > 0 ? Math.min(100, Math.round((balance / cost) * 100)) : 100;
  const imageFileObjectId = text(reward.image_file_object_id);
  const stock = reward.stock_quantity === null || reward.stock_quantity === undefined ? null : number(reward.stock_quantity);

  return <Card className={`flex flex-col overflow-hidden p-0 ${unlocked ? "ring-1 ring-primary/10" : ""}`}>
    {imageFileObjectId ? <div className="relative aspect-[16/6] overflow-hidden bg-slate-50"><img src={`/api/rewards/${text(reward.id)}/image`} alt="" loading="lazy" decoding="async" className="size-full object-cover" /></div> : <div className="h-1.5 bg-primary/80" aria-hidden="true" />}
    <div className="flex flex-1 flex-col p-4">
      <div className="flex items-start justify-between gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-md ${unlocked ? "bg-primary-soft text-primary" : "bg-slate-100 text-muted"}`}>{unlocked ? <Gift size={19} /> : <LockKeyhole size={18} />}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-muted">{typeLabels[text(reward.reward_type)] ?? "Recompensa"}</span></div>
      <h3 className="mt-3 text-lg font-bold text-ink">{text(reward.name)}</h3>
      <p className="mt-1 text-xs font-semibold text-muted">{stock === null ? "Disponibilidade contínua" : `${stock} ${stock === 1 ? "disponível" : "disponíveis"}`}</p>
      <div className="flex-1"><RewardDescription description={text(reward.description)} /></div>
      <div className="mt-4 flex items-end justify-between gap-3"><p className="text-xl font-bold text-secondary">{cost} pontos</p><span className={`text-xs font-bold ${unlocked ? "text-success" : "text-muted"}`}>{unlocked ? "Pronta para resgatar" : `Faltam ${missing}`}</span></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
      <details className="mt-3 rounded-lg border border-slate-200"><summary className="cursor-pointer p-3 text-sm font-semibold text-secondary">Ver regras de resgate</summary><div className="border-t border-slate-200 p-3 text-sm whitespace-pre-wrap text-muted">{text(reward.regulation)}</div></details>
      <form action={performExtensionAction} className="mt-3 grid gap-3"><input type="hidden" name="action_type" value="reward_redeem" /><input type="hidden" name="return_to" value="/empreendedor/recompensas" /><input type="hidden" name="reward_id" value={text(reward.id)} /><input type="hidden" name="json_fields" value="fulfillment_details" /><input type="hidden" name="fulfillment_details" value="{}" /><PendingSubmitButton pendingLabel="Solicitando…" disabled={!unlocked}>{unlocked ? "Resgatar recompensa" : `Junte mais ${missing} pontos`}</PendingSubmitButton></form>
    </div>
  </Card>;
}
