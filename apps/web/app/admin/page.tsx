import { BookOpen, ClipboardCheck, FileQuestion, GraduationCap, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace, getAdminReportingDashboard } from "@/lib/admin/product-management";
import { practiceRuntime } from "@/lib/practice/runtime";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  if (query.sucesso || query.pratica || query.instance) {
    const params = new URLSearchParams();
    for (const key of ["sucesso", "pratica", "instance"]) if (query[key]) params.set(key, query[key]!);
    redirect(`/admin/operacao?${params.toString()}`);
  }

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const actor = auth.identity.user_account_id;
  const [product, reporting, practices] = await Promise.all([
    getAdminProductWorkspace(actor, organization.organization_id).catch(() => null),
    getAdminReportingDashboard(actor, organization.organization_id).catch(() => null),
    practiceRuntime.listOperator(actor, organization.organization_id, 100).catch(() => null),
  ]);

  const activeJourneys = product?.journeys.filter((journey) => journey.status !== "retired") ?? [];
  const publishedJourneys = activeJourneys.reduce((sum, journey) => sum + journey.versions.filter((version) => version.status === "published").length, 0);
  const draftDiagnostics = product?.diagnostics.filter((item) => item.status !== "retired").reduce((sum, diagnostic) => sum + diagnostic.versions.filter((version) => version.status === "draft").length, 0) ?? null;
  const practicePending = practices?.submissions.filter((submission) => submission.status === "awaiting_review").length ?? null;

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Estímulo" title="Visão geral" description="Veja primeiro o que exige atenção e acesse as áreas mais usadas." />
    {(practicePending ?? 0) > 0 ? <Card className="border-warning/40 bg-warning-soft/50"><div className="flex flex-wrap items-center gap-4"><span className="grid size-11 place-items-center rounded-xl bg-white text-primary"><ClipboardCheck /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-ink">{practicePending} entrega(s) aguardando revisão</h2><p className="text-sm text-muted">Abra a operação para aceitar a evidência ou solicitar um ajuste.</p></div><ButtonLink href="/admin/operacao?area=praticas" size="sm">Revisar entregas</ButtonLink></div></Card> : <StatusPanel title="Tudo em dia" tone="success">Não há entregas aguardando revisão.</StatusPanel>}
    <section className="grid gap-4" aria-labelledby="resumo-plataforma"><h2 id="resumo-plataforma" className="text-lg font-semibold text-ink">Resumo</h2><div className="grid gap-4 sm:grid-cols-3"><OverviewCard icon={Users} label="Participantes ativos" value={reporting?.metrics.participants ?? null} href="/admin/usuarios" cta="Ver usuários" /><OverviewCard icon={GraduationCap} label="Jornadas publicadas" value={publishedJourneys} href="/admin/produto" cta="Ver jornadas" /><OverviewCard icon={FileQuestion} label="Diagnósticos em rascunho" value={draftDiagnostics} href="/admin/diagnostico" cta="Ver diagnósticos" /></div></section>
    <section className="grid gap-4" aria-labelledby="atalhos"><h2 id="atalhos" className="text-lg font-semibold text-ink">Atalhos</h2><div className="grid gap-3 sm:grid-cols-2"><AreaCard icon={GraduationCap} title="Criar ou editar jornada" description="Informações, trilhas, aulas e publicação." href="/admin/produto" /><AreaCard icon={BookOpen} title="Adicionar conteúdo" description="Textos, links, vídeos e arquivos reutilizáveis." href="/admin/biblioteca?view=novo" /></div></section>
  </div></AppShell>;
}

function OverviewCard({ icon: Icon, label, value, href, cta }: { icon: typeof Users; label: string; value: number | null; href: string; cta: string }) {
  return <Card><div className="flex items-start justify-between gap-4"><Icon className="text-primary" /><strong className="text-3xl text-ink">{value ?? "—"}</strong></div><h3 className="mt-4 font-semibold text-ink">{label}</h3><ButtonLink href={href} variant="secondary" size="sm" className="mt-4 w-fit">{cta}</ButtonLink></Card>;
}
function AreaCard({ icon: Icon, title, description, href }: { icon: typeof Users; title: string; description: string; href: string }) {
  return <Card><div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon size={20} /></span><div className="min-w-0 flex-1"><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm text-muted">{description}</p><ButtonLink href={href} variant="secondary" size="sm" className="mt-3 w-fit">Abrir</ButtonLink></div></div></Card>;
}
