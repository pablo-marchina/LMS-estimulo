import { AlertCircle, BookOpen, ClipboardCheck, FileQuestion, GraduationCap, MessageSquare, Trophy, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace, getAdminReportingDashboard } from "@/lib/admin/product-management";
import { identityResolutionRuntime } from "@/lib/admin/identity-resolution";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  if (query.sucesso || query.comentario || query.pratica || query.instance) {
    const params = new URLSearchParams();
    for (const key of ["sucesso", "comentario", "pratica", "instance"]) if (query[key]) params.set(key, query[key]!);
    redirect(`/admin/operacao?${params.toString()}`);
  }

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const actor = auth.identity.user_account_id;
  const permissions = new Set(organization.permissions);
  const [product, reporting, identities, practices, comments] = await Promise.all([
    permissions.has("journey.definition.manage") ? getAdminProductWorkspace(actor, organization.organization_id).catch(() => null) : null,
    permissions.has("reporting.read") ? getAdminReportingDashboard(actor, organization.organization_id).catch(() => null) : null,
    permissions.has("iam.accounts.manage") || permissions.has("integration.manage") ? identityResolutionRuntime.list(actor, organization.organization_id).catch(() => null) : null,
    permissions.has("assessment.review") ? practiceRuntime.listOperator(actor, organization.organization_id, 100).catch(() => null) : null,
    permissions.has("engagement.manage") ? journeyRuntime.listOperatorActivityComments(actor, organization.organization_id, 100).catch(() => null) : null,
  ]);

  const activeJourneys = product?.journeys.filter((journey) => journey.status !== "retired") ?? [];
  const publishedJourneys = activeJourneys.reduce((sum, journey) => sum + journey.versions.filter((version) => version.status === "published").length, 0);
  const draftDiagnostics = product?.diagnostics.filter((item) => item.status !== "retired").reduce((sum, diagnostic) => sum + diagnostic.versions.filter((version) => version.status === "draft").length, 0) ?? null;
  const identityPending = identities ? identities.counts.pending + identities.counts.awaiting_integration + identities.counts.queued : null;
  const practicePending = practices?.submissions.filter((submission) => submission.status === "awaiting_review").length ?? null;
  const visibleComments = comments?.comments.filter((comment) => comment.status === "visible").length ?? null;

  const attention = [
    { icon: AlertCircle, label: "Identidades para resolver", value: identityPending, href: "/admin/usuarios#identidades-pendentes-titulo", cta: "Resolver" },
    { icon: ClipboardCheck, label: "Entregas para revisar", value: practicePending, href: "/admin/operacao#praticas", cta: "Revisar" },
    { icon: MessageSquare, label: "Comentários para moderar", value: visibleComments, href: "/admin/operacao#comentarios", cta: "ModerAR" },
  ].filter((item) => (item.value ?? 0) > 0);

  return <AppShell area="admin" email={auth.email}><div className="grid gap-8">
    <PageHeader eyebrow="Estímulo" title="Administração" description="Comece pelas pendências. As configurações ficam organizadas por área e aparecem somente quando você entra nelas." />

    <section className="grid gap-4" aria-labelledby="atencao-agora"><h2 id="atencao-agora" className="text-xl font-semibold text-ink">Precisa de atenção</h2>{attention.length === 0 ? <StatusPanel title="Tudo em dia" tone="success">Não há pendências operacionais neste momento.</StatusPanel> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{attention.map((item) => <OverviewCard key={item.label} {...item} attention />)}</div>}</section>

    <section className="grid gap-4" aria-labelledby="visao-plataforma"><h2 id="visao-plataforma" className="text-xl font-semibold text-ink">Resumo da plataforma</h2><div className="grid gap-4 sm:grid-cols-3"><OverviewCard icon={Users} label="Participantes ativos" value={reporting?.metrics.participants ?? null} href="/admin/usuarios" cta="Ver usuários" /><OverviewCard icon={GraduationCap} label="Jornadas publicadas" value={publishedJourneys} href="/admin/produto" cta="Gerenciar jornadas" /><OverviewCard icon={FileQuestion} label="Diagnósticos em rascunho" value={draftDiagnostics} href="/admin/diagnostico" cta="Continuar configuração" /></div></section>

    <section className="grid gap-4" aria-labelledby="gerenciar"><h2 id="gerenciar" className="text-xl font-semibold text-ink">Gerenciar</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AreaCard icon={GraduationCap} title="Jornadas" description="Crie a jornada, organize trilhas e publique." href="/admin/produto" /><AreaCard icon={BookOpen} title="Biblioteca" description="Cadastre materiais e defina onde aparecem." href="/admin/biblioteca" /><AreaCard icon={Trophy} title="Pontuação e certificados" description="Defina pontos, selos e certificados." href="/admin/gamificacao" /></div></section>
  </div></AppShell>;
}

function OverviewCard({ icon: Icon, label, value, href, cta, attention = false }: { icon: typeof Users; label: string; value: number | null; href: string; cta: string; attention?: boolean }) {
  return <Card className={attention ? "border-warning/40 bg-warning-soft/50" : undefined}><div className="flex items-start justify-between gap-4"><Icon className="text-primary" /><strong className="text-3xl text-ink">{value ?? "—"}</strong></div><h3 className="mt-4 font-semibold text-ink">{label}</h3><ButtonLink href={href} variant="secondary" size="sm" className="mt-4 w-fit">{cta}</ButtonLink></Card>;
}
function AreaCard({ icon: Icon, title, description, href }: { icon: typeof Users; title: string; description: string; href: string }) {
  return <Card><Icon className="text-primary" /><h3 className="mt-4 font-semibold text-ink">{title}</h3><p className="mt-1 text-sm text-muted">{description}</p><ButtonLink href={href} variant="secondary" size="sm" className="mt-4 w-fit">Abrir</ButtonLink></Card>;
}