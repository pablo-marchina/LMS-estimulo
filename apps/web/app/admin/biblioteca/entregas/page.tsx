import { AdminDeliveryConfigurationManager } from "@/components/admin-delivery-configuration-manager";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";

export const dynamic = "force-dynamic";

export default async function AdminLibraryDeliveriesPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();
  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Biblioteca" title="Atividades com entrega" description="Configure o que será enviado, os formatos aceitos e os critérios de correção. As respostas recebidas ficam em Operação." actions={<div className="flex flex-wrap gap-2"><ButtonLink href="/admin/biblioteca" variant="secondary">Voltar à biblioteca</ButtonLink><ButtonLink href="/admin/operacao?area=praticas">Abrir entregas recebidas</ButtonLink></div>} />
    {query.sucesso ? <StatusPanel title="Configuração salva" tone="success">A atividade com entrega foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Revise os campos e tente novamente. A configuração anterior foi preservada.</StatusPanel> : null}
    <AdminDeliveryConfigurationManager configurations={workspace.delivery_configurations} libraryItems={workspace.library_items} activities={workspace.activity_versions} />
  </div></AppShell>;
}
