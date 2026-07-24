import { randomUUID } from "node:crypto";
import { Bot, Compass, Sparkles } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";

const OPENAI_JOURNEY_VERSION_ID = "a4ffebde-f7de-4a76-af6a-221a2c398dd6";

export default async function JornadasCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const journeys = await journeyRuntime.listEligibleJourneys(auth.identity.user_account_id).catch(() => []);
  const openAI = journeys.find((journey) => journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID || /openai/i.test(journey.title));
  const remaining = journeys.filter((journey) => journey !== openAI);
  const matched = remaining.filter((journey: EligibleJourney) => !journey.open_to_all);
  const open = remaining.filter((journey: EligibleJourney) => journey.open_to_all);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Capacitação" title="Jornadas disponíveis" description="Escolha uma jornada para começar. Você pode entrar em mais de uma." />
      {query.erro ? <StatusPanel title="Não foi possível entrar nesta jornada" tone="warning"><p>Tente novamente em instantes.</p></StatusPanel> : null}

      {openAI ? (
        <section className="brand-hero brand-dots-bg relative mt-8 overflow-hidden rounded-[2rem] p-7 shadow-lg sm:p-10" aria-labelledby="openai-journey-title">
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary"><Sparkles size={14} /> Nova jornada em destaque</span>
              <div className="mt-6 flex items-start gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-md"><Bot size={28} /></span><div><h2 id="openai-journey-title" className="display-font text-3xl text-white sm:text-4xl">{openAI.title}</h2>{openAI.description ? <p className="mt-3 max-w-2xl leading-7 text-white/75">{openAI.description}</p> : null}</div></div>
              <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/75"><span className="rounded-full border border-white/20 px-3 py-1.5">Marketing e Vendas com IA</span><span className="rounded-full border border-white/20 px-3 py-1.5">Gestão com IA</span><span className="rounded-full border border-white/20 px-3 py-1.5">Desenvolvimento com Codex</span></div>
            </div>
            <form action={selfEnrollAction}>
              <input type="hidden" name="journey_version_id" value={openAI.journey_version_id} />
              <input type="hidden" name="idempotency_key" value={randomUUID()} />
              <Button variant="secondary" size="lg" type="submit">Começar jornada OpenAI</Button>
            </form>
          </div>
        </section>
      ) : null}

      {journeys.length === 0 ? <EmptyState icon={<Compass size={24} />} title="Nenhuma jornada disponível agora" tone="info" className="mt-8">Novas jornadas aparecem aqui assim que forem publicadas.</EmptyState> : null}
      {matched.length ? <section className="mt-8 grid gap-4" aria-labelledby="jornadas-arquetipo-titulo"><h2 id="jornadas-arquetipo-titulo" className="text-xl font-black text-secondary">Jornadas para o seu perfil</h2><JourneyGrid journeys={matched} /></section> : null}
      {open.length ? <section className="mt-8 grid gap-4" aria-labelledby="jornadas-abertas-titulo"><h2 id="jornadas-abertas-titulo" className="text-xl font-black text-secondary">Outras jornadas abertas para todos</h2><JourneyGrid journeys={open} /></section> : null}
    </div>
  );
}

function JourneyGrid({ journeys }: { journeys: EligibleJourney[] }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{journeys.map((journey) => <Card key={journey.journey_version_id} className="brand-accent-card flex flex-col"><h3 className="font-bold text-secondary">{journey.title}</h3>{journey.description ? <p className="mt-2 text-sm text-muted">{journey.description}</p> : null}<form action={selfEnrollAction} className="mt-auto pt-4"><input type="hidden" name="journey_version_id" value={journey.journey_version_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" size="sm">Entrar nesta jornada</Button></form></Card>)}</div>;
}
