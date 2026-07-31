import { ClipboardList } from "lucide-react";
import { OptionalDiagnosticForm } from "@/app/admin/diagnosticos-opcionais/optional-diagnostic-form";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export default async function OptionalDiagnosticsAdminPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();
  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Perfil" title="Diagnósticos opcionais" description="Escolha um diagnóstico e disponibilize no perfil sem alterar arquétipo ou jornadas." />
    {query.sucesso ? <StatusPanel title="Configuração salva" tone="success">O diagnóstico foi atualizado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Adicionar ao perfil</h2><p className="text-sm text-muted">Preencha os campos principais e publique quando estiver pronto.</p></div></div><OptionalDiagnosticForm diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></Card>

    <section className="grid gap-3"><div><p className="brand-kicker">Disponibilizados</p><h2 className="display-font mt-1 text-2xl text-secondary">Diagnósticos no perfil</h2></div>{workspace.optional_diagnostics.length === 0 ? <Card><p className="text-sm text-muted">Nenhum diagnóstico opcional configurado.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.optional_diagnostics.map((item) => <Card key={text(item.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{text(item.display_title)}</h3><p className="text-sm text-muted">{text(item.diagnostic_name)} · versão {number(item.diagnostic_version_number)}</p></div><StatusPill tone={text(item.status) === "published" ? "success" : "neutral"}>{text(item.status) === "published" ? "Publicado" : text(item.status)}</StatusPill></div><p className="text-sm text-muted">{text(item.display_description)}</p><p className="text-xs text-muted">{number(item.session_count)} sessão(ões) · {item.max_attempts === null ? "tentativas ilimitadas" : `${number(item.max_attempts)} tentativa(s)`}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar</summary><div className="border-t border-border p-4"><OptionalDiagnosticForm item={item} diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></div></details></Card>)}</div>}</section>
  </div></AppShell>;
}
