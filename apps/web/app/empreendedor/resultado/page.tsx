import { randomUUID } from "node:crypto";
import { Award, Check } from "lucide-react";
import { issueLearningCredentialsAction } from "@/app/actions/journey";
import { DiagnosticResultDashboard } from "@/components/diagnostic-result-dashboard";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ShareAction } from "@/components/share-action";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { displayContentName } from "@/lib/content/display-name";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ journey?: string; avaliacao?: string; credenciais?: string; diagnostico?: string }>;
}) {
  const query = await searchParams;
  const journey = query.journey;
  if (!journey) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
        <StatusPanel title="Jornada não informada" tone="warning">
          <p>Selecione uma jornada para consultar o resultado.</p>
          <ButtonLink href="/empreendedor" variant="secondary" className="mt-3">Ir para o painel</ButtonLink>
        </StatusPanel>
      </div>
    );
  }

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const [stateResult, credentialsResult, engagementResult, diagnosticSummaryResult] = await Promise.allSettled([
    journeyRuntime.getParticipantState(auth.identity.user_account_id, journey),
    credentialRuntime.listParticipant(auth.identity.user_account_id),
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantDiagnosticSummary(auth.identity.user_account_id),
  ] as const);

  if (stateResult.status === "rejected") throw stateResult.reason;
  const state = stateResult.value;
  const credentials = credentialsResult.status === "fulfilled" ? credentialsResult.value : null;
  const engagement = engagementResult.status === "fulfilled" ? engagementResult.value : null;
  const diagnosticSummary = diagnosticSummaryResult.status === "fulfilled" ? diagnosticSummaryResult.value : null;
  const badges = credentials?.badges.filter((item) => item.journey_instance_id === journey) ?? [];
  const certificates = credentials?.certificates.filter((item) => item.journey_instance_id === journey) ?? [];
  const journeyTitle = displayContentName(state.journey_title, displayContentName(state.journey_code, "Jornada"));
  const archetype = engagement?.archetype ?? null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Resultado da jornada" title={journeyTitle} description="Veja seu diagnóstico, seus próximos movimentos e tudo o que foi registrado durante sua experiência." />
      <JourneyProgressNav state={state} current="result" />

      {query.diagnostico === "concluido" ? (
        <StatusPanel title="Diagnóstico concluído" tone="success">
          <p>Suas respostas, seu perfil e os pontos de conclusão foram registrados. Recarregar a página não duplica pontos.</p>
        </StatusPanel>
      ) : null}
      {query.avaliacao === "aprovada" ? <StatusPanel title="Avaliação aprovada" tone="success"><p>O resultado foi registrado e as credenciais elegíveis foram processadas.</p></StatusPanel> : null}
      {query.credenciais === "atualizadas" ? <StatusPanel title="Credenciais atualizadas" tone="success"><p>Selos e certificados elegíveis foram verificados.</p></StatusPanel> : null}
      {credentialsResult.status === "rejected" ? <StatusPanel title="Credenciais temporariamente indisponíveis" tone="warning"><p>Não foi possível consultar seus selos e certificados agora. Isso não significa que você não possui credenciais; tente recarregar a página.</p></StatusPanel> : null}
      {engagementResult.status === "rejected" || diagnosticSummaryResult.status === "rejected" ? <StatusPanel title="Parte do diagnóstico está temporariamente indisponível" tone="warning"><p>Seu progresso da jornada foi carregado, mas o resumo do perfil não pôde ser consultado neste momento.</p></StatusPanel> : null}

      {archetype ? <DiagnosticResultDashboard archetype={archetype} dimensions={diagnosticSummary?.dimensions ?? []} resultBlocks={diagnosticSummary?.result_blocks ?? []} primaryHref={participantNextHref(state)} primaryLabel={state.journey_status === "completed" ? "Explorar outras jornadas" : "Acessar minha trilha"} /> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Resumo do resultado da jornada">
        <MetricTile index={0} label="Status" value={statusLabel(state.journey_status)} />
        <MetricTile index={1} label="Pontos registrados" value={state.p?.balance ?? 0} />
        <MetricTile index={2} label="Etapas obrigatórias" value={`${state.completed_required_steps}/${state.total_required_steps}`} />
      </section>

      <ProgressMeter value={state.progress} label="Progresso total" />

      {state.journey_status === "completed" ? (
        <form action={issueLearningCredentialsAction} className="no-print">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <PendingSubmitButton pendingLabel="Verificando credenciais…" variant="secondary">Verificar credenciais elegíveis</PendingSubmitButton>
        </form>
      ) : (
        <StatusPanel title="Jornada ainda em andamento" tone="info">
          <p>Continue pelas etapas disponíveis. Seu progresso permanece salvo.</p>
          <ButtonLink href={participantNextHref(state)} className="mt-3">Continuar jornada</ButtonLink>
        </StatusPanel>
      )}

      <section className="grid gap-4" aria-labelledby="credenciais-jornada">
        <h2 id="credenciais-jornada" className="text-xl font-semibold text-ink">Credenciais desta jornada</h2>
        {credentials && badges.length === 0 && certificates.length === 0 ? <StatusPanel title="Nenhuma credencial emitida" tone="info"><p>A emissão depende das regras publicadas para esta jornada.</p></StatusPanel> : null}
        {badges.length || certificates.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <Card key={badge.award_id}>
                <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success" aria-hidden="true"><Check size={16} /></span><Badge>Selo</Badge></div>
                <h3 className="mt-3 font-semibold text-ink">{badge.title}</h3>
                <p className="mt-1 text-sm text-muted">{badge.description}</p>
                <p className="mt-3 text-xs text-muted">Emitido em {new Intl.DateTimeFormat("pt-BR").format(new Date(badge.awarded_at))}</p>
              </Card>
            ))}
            {certificates.map((certificate) => (
              <Card key={certificate.issuance_id} className="flex flex-col">
                <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden="true"><Award size={16} /></span><Badge>Certificado</Badge></div>
                <h3 className="mt-3 font-semibold text-ink">{certificate.certificate_name}</h3>
                <p className="mt-1 text-sm text-muted">Emitido para {certificate.display_name}.</p>
                <p className="mt-1 text-xs text-muted">Código {certificate.verification_code}</p>
                <div className="no-print mt-4 flex flex-wrap gap-2"><ButtonLink href={`/credenciais/${certificate.verification_code}`} size="sm">Abrir certificado</ButtonLink><ShareAction title={certificate.certificate_name} text={`Concluí ${journeyTitle} na Plataforma Estímulo.`} url={`/credenciais/${certificate.verification_code}`} entityType="certificate" entityId={certificate.verification_code} label="Compartilhar" /></div>
              </Card>
            ))}
          </div>
        ) : null}
      </section>

      <div className="no-print flex flex-wrap gap-3 border-t border-border pt-6">
        <ButtonLink href="/empreendedor" variant="secondary">Voltar ao painel</ButtonLink>
        <ButtonLink href="/empreendedor/credenciais" variant="secondary">Todas as credenciais</ButtonLink>
      </div>
    </div>
  );
}
