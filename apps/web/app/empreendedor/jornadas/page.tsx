import { randomUUID } from "node:crypto";
import { Compass } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";

export default async function JornadasCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const journeys = await journeyRuntime.listEligibleJourneys(auth.identity.user_account_id);
  const matched = journeys.filter((journey: EligibleJourney) => !journey.open_to_all);
  const open = journeys.filter((journey: EligibleJourney) => journey.open_to_all);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Capacitação" title="Jornadas disponíveis" description="Escolha uma jornada para começar. Você pode entrar em mais de uma." />

      {query.erro ? <StatusPanel title="Não foi possível entrar nesta jornada" tone="warning"><p>Tente novamente em instantes.</p></StatusPanel> : null}

      {journeys.length === 0 ? (
        <EmptyState icon={<Compass size={24} />} title="Nenhuma jornada disponível agora" tone="info" className="mt-8">
          Novas jornadas aparecem aqui assim que forem publicadas.
        </EmptyState>
      ) : null}

      {matched.length ? (
        <section className="mt-8 grid gap-4" aria-labelledby="jornadas-arquetipo-titulo">
          <h2 id="jornadas-arquetipo-titulo" className="text-xl font-black text-secondary">Jornadas para o seu perfil</h2>
          <JourneyGrid journeys={matched} />
        </section>
      ) : null}

      {open.length ? (
        <section className="mt-8 grid gap-4" aria-labelledby="jornadas-abertas-titulo">
          <h2 id="jornadas-abertas-titulo" className="text-xl font-black text-secondary">Jornadas abertas para todos</h2>
          <JourneyGrid journeys={open} />
        </section>
      ) : null}
    </div>
  );
}

function JourneyGrid({ journeys }: { journeys: EligibleJourney[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {journeys.map((journey) => (
        <Card key={journey.journey_version_id} className="flex flex-col">
          <h3 className="font-bold text-secondary">{journey.title}</h3>
          {journey.description ? <p className="mt-2 text-sm text-muted">{journey.description}</p> : null}
          <form action={selfEnrollAction} className="mt-auto pt-4">
            <input type="hidden" name="journey_version_id" value={journey.journey_version_id} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <Button type="submit" size="sm">Entrar nesta jornada</Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
