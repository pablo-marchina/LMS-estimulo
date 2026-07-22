import Link from "next/link";
import { randomUUID } from "node:crypto";
import { issueLearningCredentialsAction } from "@/app/actions/journey";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";

export default async function ResultPage({
  searchParams
}: {
  searchParams: Promise<{ journey?: string; avaliacao?: string; credenciais?: string }>;
}) {
  const query = await searchParams;
  const journey = query.journey;
  if (!journey) return <StatusPanel title="Jornada não informada" tone="warning"><p>Selecione uma jornada para consultar o resultado.</p><Link className="button button--secondary" href="/empreendedor">Ir para o painel</Link></StatusPanel>;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const [state, credentials] = await Promise.all([
    journeyRuntime.getParticipantState(auth.identity.user_account_id, journey),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] }))
  ]);
  const badges = credentials.badges.filter((item) => item.journey_instance_id === journey);
  const certificates = credentials.certificates.filter((item) => item.journey_instance_id === journey);

  return (
    <>
      <header className="page-heading"><p className="eyebrow">Resultado da jornada</p><h1>{state.journey_title ?? state.journey_code}</h1><p>Veja apenas fatos registrados durante a experiência de aprendizagem.</p></header>
      <JourneyProgressNav state={state} current="result" />
      {query.avaliacao === "aprovada" ? <StatusPanel title="Avaliação aprovada" tone="success"><p>O resultado foi registrado e as credenciais elegíveis foram processadas.</p></StatusPanel> : null}
      {query.credenciais === "atualizadas" ? <StatusPanel title="Credenciais atualizadas" tone="success"><p>Selos e certificados elegíveis foram verificados de forma idempotente.</p></StatusPanel> : null}
      <div className="metrics-grid">
        <article className="metric"><span>Status</span><strong>{statusLabel(state.journey_status)}</strong></article>
        <article className="metric"><span>Pontos registrados</span><strong>{state.p?.balance ?? 0}</strong></article>
        <article className="metric"><span>Etapas obrigatórias</span><strong>{state.completed_required_steps}/{state.total_required_steps}</strong></article>
      </div>
      <ProgressMeter value={state.progress} label="Progresso total" />
      <StatusPanel title="Como interpretar estes dados" tone="info"><p>Conclusão, respostas e pontos são evidências da jornada de aprendizagem. A plataforma não os apresenta como score, risco ou decisão de crédito sem uma validação institucional específica.</p></StatusPanel>

      {state.journey_status === "completed" ? <form action={issueLearningCredentialsAction} className="credential-refresh no-print">
        <input type="hidden" name="journey_instance_id" value={journey} />
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        <button className="button button--secondary" type="submit">Verificar credenciais elegíveis</button>
      </form> : <StatusPanel title="Jornada ainda em andamento" tone="info"><p>Conclua as etapas obrigatórias para liberar o resultado final.</p><Link className="button button--primary" href={participantNextHref(state)}>Continuar jornada</Link></StatusPanel>}

      <section className="stack stack--large" aria-labelledby="credenciais-jornada">
        <h2 id="credenciais-jornada">Credenciais desta jornada</h2>
        {badges.length === 0 && certificates.length === 0 ? <StatusPanel title="Nenhuma credencial emitida" tone="info"><p>A emissão depende de versões publicadas e regras homologadas para esta jornada.</p></StatusPanel> : null}
        {badges.length ? <div className="credential-grid">{badges.map((badge) => <article className="credential-card" key={badge.award_id}>
          <span className="credential-mark" aria-hidden="true">✓</span>
          <span className="status-pill">Selo</span><h3>{badge.title}</h3><p>{badge.description}</p><p className="metadata">Emitido em {new Intl.DateTimeFormat("pt-BR").format(new Date(badge.awarded_at))}</p>
        </article>)}</div> : null}
        {certificates.length ? <div className="credential-grid">{certificates.map((certificate) => <article className="credential-card credential-card--certificate" key={certificate.issuance_id}>
          <span className="status-pill">Certificado</span><h3>{certificate.certificate_name}</h3><p>Emitido para {certificate.display_name}.</p><p className="metadata">Código {certificate.verification_code}</p>
          <Link className="button button--primary" href={`/credenciais/${certificate.verification_code}`}>Abrir certificado</Link>
        </article>)}</div> : null}
      </section>

      <div className="form-footer journey-page-footer no-print"><Link className="button button--secondary" href="/empreendedor">Voltar ao painel</Link><Link className="button button--secondary" href="/empreendedor/credenciais">Todas as credenciais</Link></div>
    </>
  );
}
