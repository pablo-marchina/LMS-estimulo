import { AlertCircle, BookOpen, ClipboardCheck, FileQuestion, GraduationCap, MessageSquare, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace, getAdminReportingDashboard } from "@/lib/admin/product-management";
import { identityResolutionRuntime } from "@/lib/admin/identity-resolution";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ organization?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return <main className="mx-auto max-w-3xl px-4 py-10"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre e vincule uma identidade interna.</p></StatusPanel></main>;
  }
  const organization = auth.identity.organizations.find((item) => item.organization_id === query.organization) ?? auth.identity.organizations[0];
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;
  }

  const actor = auth.identity.user_account_id;
  const permissions = new Set(organization.permissions);
  const [product, reporting, identities, practices, comments] = await Promise.all([
    permissions.has("journey.definition.manage")
      ? getAdminProductWorkspace(actor, organization.organization_id).catch(() => null)
      : Promise.resolve(null),
    permissions.has("reporting.read")
      ? getAdminReportingDashboard(actor, organization.organization_id).catch(() => null)
      : Promise.resolve(null),
    permissions.has("iam.accounts.manage") || permissions.has("integration.manage")
      ? identityResolutionRuntime.list(actor, organization.organization_id).catch(() => null)
      : Promise.resolve(null),
    permissions.has("assessment.review")
      ? practiceRuntime.listOperator(actor, organization.organization_id, 100).catch(() => null)
      : Promise.resolve(null),
    permissions.has("engagement.manage")
      ? journeyRuntime.listOperatorActivityComments(actor, organization.organization_id, 100).catch(() => null)
      : Promise.resolve(null),
  ]);

  const publishedJourneys = product?.journeys.reduce(
    (sum, journey) => sum + journey.versions.filter((version) => version.status === "published").length,
    0,
  ) ?? null;
  const draftDiagnostics = product?.diagnostics.reduce(
    (sum, diagnostic) => sum + diagnostic.versions.filter((version) => version.status === "draft").length,
    0,
  ) ?? null;
  const identityPending = identities
    ? identities.counts.pending + identities.counts.awaiting_integration + identities.counts.queued
    : null;
  const practicePending = practices?.submissions.filter((submission) => submission.status === "awaiting_review").length ?? null;
  const visibleComments = comments?.comments.filter((comment) => comment.status === "visible").length ?? null;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Administração"
          title="Visão geral"
          description="Comece pelo que precisa de atenção. Cada card leva diretamente à tela em que a ação acontece."
          actions={
            <form className="flex flex-wrap items-end gap-3" method="get">
              <label className="grid gap-1.5 text-sm font-medium text-ink">Organização
                <Select name="organization" defaultValue={organization.organization_id}>
                  {auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}
                </Select>
              </label>
              <Button variant="secondary" type="submit">Selecionar</Button>
            </form>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumo administrativo">
          <OverviewCard icon={Users} label="Participantes" value={reporting?.metrics.participants ?? null} description="Pessoas acompanhadas nesta organização" href={`/admin/usuarios?organization=${organization.organization_id}`} cta="Abrir usuários" />
          <OverviewCard icon={GraduationCap} label="Jornadas publicadas" value={publishedJourneys} description="Versões disponíveis para matrícula" href={`/admin/produto?organization=${organization.organization_id}`} cta="Abrir produto" />
          <OverviewCard icon={FileQuestion} label="Diagnósticos em rascunho" value={draftDiagnostics} description="Configurações que ainda não foram publicadas" href={`/admin/diagnostico?organization=${organization.organization_id}`} cta="Abrir diagnóstico" />
          <OverviewCard icon={AlertCircle} label="Identidades pendentes" value={identityPending} description="Vínculos que precisam de decisão ou integração" href={`/admin/usuarios?organization=${organization.organization_id}#identidades-pendentes-titulo`} cta="Resolver identidades" attention={Boolean(identityPending)} />
          <OverviewCard icon={ClipboardCheck} label="Práticas para revisar" value={practicePending} description="Entregas aguardando retorno" href={`/admin/operacao?organization=${organization.organization_id}#praticas`} cta="Revisar práticas" attention={Boolean(practicePending)} />
          <OverviewCard icon={MessageSquare} label="Comentários visíveis" value={visibleComments} description="Conversas disponíveis para moderação" href={`/admin/operacao?organization=${organization.organization_id}#comentarios`} cta="Abrir moderação" />
        </section>

        <Card className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-ink">Operações de jornada</h2>
            <p className="mt-1 text-sm text-muted">Publicação, matrícula, evidências, práticas e comentários continuam no espaço operacional dedicado.</p>
          </div>
          <ButtonLink href={`/admin/operacao?organization=${organization.organization_id}`} className="w-fit">Abrir operação</ButtonLink>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2" aria-label="Atalhos editoriais">
          <Card><BookOpen className="text-primary" aria-hidden="true" /><h2 className="mt-4 font-semibold text-ink">Biblioteca</h2><p className="mt-1 text-sm text-muted">Cadastre artigos, links ou arquivos e escolha onde aparecem.</p><ButtonLink href={`/admin/biblioteca?organization=${organization.organization_id}`} variant="secondary" size="sm" className="mt-4 w-fit">Gerenciar biblioteca</ButtonLink></Card>
          <Card><GraduationCap className="text-primary" aria-hidden="true" /><h2 className="mt-4 font-semibold text-ink">Gamificação</h2><p className="mt-1 text-sm text-muted">Configure pontos, selos e certificados com formulários guiados.</p><ButtonLink href={`/admin/gamificacao?organization=${organization.organization_id}`} variant="secondary" size="sm" className="mt-4 w-fit">Gerenciar conquistas</ButtonLink></Card>
        </section>
      </div>
    </AppShell>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
  href,
  cta,
  attention = false,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  description: string;
  href: string;
  cta: string;
  attention?: boolean;
}) {
  return (
    <Card className={attention ? "border-warning/40 bg-warning-soft/40" : undefined}>
      <div className="flex items-start justify-between gap-4"><Icon className="text-primary" aria-hidden="true" /><strong className="text-3xl text-ink">{value ?? "—"}</strong></div>
      <h2 className="mt-5 font-semibold text-ink">{label}</h2>
      <p className="mt-1 text-sm text-muted">{value === null ? "Sem permissão ou consulta indisponível." : description}</p>
      <ButtonLink href={href} variant="secondary" size="sm" className="mt-4 w-fit">{cta}</ButtonLink>
    </Card>
  );
}
