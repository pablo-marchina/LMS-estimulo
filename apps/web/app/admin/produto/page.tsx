import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { buildAdminProductStepHref, versionStatus } from "@/lib/admin/product-page-core.mjs";
import { loadAdminProductPageModel, type AdminProductSearchParams } from "@/lib/admin/product-page-model";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { ProductContentSection } from "./product-content-section";
import { ProductGeneralSection } from "./product-general-section";
import { ProductPublicationSection } from "./product-publication-section";

export const dynamic = "force-dynamic";

export default async function AdminProductPage({ searchParams }: { searchParams: Promise<AdminProductSearchParams> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const organization = administrativeOrganization(auth.identity);
  if (!organization) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel>
      </AppShell>
    );
  }

  const canEdit = organization.permissions.includes("journey.definition.manage");
  const canPublish = organization.permissions.includes("journey.definition.publish");
  const model = await loadAdminProductPageModel({
    query,
    actorUserAccountId: auth.identity.user_account_id,
    organizationId: organization.organization_id,
    canEdit,
    canPublish,
  });

  const {
    latestVersions,
    selectedVersionId,
    selectedJourneyVersion,
    selectedIsDraft,
    selectedIsPublished,
    canEditSelected,
    etapa,
    success,
    error,
    successTitle,
    successMessage,
    errorMessage,
  } = model;

  const href = (next: string) =>
    buildAdminProductStepHref(next, selectedJourneyVersion ? String(selectedJourneyVersion.id) : "");

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Jornadas"
          title="Jornadas e aulas"
          description="Crie, organize e publique a experiência de aprendizagem. Abra somente a parte que deseja alterar."
        />

        {!canEdit ? (
          <StatusPanel title="Acesso somente para visualização" tone="info">Você pode consultar a estrutura, mas não alterá-la.</StatusPanel>
        ) : null}

        <Card className="grid gap-4">
          <div>
            <h2 className="font-semibold text-secondary">Qual jornada deseja administrar?</h2>
            <p className="mt-1 text-sm text-muted">Cada jornada aparece uma única vez: como rascunho ou publicada.</p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="etapa" value={etapa} />
            <label className="grid min-w-72 flex-1 gap-1 text-sm font-medium text-ink">
              Jornada
              <Select name="versao" defaultValue={selectedVersionId}>
                <option value="">Criar nova jornada</option>
                {latestVersions.map((item) => (
                  <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · {versionStatus(item.status)}</option>
                ))}
              </Select>
            </label>
            <Button variant="secondary" type="submit">Abrir</Button>
          </form>
        </Card>

        {selectedIsDraft ? (
          <StatusPanel title="Rascunho" tone="info">Você pode editar livremente. Participantes só verão esta jornada depois da publicação.</StatusPanel>
        ) : null}
        {selectedIsPublished ? (
          <StatusPanel title="Jornada publicada" tone="warning">Salvar altera a experiência dos participantes no próximo carregamento. Para retirar a jornada do ar e continuar trabalhando, use “Voltar para rascunho” na etapa Publicação.</StatusPanel>
        ) : null}
        {selectedJourneyVersion && !canEditSelected && canEdit ? (
          <StatusPanel title="Edição restrita" tone="info">Você pode consultar esta jornada, mas não possui permissão para alterar conteúdo já publicado.</StatusPanel>
        ) : null}
        {success ? <StatusPanel title={successTitle} tone="success">{successMessage}</StatusPanel> : null}
        {error ? <StatusPanel title="Não foi possível concluir" tone="warning">{errorMessage}</StatusPanel> : null}

        <nav className="grid gap-2 rounded-2xl border border-border bg-white p-2 sm:grid-cols-3" aria-label="Etapas do construtor">
          {[
            { id: "geral", label: "1. Informações" },
            { id: "conteudo", label: "2. Trilhas e aulas" },
            { id: "publicacao", label: "3. Publicação" },
          ].map((item) => (
            <ButtonLink key={item.id} href={href(item.id)} variant={etapa === item.id ? "primary" : "ghost"} size="sm">
              {item.label}
            </ButtonLink>
          ))}
        </nav>

        <fieldset disabled={!canEditSelected} className="contents">
          {etapa === "geral" ? <ProductGeneralSection model={model} canEdit={canEdit} /> : null}
          {etapa === "conteudo" ? <ProductContentSection model={model} organizationId={organization.organization_id} /> : null}
          {etapa === "publicacao" ? <ProductPublicationSection model={model} canPublish={canPublish} /> : null}
        </fieldset>
      </div>
    </AppShell>
  );
}
