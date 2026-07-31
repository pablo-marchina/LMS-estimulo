import { Gift, History, WalletCards } from "lucide-react";
import { performExtensionAction } from "@/app/empreendedor/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
const statusLabels: Record<string,string> = { pending:"Pendente", approved:"Aprovada", preparing:"Em preparação", sent:"Enviada", available:"Disponibilizada", delivered:"Entregue", cancelled:"Cancelada" };

export default async function ParticipantRewardsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const workspace = await extensionsRuntime.participantWorkspace(auth.identity.user_account_id);
  const rewards = workspace.rewards;
  const rateSource = number(rewards.settings.source_points_per_unit) || 1;
  const rateReward = number(rewards.settings.reward_points_per_unit) || 1;

  return <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow="Benefícios" title="Recompensas" description="Converta pontos de engajamento e troque por recompensas disponíveis." />
    {query.sucesso ? <StatusPanel title="Operação concluída" tone="success">Seu saldo e histórico foram atualizados.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível concluir" tone="warning">Código: {query.erro}</StatusPanel> : null}

    <section className="grid gap-4 lg:grid-cols-2">
      <Card className="brand-accent-card after:!hidden">
        <div className="flex items-start gap-3"><WalletCards className="mt-0.5 text-primary" /><div><p className="text-sm font-semibold text-muted">Saldo de recompensa</p><p className="display-font mt-1 text-4xl text-secondary">{rewards.reward_balance}</p></div></div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Engajamento disponível</p><strong className="mt-1 block text-xl text-ink">{rewards.convertible_engagement_points}</strong></div><div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Taxa atual</p><strong className="mt-1 block text-xl text-ink">{rateSource}:{rateReward}</strong></div></div>
      </Card>
      <Card><h2 className="font-black text-secondary">Converter pontos</h2><p className="mt-1 text-sm text-muted">A conversão é definitiva e sempre fica registrada.</p><form action={performExtensionAction} className="mt-5 grid gap-3"><input type="hidden" name="action_type" value="reward_convert" /><input type="hidden" name="return_to" value="/empreendedor/recompensas" /><Label>Pontos de engajamento<Input name="source_points" type="number" min="1" max={rewards.convertible_engagement_points} required /></Label><PendingSubmitButton pendingLabel="Convertendo…" disabled={rewards.convertible_engagement_points < 1}>Converter pontos</PendingSubmitButton></form></Card>
    </section>

    <section className="grid gap-4"><div><p className="brand-kicker">Catálogo</p><h2 className="display-font mt-1 text-2xl text-secondary">Recompensas disponíveis</h2></div>{rewards.catalog.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma recompensa disponível neste momento.</p></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rewards.catalog.map((reward) => <RewardCard key={text(reward.id)} reward={reward} balance={rewards.reward_balance} />)}</div>}</section>

    <Card><div className="flex items-start gap-3"><History className="mt-0.5 text-primary" /><div><h2 className="font-black text-secondary">Meus resgates</h2><p className="text-sm text-muted">Acompanhe aprovação, preparação, envio e entrega.</p></div></div><div className="mt-5 grid gap-3">{rewards.redemptions.map((redemption) => <article key={text(redemption.id)} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{text(redemption.reward_name)}</h3><p className="text-xs text-muted">{number(redemption.points_spent)} pontos</p></div><StatusPill tone={text(redemption.status) === "cancelled" ? "warning" : text(redemption.status) === "delivered" ? "success" : "info"}>{statusLabels[text(redemption.status)] ?? text(redemption.status)}</StatusPill></div>{text(redemption.cancellation_reason) ? <p className="mt-3 text-sm text-warning">Motivo: {text(redemption.cancellation_reason)}</p> : null}</article>)}{rewards.redemptions.length === 0 ? <p className="text-sm text-muted">Você ainda não realizou resgates.</p> : null}</div></Card>
  </div>;
}

function RewardCard({ reward, balance }: { reward: JsonRecord; balance: number }) {
  const cost = number(reward.cost_points);
  return <Card className="flex flex-col"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Gift size={21} /></span><div><h3 className="font-black text-ink">{text(reward.name)}</h3><p className="text-xs uppercase tracking-wide text-muted">{text(reward.reward_type)}</p></div></div><p className="mt-4 flex-1 text-sm text-muted">{text(reward.description)}</p><p className="mt-4 text-2xl font-black text-secondary">{cost} pontos</p><details className="mt-3 rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-semibold text-secondary">Ver regulamento</summary><div className="border-t border-border p-3 text-sm whitespace-pre-wrap text-muted">{text(reward.regulation)}</div></details><form action={performExtensionAction} className="mt-4 grid gap-3"><input type="hidden" name="action_type" value="reward_redeem" /><input type="hidden" name="return_to" value="/empreendedor/recompensas" /><input type="hidden" name="reward_id" value={text(reward.id)} /><input type="hidden" name="json_fields" value="fulfillment_details" /><input type="hidden" name="fulfillment_details" value="{}" /><PendingSubmitButton pendingLabel="Solicitando…" disabled={balance < cost}>Resgatar recompensa</PendingSubmitButton></form></Card>;
}
