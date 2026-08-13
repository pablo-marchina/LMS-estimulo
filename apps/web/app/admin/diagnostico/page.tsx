import { AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { OptionalDiagnosticSection } from "./optional-section";
import { buildDiagnosticPageModel } from "./page-model";
import { one } from "./page-model-utils";
import { PrincipalDiagnosticSection } from "./principal-section";

export const dynamic = "force-dynamic";

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const canEdit = organization.permissions.includes("diagnostic.configuration.manage");
  const type = one(query.tipo) === "opcionais" ? "opcionais" : "principal";
  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const model = buildDiagnosticPageModel(workspace.diagnostics, one(query.versao));
  const extensionWorkspace = type === "opcionais" ? await extensionsRuntime.adminWorkspace(auth.identity.user_account_id, organization.organization_id).catch(() => null) : null;
  const success = one(query.sucesso);
  const error = one(query.erro);

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Personalização" title="Diagnósticos" description="Configure o diagnóstico principal e escolha outros diagnósticos que aparecerão no perfil." />
    <AdminSectionNav items={[{ href: "/admin/diagnostico?tipo=principal", label: "Diagnóstico principal", active: type === "principal" },{ href: "/admin/diagnostico?tipo=opcionais", label: "Opcionais no perfil", active: type === "opcionais" }]} />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode consultar as configurações, mas não alterá-las.</StatusPanel> : null}
    {success ? <StatusPanel title="Alteração salva" tone="success">{type === "opcionais" ? "A disponibilidade no perfil foi atualizada." : success === "publicado" ? "O diagnóstico principal foi publicado e as relações foram atualizadas." : success === "excluido" ? "O diagnóstico foi retirado do uso e movido para o histórico preservado." : "O rascunho foi salvo."}</StatusPanel> : null}
    {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos e tente novamente.</StatusPanel> : null}
    {type === "principal" ? <PrincipalDiagnosticSection model={model} canEdit={canEdit} /> : <OptionalDiagnosticSection workspace={extensionWorkspace} canEdit={canEdit} />}
  </div></AppShell>;
}
