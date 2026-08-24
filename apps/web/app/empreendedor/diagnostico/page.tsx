import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { DiagnosticStepper } from "@/components/diagnostic-stepper";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";

const diagnosticMessages: Record<string, { title: string; text: string }> = {
  resposta_pendente: {
    title: "Complete as respostas obrigatórias",
    text: "Suas respostas já registradas foram preservadas. Responda os itens pendentes e tente concluir novamente.",
  },
  sincronizacao: {
    title: "Não foi possível sincronizar agora",
    text: "Nenhuma resposta foi apagada. Recarregue o diagnóstico e continue de onde parou.",
  },
};

function diagnosticJourneyFromPath(nextPath: string) {
  try {
    const next = new URL(nextPath, "http://local.estimulo");
    if (next.pathname !== "/empreendedor/diagnostico") return null;
    return next.searchParams.get("journey");
  } catch {
    return null;
  }
}

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ journey?: string; erro?: string }> }) {
  const { journey, erro } = await searchParams;
  const auth = await requireParticipantContext();
  const actor = auth.identity.user_account_id;
  let effectiveJourney = journey;

  if (!effectiveJourney) {
    let entry;
    try {
      entry = await participantDiagnosticRuntime.ensureEntry(actor);
    } catch {
      return (
        <div className="mx-auto max-w-[980px] px-5 py-8 lg:px-9 lg:py-10">
          <StatusPanel title="Diagnóstico temporariamente indisponível" tone="warning">
            <p>Não foi possível localizar seu diagnóstico agora. Tente novamente sem perder seu progresso.</p>
            <ButtonLink href="/empreendedor/diagnostico" variant="secondary" className="mt-3">Tentar novamente</ButtonLink>
          </StatusPanel>
        </div>
      );
    }

    if (["available", "in_progress", "completed"].includes(entry.status) && entry.next_path) {
      const resolvedJourney = diagnosticJourneyFromPath(entry.next_path);
      if (resolvedJourney) effectiveJourney = resolvedJourney;
      else redirect(entry.next_path);
    } else if (entry.status === "profile_required") {
      redirect("/empreendedor/perfil");
    } else {
      redirect("/empreendedor/perfil/diagnostico?erro=indisponivel");
    }
  }

  if (!effectiveJourney) redirect("/empreendedor/perfil/diagnostico?erro=indisponivel");

  let experience;
  try {
    experience = await participantDiagnosticRuntime.getExperience(actor, effectiveJourney);
  } catch {
    return (
      <div className="mx-auto grid max-w-[980px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
        <PageHeader eyebrow="Diagnóstico" title="Vamos retomar seu diagnóstico" description="Seu progresso permanece salvo." />
        <StatusPanel title="Não foi possível carregar esta etapa" tone="warning">
          <p>Reabra o diagnóstico para sincronizar a jornada e continuar com segurança.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/empreendedor/diagnostico">Reabrir diagnóstico</ButtonLink>
            <ButtonLink href="/empreendedor/perfil/diagnostico" variant="secondary">Voltar ao perfil</ButtonLink>
          </div>
        </StatusPanel>
      </div>
    );
  }

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
          <ButtonLink href={`/empreendedor/resultado?journey=${effectiveJourney}`} className="mt-3">
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
          <ButtonLink href="/empreendedor/perfil/diagnostico" variant="secondary" className="mt-3">
            Voltar ao diagnóstico
          </ButtonLink>
        </StatusPanel>
      </div>
    );
  }

  const message = erro ? diagnosticMessages[erro] : null;
  return (
    <div className="mx-auto grid max-w-[980px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Conheça seu perfil"
        title="Diagnóstico empreendedor"
        description="Responda algumas perguntas para que possamos conhecer melhor você e o seu negócio. Assim, recomendamos conteúdos e jornadas mais alinhados ao seu momento e às suas necessidades."
      />
      {message ? <StatusPanel title={message.title} tone="warning"><p>{message.text}</p></StatusPanel> : null}
      <JourneyProgressNav state={experience.state} current="diagnostic" />
      <DiagnosticStepper
        journeyInstanceId={effectiveJourney}
        idempotencyKey={randomUUID()}
        items={experience.diagnostic.items}
      />
    </div>
  );
}
