import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminReportingDashboard } from "@/lib/admin/product-management";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <StatusPanel title="Acesso indisponível" tone="warning">
          Entre com sua conta Estímulo.
        </StatusPanel>
      </main>
    );
  }
  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("reporting.read"));
  if (!organization?.permissions.includes("reporting.read")) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Relatórios restritos" tone="warning">
          Seu papel não permite consultar indicadores consolidados.
        </StatusPanel>
      </AppShell>
    );
  }
  const report = await getAdminReportingDashboard(auth.identity.user_account_id, organization.organization_id);
  const metrics = report.metrics;
  const reportable = auth.identity.organizations.filter((item) => item.permissions.includes("reporting.read"));

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Evidência operacional"
          title="Relatórios da plataforma"
          description="Indicadores derivados do banco operacional e do histórico de eventos. Nenhum dado educacional é usado automaticamente em crédito."
          actions={
            <form className="flex flex-wrap items-end gap-3" method="get">
              <Label>
                Organização
                <Select name="organization" defaultValue={organization.organization_id}>
                  {reportable.map((item) => (
                    <option key={item.organization_id} value={item.organization_id}>
                      {item.display_name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Button variant="secondary" type="submit">
                Selecionar
              </Button>
            </form>
          }
        />

        <p className="-mt-4 text-sm text-muted">Atualizado em {date(report.generated_at)}</p>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Indicadores consolidados">
          <MetricTile index={0} label="Participantes" value={metrics.participants} />
          <MetricTile index={1} label="Matrículas" value={metrics.enrollments} />
          <MetricTile index={2} label="Jornadas concluídas" value={metrics.completed_journeys} />
          <MetricTile index={3} label="Progresso médio" value={`${metrics.average_progress}%`} />
          <MetricTile index={4} label="Pontos emitidos" value={metrics.points_issued} />
          <MetricTile index={5} label="Selos conquistados" value={metrics.badges_awarded} />
          <MetricTile index={6} label="Certificados" value={metrics.certificates_issued} />
          <MetricTile index={7} label="Avaliação média" value={metrics.average_utility_rating || "—"} />
          <MetricTile index={8} label="Comentários" value={metrics.comments} />
          <MetricTile index={9} label="Práticas enviadas" value={metrics.practice_submissions} />
        </section>

        <Card aria-labelledby="desempenho-jornadas-titulo">
          <CardHeader>
            <CardTitle id="desempenho-jornadas-titulo">Desempenho por jornada</CardTitle>
          </CardHeader>
          {report.journeys.length === 0 ? (
            <p className="text-sm text-muted">Não há matrículas para consolidar.</p>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>Jornada</Th>
                    <Th>Versão</Th>
                    <Th>Matrículas</Th>
                    <Th>Concluídas</Th>
                    <Th>Progresso médio</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.journeys.map((item) => (
                    <tr key={`${item.journey}-${item.version}`}>
                      <Td className="font-medium">{item.journey}</Td>
                      <Td>v{item.version}</Td>
                      <Td>{item.enrollments}</Td>
                      <Td>{item.completed}</Td>
                      <Td>{item.average_progress}%</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Card>

        <Card aria-labelledby="eventos-recentes-titulo">
          <CardHeader>
            <CardTitle id="eventos-recentes-titulo">Eventos recentes</CardTitle>
          </CardHeader>
          {report.recent_events.length === 0 ? (
            <p className="text-sm text-muted">Nenhum evento encontrado.</p>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>Tipo</Th>
                    <Th>Evento</Th>
                    <Th>Quando</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.recent_events.map((event, index) => (
                    <tr key={`${event.event_name}-${event.occurred_at}-${index}`}>
                      <Td>
                        <StatusPill tone="info">{event.aggregate_type ?? "evento"}</StatusPill>
                      </Td>
                      <Td className="font-medium">{event.event_name}</Td>
                      <Td className="text-muted">{date(event.occurred_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Card>

        <StatusPanel title="Uso responsável" tone="info">
          Este painel mede aprendizagem e operação. Exportação para o HubSpot continua limitada às classes e destinos explicitamente aprovados.
        </StatusPanel>
      </div>
    </AppShell>
  );
}
