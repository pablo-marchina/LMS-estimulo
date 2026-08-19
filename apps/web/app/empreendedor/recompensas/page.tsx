import { WalletCards } from "lucide-react";
import { RewardsExperience } from "@/app/empreendedor/recompensas/rewards-experience";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

const pointFormatter = new Intl.NumberFormat("pt-BR");
const emptyRewards = {
  engagement_points: 0,
  converted_source_points: 0,
  convertible_engagement_points: 0,
  reward_balance: 0,
  settings: {},
  catalog: [],
  redemptions: [],
  ledger: [],
};

const rewardErrorMessages: Record<string, { title: string; message: string }> = {
  REWARD_OUT_OF_STOCK: {
    title: "Recompensa esgotada",
    message: "Essa recompensa não está mais disponível em estoque. Escolha outra opção disponível.",
  },
  REWARD_BALANCE_INSUFFICIENT: {
    title: "Pontos insuficientes",
    message: "Seu saldo de pontos não é suficiente para resgatar esta recompensa.",
  },
  REWARD_USER_LIMIT_REACHED: {
    title: "Limite de resgates atingido",
    message: "Você já atingiu o limite de resgates permitido para esta recompensa.",
  },
  REWARD_NOT_AVAILABLE: {
    title: "Recompensa indisponível",
    message: "Essa recompensa não está disponível para resgate neste momento.",
  },
};

function rewardHasStock(reward: JsonRecord) {
  if (reward.stock_quantity === null || reward.stock_quantity === undefined) return true;
  const stock = Number(reward.stock_quantity);
  return Number.isFinite(stock) && stock > 0;
}

export default async function ParticipantRewardsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string; tab?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const [workspaceResult, engagementResult, pointRulesResult] = await Promise.allSettled([
    extensionsRuntime.participantWorkspace(auth.identity.user_account_id),
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantPointRules(auth.identity.user_account_id),
  ] as const);
  const workspace = workspaceResult.status === "fulfilled" ? workspaceResult.value : null;
  const engagement = engagementResult.status === "fulfilled" ? engagementResult.value : null;
  const pointRules = pointRulesResult.status === "fulfilled" ? pointRulesResult.value : null;
  const rewards = workspace?.rewards ?? emptyRewards;
  const availableRewards = { ...rewards, catalog: rewards.catalog.filter(rewardHasStock) };
  const rewardBalance = rewards.reward_balance;
  const actionError = query.erro
    ? rewardErrorMessages[query.erro] ?? {
      title: "Não foi possível concluir",
      message: "O resgate não pôde ser concluído. Atualize a página e tente novamente.",
    }
    : null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        cmsKey="participant.page.recompensas.header"
        eyebrow="Benefícios"
        title="Recompensas"
        description="Use os pontos conquistados no aprendizado para acessar benefícios disponíveis para você."
        actions={(
          <div className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 shadow-sm" aria-label={`${pointFormatter.format(rewardBalance)} pontos na carteira`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm"><WalletCards size={20} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-muted">Pontos na carteira</p>
              <p className="mt-0.5 text-2xl font-black leading-none tracking-[-.03em] text-primary tabular-nums">{pointFormatter.format(rewardBalance)} <span className="text-xs font-bold tracking-normal text-secondary">pts</span></p>
            </div>
          </div>
        )}
      />
      <div className="grid gap-6">
        {query.sucesso === "reward_redeem" ? (
          <StatusPanel title="Recompensa resgatada com sucesso!" tone="success">
            Seu pedido foi registrado. Seu saldo e o histórico de resgates já foram atualizados.
          </StatusPanel>
        ) : query.sucesso ? (
          <StatusPanel title="Conquista atualizada" tone="success">Seu saldo e histórico já foram atualizados.</StatusPanel>
        ) : null}
        {actionError ? <StatusPanel title={actionError.title} tone="warning">{actionError.message}</StatusPanel> : null}
        {workspaceResult.status === "rejected" ? <StatusPanel title="Recompensas temporariamente indisponíveis" tone="warning">Não foi possível carregar seu saldo, catálogo e resgates. Os valores zerados abaixo são apenas um estado de segurança e não significam perda de pontos.</StatusPanel> : null}
        {engagementResult.status === "rejected" ? <StatusPanel title="Ranking e histórico temporariamente indisponíveis" tone="warning">Não foi possível consultar seus dados de engajamento agora. Tente recarregar a página.</StatusPanel> : null}
        {pointRulesResult.status === "rejected" ? <StatusPanel title="Regras de pontuação temporariamente indisponíveis" tone="warning">A lista de formas de ganhar pontos não pôde ser carregada neste momento.</StatusPanel> : null}
        <RewardsExperience
          rewards={availableRewards}
          ranking={engagement?.ranking ?? []}
          ownRank={engagement?.own_rank ?? null}
          pointHistory={engagement?.point_history ?? []}
          pointRules={pointRules?.point_rules ?? []}
          activeTab={query.tab === "como-conseguir-pontos" ? "como-conseguir-pontos" : query.tab === "historico" ? "historico" : query.tab === "ranking" ? "ranking" : "recompensas"}
        />
      </div>
    </div>
  );
}
