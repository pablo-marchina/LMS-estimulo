import { randomUUID } from "node:crypto";
import { submitDiagnosisAction } from "@/app/actions/journey";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    const step = experience.state.s?.step_instance_id;
    return (
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
        <PageHeader
          eyebrow="Diagnóstico"
          title={experience.journey.title}
          description="Seu caminho de aprendizagem já foi definido com base nas respostas registradas."
        />
        <JourneyProgressNav state={experience.state} current="diagnostic" />
        <StatusPanel title="Diagnóstico concluído" tone="success">
          <p>Esta etapa está concluída e não precisa ser respondida novamente.</p>
          {step ? (
            <ButtonLink href={`/empreendedor/atividade/${step}?journey=${journey}`} className="mt-3">
              Continuar aprendizagem
            </ButtonLink>
          ) : null}
        </StatusPanel>
      </div>
    );
  }

  if (!experience.diagnostic) {
    return (
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
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
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Etapa 1"
        title="Diagnóstico inicial"
        description="As respostas ajudam a personalizar recomendações de aprendizagem. Elas não constituem avaliação de crédito."
      />
      <JourneyProgressNav state={experience.state} current="diagnostic" />
      <form action={submitDiagnosisAction} className="grid gap-4">
        <input type="hidden" name="journey_instance_id" value={journey} />
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        {experience.diagnostic.items.map((item, index) => (
          <Card key={item.id} className="grid gap-3">
            <legend className="text-sm font-semibold text-ink">
              <span className="mr-2 text-primary">Questão {index + 1}</span>
              {item.prompt}
            </legend>
            <div className="grid gap-2">
              {item.options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium has-checked:border-primary has-checked:bg-primary-soft"
                >
                  <input
                    type="radio"
                    name={`answer_${item.id}`}
                    value={option.code}
                    required={item.is_required}
                    defaultChecked={item.response?.option_code === option.code}
                    className="size-4 accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <ButtonLink href="/empreendedor" variant="secondary">
            Voltar ao painel
          </ButtonLink>
          <PendingSubmitButton pendingLabel="Salvando diagnóstico…">Concluir diagnóstico</PendingSubmitButton>
        </div>
      </form>
    </div>
  );
}
