import { RewardsExperience } from "@/app/empreendedor/recompensas/rewards-experience";
import { StatusPanel } from "@/components/status-panel";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-5 py-8 lg:px-9 lg:py-10">
      {query.sucesso ? <StatusPanel title="Conquista atualizada" tone="success">Seu saldo e histórico já foram atualizados.</StatusPanel> : null}
      {query.erro ? <StatusPanel title="Não foi possível concluir" tone="warning">Confira seu saldo e tente novamente.</StatusPanel> : null}
      {workspaceResult.status === "rejected" ? <StatusPanel title="Recompensas temporariamente indisponíveis" tone="warning">Não foi possível carregar seu saldo, catálogo e resgates. Os valores zerados abaixo são apenas um estado de segurança e não significam perda de pontos.</StatusPanel> : null}
      {engagementResult.status === "rejected" ? <StatusPanel title="Ranking e histórico temporariamente indisponíveis" tone="warning">Não foi possível consultar seus dados de engajamento agora. Tente recarregar a página.</StatusPanel> : null}
      {pointRulesResult.status === "rejected" ? <StatusPanel title="Regras de pontuação temporariamente indisponíveis" tone="warning">A lista de formas de ganhar pontos não pôde ser carregada neste momento.</StatusPanel> : null}
      <RewardsExperience
        rewards={workspace?.rewards ?? emptyRewards}
        ranking={engagement?.ranking ?? []}
        ownRank={engagement?.own_rank ?? null}
        pointHistory={engagement?.point_history ?? []}
        pointRules={pointRules?.point_rules ?? []}
        activeTab={query.tab === "como-conseguir-pontos" ? "como-conseguir-pontos" : query.tab === "historico" ? "historico" : query.tab === "ranking" ? "ranking" : "recompensas"}
      />
    </div>
  );
}
