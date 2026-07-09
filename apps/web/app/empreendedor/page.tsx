import Link from "next/link";
import { randomUUID } from "node:crypto";
import { startJourneyAction } from "@/app/actions/e14";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { e14 } from "@/lib/e14/rpc";
import { participantNextHref, statusLabel } from "@/lib/e14/navigation";

export default async function ParticipantHome() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  if (!auth.identity.entrepreneur_id) return <StatusPanel title="Perfil empreendedor não disponível" tone="warning"><p>A conta está autenticada, mas ainda não possui um perfil empreendedor ativo.</p></StatusPanel>;

  const data = await e14.listParticipantJourneys(auth.identity.user_account_id);
  return (
    <>
      <header className="page-heading"><p className="eyebrow">Seu desenvolvimento</p><h1>Jornadas disponíveis</h1><p>Continue do ponto certo. A plataforma usa o estado real de cada jornada, sem progresso calculado localmente.</p></header>
      {data.journeys.length === 0 ? <StatusPanel title="Nenhuma jornada disponível" tone="info"><p>Quando uma jornada for atribuída ao seu perfil, ela aparecerá aqui.</p></StatusPanel> : (
        <div className="card-grid">
          {data.journeys.map((journey) => (
            <article className="card" key={journey.journey_instance_id}>
              <div className="card-meta"><span className="status-pill">{statusLabel(journey.journey_status)}</span><span>Versão {journey.journey_version_number}</span></div>
              <h2>{journey.journey_title ?? journey.journey_code}</h2>
              {journey.journey_description ? <p>{journey.journey_description}</p> : null}
              <ProgressMeter value={journey.progress} label="Progresso da jornada" />
              {journey.journey_status === "available" ? (
                <form action={startJourneyAction}>
                  <input type="hidden" name="journey_instance_id" value={journey.journey_instance_id} />
                  <input type="hidden" name="aggregate_version" value={journey.journey_aggregate_version} />
                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                  <button className="button button--primary" type="submit">Começar jornada</button>
                </form>
              ) : <Link className="button button--primary" href={participantNextHref(journey)}>Continuar</Link>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
