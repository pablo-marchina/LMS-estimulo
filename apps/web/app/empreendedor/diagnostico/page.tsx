import { randomUUID } from "node:crypto";
import { DiagnosticStepper } from "@/components/diagnostic-stepper";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ journey?: string }> }) {
  const { journey } = await searchParams;
  if (!journey) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
        <StatusPanel title="Jornada não informada" tone="warning">
          <p>Volte para o painel e selecione uma jornada.</p>
          <ButtonLink href="/empreendedor" variant="secondary" className="mt-3">
            Ir para o painel
          </ButtonLink>
        </StatusPanel>
      </div>
    );
  }

  const auth = await requireParticipantContext();
  const experience = await participantDiagnosticRuntime.getExperience(auth.identity.user_account_id, journey);

  if (experience.state.d?.status === "completed") {
    return (
      <div className="mx-auto grid max-w-[980px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
        <PageHeader
          eyebrow="Diagnóstico"
          title="Seu perfil já foi identificado"
          description="Consulte o resultado para entender seus pontos fortes e as oportunidades de evolução."
        />
        <JourneyProgressNav state={experience.state} current="diagnostic" />
        <StatusPanel title="Diagnóstico concluído" tone="success">
          <p>Suas respostas e seu resultado continuam salvos.</p>
          <ButtonLink href={`/empreendedor/resultado?journey=${journey}`} className="mt-3">
            Ver resultado do diagnóstico
          </ButtonLink>
        </StatusPanel>
      </div>
    );
  }

  if (!experience.diagnostic) {
    return (
      <div className="mx-auto grid max-w-[980px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
        <JourneyProgressNav state={experience.state} current="diagnostic" />
        <StatusPanel title="Diagnóstico indisponível" tone="warning">
          <p>O diagnóstico de perfil ainda não está publicado. Nenhuma resposta foi perdida.</p>
          <ButtonLink href="/empreendedor/perfil" variant="secondary" className="mt-3">
            Voltar ao perfil
          </ButtonLink>
        </StatusPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[980px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Conheça seu perfil"
        title="Diagnóstico empreendedor"
        description="Responda algumas perguntas para que possamos conhecer melhor você e o seu negócio. Assim, recomendamos conteúdos e jornadas mais alinhados ao seu momento e às suas necessidades."
      />
      <JourneyProgressNav state={experience.state} current="diagnostic" />
      <DiagnosticStepper
        journeyInstanceId={journey}
        idempotencyKey={randomUUID()}
        items={experience.diagnostic.items}
      />
    </div>
  );
}
