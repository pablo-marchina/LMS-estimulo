import { randomUUID } from "node:crypto";
import { Award, Check } from "lucide-react";
import { issueLearningCredentialsAction } from "@/app/actions/journey";
import { DiagnosticDimensionChart } from "@/components/diagnostic-dimension-chart";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";

export default async function ResultPage({
  searchParams
}: {
  searchParams: Promise<{ journey?: string; avaliacao?: string; credenciais?: string }>;
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
  const [state, credentials, diagnosticSummary] = await Promise.all([
    journeyRuntime.getParticipantState(auth.identity.user_account_id, journey),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    engagementRuntime.participantDiagnosticSummary(auth.identity.user_account_id).catch(() => ({ diagnostic_name: null, completed_at: null, dimensions: [] })),
  ]);
  const badges = credentials.badges.filter((item) => item.journey_instance_id === journey);
  const certificates = credentials.certificates.filter((item) => item.journey_instance_id === journey);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Resultado da jornada" title={state.journey_title ?? state.journey_code} description="Acompanhe o que foi registrado durante sua experiência de aprendizagem." />
      <JourneyProgressNav state={state} current="result" />

      {query.avaliacao === "aprovada" ? <StatusPanel title="Avaliação aprovada" tone="success"><p>O resultado foi registrado e as credenciais elegíveis foram processadas.</p></StatusPanel> : null}
      {query.credenciais === "atualizadas" ? <StatusPanel title="Credenciais atualizadas" tone="success"><p>Selos e certificados elegíveis foram verificados.</p></StatusPanel> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Resumo do resultado">
        <MetricTile index={0} label="Status" value={statusLabel(state.journey_status)} />
        <MetricTile index={1} label="Pontos registrados" value={state.p?.balance ?? 0} />
        <MetricTile index={2} label="Etapas obrigatórias" value={`${state.completed_required_steps}/${state.total_required_steps}`} />
      </section>

      <ProgressMeter value={state.progress} label="Progresso total" />

      {diagnosticSummary.dimensions.length >= 3 ? (
        <Card className="after:!hidden" aria-labelledby="diagnostico-empreendedor-resultado">
          <div><p className="brand-kicker">Seu momento</p><h2 id="diagnostico-empreendedor-resultado" className="display-font mt-1 text-2xl text-secondary">Diagnóstico empreendedor</h2><p className="mt-2 text-sm text-muted">O gráfico radar compara as áreas avaliadas no diagnóstico mais recente.</p></div>
          <DiagnosticDimensionChart dimensions={diagnosticSummary.dimensions} />
        </Card>
      ) : null}

      <StatusPanel title="Como interpretar estes dados" tone="info">
        <p>Conclusão, respostas e pontos são evidências da jornada de aprendizagem. A plataforma não os apresenta como score, risco ou decisão de crédito sem validação institucional específica.</p>
      </StatusPanel>

      {state.journey_status === "completed" ? (
        <form action={issueLearningCredentialsAction} className="no-print">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <Button variant="secondary" type="submit">Verificar credenciais elegíveis</Button>
        </form>
      ) : (
        <StatusPanel title="Jornada ainda em andamento" tone="info">
          <p>Conclua as etapas obrigatórias para liberar o resultado final.</p>
          <ButtonLink href={participantNextHref(state)} className="mt-3">Continuar jornada</ButtonLink>
        </StatusPanel>
      )}

      <section className="grid gap-4" aria-labelledby="credenciais-jornada">
        <h2 id="credenciais-jornada" className="text-xl font-semibold text-ink">Credenciais desta jornada</h2>
        {badges.length === 0 && certificates.length === 0 ? <StatusPanel title="Nenhuma credencial emitida" tone="info"><p>A emissão depende das regras publicadas para esta jornada.</p></StatusPanel> : null}
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
                <ButtonLink href={`/credenciais/${certificate.verification_code}`} size="sm" className="mt-4 w-fit">Abrir certificado</ButtonLink>
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
