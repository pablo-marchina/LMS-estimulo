import { AdminDisclosure, AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { getAdminLessonReporting, getAdminReportingDashboard } from "@/lib/admin/product-management";
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
  const [report, lessonReport] = await Promise.all([
    getAdminReportingDashboard(auth.identity.user_account_id, organization.organization_id),
    getAdminLessonReporting(auth.identity.user_account_id, organization.organization_id),
  ]);
  const metrics = report.metrics;
  const view = query.view === "jornadas" ? "jornadas" : query.view === "aulas" ? "aulas" : "resumo";

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Resultados" title="Relatórios" description="Acompanhe os indicadores principais e abra detalhes somente quando necessário." />
    <AdminSectionNav items={[{ href: "/admin/relatorios?view=resumo", label: "Resumo", active: view === "resumo" }, { href: "/admin/relatorios?view=jornadas", label: "Por jornada", active: view === "jornadas" }, { href: "/admin/relatorios?view=aulas", label: "Por aula", active: view === "aulas" }]} />
    <p className="text-sm text-muted">Atualizado em {date(report.generated_at)}</p>
    {view === "resumo" ? <><section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Indicadores principais"><MetricTile index={0} label="Participantes" value={metrics.participants} /><MetricTile index={1} label="Matrículas" value={metrics.enrollments} /><MetricTile index={2} label="Jornadas concluídas" value={metrics.completed_journeys} /><MetricTile index={3} label="Progresso médio" value={`${metrics.average_progress}%`} /><MetricTile index={4} label="Pontos emitidos" value={metrics.points_issued} /></section><AdminDisclosure title="Outros indicadores" description="Selos, certificados, avaliações, comentários e práticas."><section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"><MetricTile index={5} label="Selos" value={metrics.badges_awarded} /><MetricTile index={6} label="Certificados" value={metrics.certificates_issued} /><MetricTile index={7} label="Avaliação média" value={metrics.average_utility_rating || "—"} /><MetricTile index={8} label="Comentários" value={metrics.comments} /><MetricTile index={9} label="Práticas" value={metrics.practice_submissions} /></section></AdminDisclosure></> : null}
    {view === "jornadas" ? <Card aria-labelledby="desempenho-jornadas-titulo"><CardHeader><CardTitle id="desempenho-jornadas-titulo">Desempenho por jornada</CardTitle></CardHeader>{report.journeys.length === 0 ? <p className="text-sm text-muted">Não há matrículas reais para consolidar.</p> : <TableScroll><Table><thead><tr><Th>Jornada</Th><Th>Versão</Th><Th>Matrículas</Th><Th>Concluídas</Th><Th>Progresso médio</Th></tr></thead><tbody>{report.journeys.map((item) => <tr key={`${item.journey}-${item.version}`}><Td className="font-medium">{item.journey}</Td><Td>v{item.version}</Td><Td>{item.enrollments}</Td><Td>{item.completed}</Td><Td>{item.average_progress}%</Td></tr>)}</tbody></Table></TableScroll>}</Card> : null}
    {view === "aulas" ? <Card aria-labelledby="desempenho-aulas-titulo"><CardHeader><CardTitle id="desempenho-aulas-titulo">Engajamento por aula</CardTitle></CardHeader>{lessonReport.lessons.length === 0 ? <p className="text-sm text-muted">Ainda não há aulas disponibilizadas para participantes reais.</p> : <TableScroll><Table><thead><tr><Th>Aula</Th><Th>Tipo</Th><Th>Disponibilizadas</Th><Th>Iniciadas</Th><Th>Concluídas</Th><Th>Conclusão</Th></tr></thead><tbody>{lessonReport.lessons.map((item) => <tr key={item.activity_version_id}><Td className="font-medium">{item.title}</Td><Td>{item.activity_type}</Td><Td>{item.assigned}</Td><Td>{item.started}</Td><Td>{item.completed}</Td><Td>{item.completion_rate}%</Td></tr>)}</tbody></Table></TableScroll>}</Card> : null}
    <StatusPanel title="Uso responsável" tone="info">Os indicadores medem aprendizagem e operação. Eles não são usados automaticamente em decisões de crédito.</StatusPanel>
  </div></AppShell>;
}
