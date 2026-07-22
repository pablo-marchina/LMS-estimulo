import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { buildInterviewAiUrl, externalSystems } from "@/lib/external-systems/registry";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string | string[]; external_id?: string | string[] }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return (
      <main className="grid min-h-screen place-items-center gap-6 bg-surface-muted p-6">
        <StatusPanel title="Acesso indisponível" tone="warning">
          <p>Entre com uma identidade confirmada.</p>
        </StatusPanel>
      </main>
    );
  }
  const requestedOrganization = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requestedOrganization)
    ?? auth.identity.organizations[0];
  if (!organization) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Área indisponível" tone="warning">
          <p>Nenhuma organização ativa foi encontrada.</p>
        </StatusPanel>
      </AppShell>
    );
  }
  const operationalAccess = organization.permissions.some((permission) => [
    "journey.execution.read",
    "journey.execution.manage",
    "participant.manage",
    "engagement.manage",
    "diagnostic.configuration.manage",
  ].includes(permission));
  if (!operationalAccess) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Integrações restritas" tone="warning">
          <p>Este vínculo não possui uma permissão operacional explícita.</p>
        </StatusPanel>
      </AppShell>
    );
  }

  const externalIdentifier = single(query.external_id).trim();
  let interviewUrl: string | null = null;
  let interviewError = false;
  if (externalIdentifier) {
    try {
      interviewUrl = buildInterviewAiUrl(externalIdentifier);
    } catch {
      interviewError = true;
    }
  }

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Sistemas existentes"
          title="Integrações e superfícies externas"
          description="Atalhos controlados para capacidades já disponíveis. O LMS não replica esses sistemas, não herda suas permissões e não envia dados automaticamente por esta página."
        />

        <Card>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <Label className="min-w-56">
              Organização
              <Select name="organization" defaultValue={organization.organization_id}>
                {auth.identity.organizations.map((item) => (
                  <option value={item.organization_id} key={item.organization_id}>
                    {item.display_name}
                  </option>
                ))}
              </Select>
            </Label>
            <Button variant="secondary" type="submit">
              Selecionar
            </Button>
          </form>
        </Card>

        <Card className="grid gap-3">
          <h2 className="text-lg font-semibold text-ink">{externalSystems.trainingPlatform.name}</h2>
          <p className="text-sm text-muted">
            Referência pública para cadastro, diagnóstico e experiência de capacitação. O papel administrativo continua manual e separado do domínio do e-mail.
          </p>
          <ButtonLink
            href={externalSystems.trainingPlatform.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            className="w-fit"
          >
            Abrir plataforma existente
          </ButtonLink>
        </Card>

        <Card className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{externalSystems.interviewAi.name}</h2>
            <p className="mt-2 text-sm text-muted">
              A ferramenta externa exige um identificador informado pelo operador. A semântica exata desse campo no HubSpot ainda não foi comprovada; esta página não classifica como Lead, Deal, contato ou objeto personalizado.
            </p>
          </div>
          <form className="grid gap-3" method="get">
            <input type="hidden" name="organization" value={organization.organization_id} />
            <Label>
              Identificador externo informado
              <Input
                name="external_id"
                inputMode="numeric"
                pattern="[0-9]{1,20}"
                maxLength={20}
                defaultValue={externalIdentifier}
                required
              />
            </Label>
            <Button variant="secondary" type="submit" className="w-fit">
              Validar endereço
            </Button>
          </form>
          {interviewError ? (
            <StatusPanel title="Identificador inválido" tone="warning">
              <p>Use somente de 1 a 20 dígitos.</p>
            </StatusPanel>
          ) : null}
          {interviewUrl ? (
            <div className="grid gap-3">
              <StatusPanel title="Endereço preparado" tone="info">
                <p>Confirme no processo operacional que o identificador corresponde ao negócio correto antes de abrir a ferramenta.</p>
              </StatusPanel>
              <ButtonLink href={interviewUrl} target="_blank" rel="noopener noreferrer" className="w-fit">
                Abrir IA de entrevista
              </ButtonLink>
            </div>
          ) : null}
        </Card>

        <Card className="grid gap-3">
          <h2 className="text-lg font-semibold text-ink">{externalSystems.dataHub.name}</h2>
          <p className="text-sm text-muted">
            Repositório externo de dashboards e análises. O acesso por domínio ao Data Hub não concede papel administrativo no LMS, e cada BI mantém sua própria camada de segurança.
          </p>
          <ButtonLink
            href={externalSystems.dataHub.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            className="w-fit"
          >
            Abrir Data Hub
          </ButtonLink>
        </Card>

        <StatusPanel title="Sem sincronização implícita" tone="info">
          <p>Esta superfície apenas constrói links. Nenhum dado, token, entrevista ou resultado é copiado para o LMS ou HubSpot.</p>
        </StatusPanel>
      </div>
    </AppShell>
  );
}
