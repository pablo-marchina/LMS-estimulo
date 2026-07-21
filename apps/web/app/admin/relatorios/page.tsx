import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminReportingDashboard } from "@/lib/admin/product-management";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel></main>;
  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("reporting.read"));
  if (!organization?.permissions.includes("reporting.read")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Relatórios restritos" tone="warning"><p>Seu papel não permite consultar indicadores consolidados.</p></StatusPanel></AppShell>;
  const report = await getAdminReportingDashboard(auth.identity.user_account_id, organization.organization_id);
  const metrics = report.metrics;

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading"><p className="eyebrow">Evidência operacional</p><h1>Relatórios da plataforma</h1><p>Indicadores derivados do banco operacional e do histórico de eventos. Nenhum dado educacional é usado automaticamente em crédito.</p></header>
    <form className="inline-form" method="get"><label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.filter((item) => item.permissions.includes("reporting.read")).map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}</select></label><button className="button button--secondary" type="submit">Selecionar</button></form>
    <p className="muted-copy">Atualizado em {date(report.generated_at)}</p>

    <section className="metrics-grid reporting-grid">
      <article className="metric"><span>Participantes</span><strong>{metrics.participants}</strong></article>
      <article className="metric"><span>Matrículas</span><strong>{metrics.enrollments}</strong></article>
      <article className="metric"><span>Jornadas concluídas</span><strong>{metrics.completed_journeys}</strong></article>
      <article className="metric"><span>Progresso médio</span><strong>{metrics.average_progress}%</strong></article>
      <article className="metric"><span>Pontos emitidos</span><strong>{metrics.points_issued}</strong></article>
      <article className="metric"><span>Selos conquistados</span><strong>{metrics.badges_awarded}</strong></article>
      <article className="metric"><span>Certificados</span><strong>{metrics.certificates_issued}</strong></article>
      <article className="metric"><span>Avaliação média</span><strong>{metrics.average_utility_rating || "—"}</strong></article>
      <article className="metric"><span>Comentários</span><strong>{metrics.comments}</strong></article>
      <article className="metric"><span>Práticas enviadas</span><strong>{metrics.practice_submissions}</strong></article>
    </section>

    <section className="card stack"><h2>Desempenho por jornada</h2>{report.journeys.length === 0 ? <p>Não há matrículas para consolidar.</p> : <div className="table-scroll"><table><thead><tr><th>Jornada</th><th>Versão</th><th>Matrículas</th><th>Concluídas</th><th>Progresso médio</th></tr></thead><tbody>{report.journeys.map((item) => <tr key={`${item.journey}-${item.version}`}><td>{item.journey}</td><td>v{item.version}</td><td>{item.enrollments}</td><td>{item.completed}</td><td>{item.average_progress}%</td></tr>)}</tbody></table></div>}</section>
    <section className="card stack"><h2>Eventos recentes</h2>{report.recent_events.length === 0 ? <p>Nenhum evento encontrado.</p> : <div className="event-timeline">{report.recent_events.map((event, index) => <article key={`${event.event_name}-${event.occurred_at}-${index}`}><span className="status-pill">{event.aggregate_type ?? "evento"}</span><strong>{event.event_name}</strong><small>{date(event.occurred_at)}</small></article>)}</div>}</section>
    <StatusPanel title="Uso responsável" tone="info"><p>Este painel mede aprendizagem e operação. Exportação para o HubSpot continua limitada às classes e destinos explicitamente aprovados.</p></StatusPanel>
  </AppShell>;
}
