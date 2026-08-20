import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  getAdminProductErrorMessage,
  getAdminProductSuccessNotice,
} from "@/lib/admin/product-page-messages.mjs";
import { loadAdminProductPageModel } from "@/lib/admin/product-page-model";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { JourneyContentSection } from "./journey-content-section";
import { JourneyGeneralSection } from "./journey-general-section";
import { JourneyPublicationSection } from "./journey-publication-section";
import { JourneySelector } from "./journey-selector";

export const dynamic = "force-dynamic";

export default async function AdminProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();

  if (auth.status !== "authenticated") return null;

  const organization = administrativeOrganization(auth.identity);
  if (!organization) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Área indisponível" tone="warning">
          Seu usuário não está vinculado à Estímulo.
        </StatusPanel>
      </AppShell>
    );
  }

  const model = await loadAdminProductPageModel({
    actorUserAccountId: auth.identity.user_account_id,
    organizationId: organization.organization_id,
    permissions: organization.permissions,
    query,
  });

  const base = model.selectedJourneyVersion
    ? `versao=${model.selectedJourneyVersion.id}`
    : "";
  const href = (next: string) =>
    `/admin/produto?etapa=${next}${base ? `&${base}` : ""}`;
  const successNotice = getAdminProductSuccessNotice(model.success);
  const errorMessage = getAdminProductErrorMessage(model.error);

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Jornadas"
          title="Jornadas e aulas"
          description="Crie, organize e publique a experiência de aprendizagem. Abra somente a parte que deseja alterar."
        />

        {!model.canEdit ? (
          <StatusPanel title="Acesso somente para visualização" tone="info">
            Você pode consultar a estrutura, mas não alterá-la.
          </StatusPanel>
        ) : null}

        <JourneySelector model={model} />

        {model.selectedIsDraft ? (
          <StatusPanel title="Rascunho" tone="info">
            Você pode editar livremente. Participantes só verão esta jornada
            depois da publicação.
          </StatusPanel>
        ) : null}

        {model.selectedIsPublished ? (
          <StatusPanel title="Jornada publicada" tone="warning">
            Salvar altera a experiência dos participantes no próximo
            carregamento. Para retirar a jornada do ar e continuar trabalhando,
            use “Voltar para rascunho” na etapa Publicação.
          </StatusPanel>
        ) : null}

        {model.selectedJourneyVersion &&
        !model.canEditSelected &&
        model.canEdit ? (
          <StatusPanel title="Edição restrita" tone="info">
            Você pode consultar esta jornada, mas não possui permissão para
            alterar conteúdo já publicado.
          </StatusPanel>
        ) : null}

        {model.success ? (
          <StatusPanel title={successNotice.title} tone="success">
            {successNotice.message}
          </StatusPanel>
        ) : null}

        {model.error ? (
          <StatusPanel title="Não foi possível concluir" tone="warning">
            {errorMessage}
          </StatusPanel>
        ) : null}

        <nav
          className="grid gap-2 rounded-2xl border border-border bg-white p-2 sm:grid-cols-3"
          aria-label="Etapas do construtor"
        >
          {[
            { id: "geral", label: "1. Informações" },
            { id: "conteudo", label: "2. Trilhas e aulas" },
            { id: "publicacao", label: "3. Publicação" },
          ].map((item) => (
            <ButtonLink
              key={item.id}
              href={href(item.id)}
              variant={model.etapa === item.id ? "primary" : "ghost"}
              size="sm"
            >
              {item.label}
            </ButtonLink>
          ))}
        </nav>

        <fieldset disabled={!model.canEditSelected} className="contents">
          <JourneyGeneralSection model={model} />
          <JourneyContentSection
            model={model}
            organizationId={organization.organization_id}
          />
          <JourneyPublicationSection model={model} />
        </fieldset>
      </div>
    </AppShell>
  );
}
