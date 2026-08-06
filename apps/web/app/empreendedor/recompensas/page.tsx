import { RewardsExperience } from "@/app/empreendedor/recompensas/rewards-experience";
import { StatusPanel } from "@/components/status-panel";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

export default async function ParticipantRewardsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string; tab?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const [workspace, engagement, pointRules] = await Promise.all([
    extensionsRuntime.participantWorkspace(auth.identity.user_account_id),
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantPointRules(auth.identity.user_account_id),
  ]);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-5 py-8 lg:px-9 lg:py-10">
      {query.sucesso ? <StatusPanel title="Conquista atualizada" tone="success">Seu saldo e histórico já foram atualizados.</StatusPanel> : null}
      {query.erro ? <StatusPanel title="Não foi possível concluir" tone="warning">Confira seu saldo e tente novamente.</StatusPanel> : null}
      <RewardsExperience
        rewards={workspace.rewards}
        ranking={engagement.ranking}
        ownRank={engagement.own_rank}
        pointHistory={engagement.point_history}
        pointRules={pointRules.point_rules}
        activeTab={query.tab === "como-conseguir-pontos" ? "como-conseguir-pontos" : query.tab === "historico" ? "historico" : query.tab === "ranking" ? "ranking" : "recompensas"}
      />
    </div>
  );
}
