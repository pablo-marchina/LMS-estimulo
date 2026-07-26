import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { getAdminReportingDashboard } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";
function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const report = await getAdminReportingDashboard(auth.identity.user_account_id, organization.organization_id);
  const metrics = report.metrics;
  const view = query.view === "jornadas" ? "jornadas" : "resumo";

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Evidência operacional" title="Relatórios" description="Indicadores reais da plataforma Estímulo, disponíveis para consulta por toda a equipe." />
    <nav className="grid gap-2 rounded-xl border border-border bg-white p-2 sm:grid-cols-2"><ButtonLink href="/admin/relatorios?view=resumo" variant={view === "resumo" ? "primary" : "ghost"} size="sm">Resumo</ButtonLink><ButtonLink href="/admin/relatorios?view=jornadas" variant={view === "jornadas" ? "primary" : "ghost"} size="sm">Desempenho por jornada</ButtonLink></nav>
    <p className="text-sm text-muted">Atualizado em {date(report.generated_at)}</p>
    {view === "resumo" ? <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Indicadores consolidados"><MetricTile index={0} label="Participantes" value={metrics.participants} /><MetricTile index={1} label="Matrículas" value={metrics.enrollments} /><MetricTile index={2} label="Jornadas concluídas" value={metrics.completed_journeys} /><MetricTile index={3} label="Progresso médio" value={`${metrics.average_progress}%`} /><MetricTile index={4} label="Pontos emitidos" value={metrics.points_issued} /><MetricTile index={5} label="Selos" value={metrics.badges_awarded} /><MetricTile index={6} label="Certificados" value={metrics.certificates_issued} /><MetricTile index={7} label="Avaliação média" value={metrics.average_utility_rating || "—"} /><MetricTile index={8} label="Comentários" value={metrics.comments} /><MetricTile index={9} label="Práticas" value={metrics.practice_submissions} /></section> : null}
    {view === "jornadas" ? <Card aria-labelledby="desempenho-jornadas-titulo"><CardHeader><CardTitle id="desempenho-jornadas-titulo">Desempenho por jornada</CardTitle></CardHeader>{report.journeys.length === 0 ? <p className="text-sm text-muted">Não há matrículas reais para consolidar.</p> : <TableScroll><Table><thead><tr><Th>Jornada</Th><Th>Versão</Th><Th>Matrículas</Th><Th>Concluídas</Th><Th>Progresso médio</Th></tr></thead><tbody>{report.journeys.map((item) => <tr key={`${item.journey}-${item.version}`}><Td className="font-medium">{item.journey}</Td><Td>v{item.version}</Td><Td>{item.enrollments}</Td><Td>{item.completed}</Td><Td>{item.average_progress}%</Td></tr>)}</tbody></Table></TableScroll>}</Card> : null}
    <StatusPanel title="Uso responsável" tone="info">Este painel mede aprendizagem e operação. Nenhum indicador educacional é usado automaticamente em crédito.</StatusPanel>
  </div></AppShell>;
}
