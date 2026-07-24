import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";

export default async function ParticipantAchievementsPage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const engagement = await engagementRuntime.participantHub(auth.identity.user_account_id);
  const earned = engagement.rewards.filter((reward) => reward.earned);
  const available = engagement.rewards.filter((reward) => !reward.earned);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Engajamento"
        title="Conquistas"
        description="Selos e certificados que você já conquistou e o que ainda pode conquistar nas suas jornadas."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Resumo de conquistas">
        <MetricTile index={0} label="Conquistadas" value={earned.length} />
        <MetricTile index={1} label="Disponíveis" value={available.length} />
        <MetricTile
          index={2}
          label="Perfil de diagnóstico"
          value={engagement.archetype?.name ?? "Pendente"}
        />
      </section>

      <section className="grid gap-4" aria-labelledby="conquistadas-titulo">
        <h2 id="conquistadas-titulo" className="display-font text-xl text-ink">
          Já conquistadas
        </h2>
        {earned.length === 0 ? (
          <EmptyState title="Nenhuma conquista ainda" tone="info">
            Continue sua jornada para desbloquear as primeiras recompensas.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((reward) => (
              <Card key={`${reward.type}:${reward.version_id}`} className="border-success/30 bg-success-soft/40">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-success text-lg font-bold text-white" aria-hidden="true">
                    {reward.type === "badge" ? "★" : "✓"}
                  </span>
                  <div>
                    <StatusPill tone="success">Conquistado</StatusPill>
                    <h3 className="mt-2 font-semibold text-ink">{reward.title}</h3>
                    <p className="mt-1 text-sm text-muted">{reward.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="disponiveis-titulo">
        <h2 id="disponiveis-titulo" className="display-font text-xl text-ink">
          O que você pode ganhar
        </h2>
        {available.length === 0 ? (
          <EmptyState title="Nenhuma recompensa pendente" tone="success">
            Você já conquistou todas as recompensas disponíveis nas jornadas atribuídas.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((reward) => (
              <Card key={`${reward.type}:${reward.version_id}`}>
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-lg font-bold text-primary" aria-hidden="true">
                    {reward.type === "badge" ? "★" : "✓"}
                  </span>
                  <div>
                    <StatusPill tone="neutral">Disponível</StatusPill>
                    <h3 className="mt-2 font-semibold text-ink">{reward.title}</h3>
                    <p className="mt-1 text-sm text-muted">{reward.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <ButtonLink href="/empreendedor" variant="secondary">
          Voltar ao painel
        </ButtonLink>
        <ButtonLink href="/empreendedor/credenciais" variant="secondary">
          Ver carteira de credenciais
        </ButtonLink>
      </div>
    </div>
  );
}
