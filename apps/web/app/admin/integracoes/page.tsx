import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
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
    return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com uma identidade confirmada.</p></StatusPanel></main>;
  }
  const requestedOrganization = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requestedOrganization)
    ?? auth.identity.organizations[0];
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;
  }
  const operationalAccess = organization.permissions.some((permission) => [
    "journey.execution.read",
    "journey.execution.manage",
    "participant.manage",
    "engagement.manage",
    "diagnostic.configuration.manage",
  ].includes(permission));
  if (!operationalAccess) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Integrações restritas" tone="warning"><p>Este vínculo não possui uma permissão operacional explícita.</p></StatusPanel></AppShell>;
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

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading">
      <p className="eyebrow">Sistemas existentes</p>
      <h1>Integrações e superfícies externas</h1>
      <p>Atalhos controlados para capacidades já disponíveis. O LMS não replica esses sistemas, não herda suas permissões e não envia dados automaticamente por esta página.</p>
    </header>

    <form className="inline-form" method="get">
      <label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}</select></label>
      <button className="button button--secondary" type="submit">Selecionar</button>
    </form>

    <section className="card stack">
      <h2>{externalSystems.trainingPlatform.name}</h2>
      <p>Referência pública para cadastro, diagnóstico e experiência de capacitação. O papel administrativo continua manual e separado do domínio do e-mail.</p>
      <a className="button button--secondary" href={externalSystems.trainingPlatform.url} target="_blank" rel="noopener noreferrer">Abrir plataforma existente</a>
    </section>

    <section className="card stack">
      <h2>{externalSystems.interviewAi.name}</h2>
      <p>A ferramenta externa exige um identificador informado pelo operador. A semântica exata desse campo no HubSpot ainda não foi comprovada; esta página não classifica como Lead, Deal, contato ou objeto personalizado.</p>
      <form className="stack" method="get">
        <input type="hidden" name="organization" value={organization.organization_id} />
        <label>Identificador externo informado<input name="external_id" inputMode="numeric" pattern="[0-9]{1,20}" maxLength={20} defaultValue={externalIdentifier} required /></label>
        <button className="button button--secondary" type="submit">Validar endereço</button>
      </form>
      {interviewError ? <StatusPanel title="Identificador inválido" tone="warning"><p>Use somente de 1 a 20 dígitos.</p></StatusPanel> : null}
      {interviewUrl ? <div className="stack">
        <StatusPanel title="Endereço preparado" tone="info"><p>Confirme no processo operacional que o identificador corresponde ao negócio correto antes de abrir a ferramenta.</p></StatusPanel>
        <a className="button button--primary" href={interviewUrl} target="_blank" rel="noopener noreferrer">Abrir IA de entrevista</a>
      </div> : null}
    </section>

    <section className="card stack">
      <h2>{externalSystems.dataHub.name}</h2>
      <p>Repositório externo de dashboards e análises. O acesso por domínio ao Data Hub não concede papel administrativo no LMS, e cada BI mantém sua própria camada de segurança.</p>
      <a className="button button--secondary" href={externalSystems.dataHub.url} target="_blank" rel="noopener noreferrer">Abrir Data Hub</a>
    </section>

    <StatusPanel title="Sem sincronização implícita" tone="info">
      <p>Esta superfície apenas constrói links. Nenhum dado, token, entrevista ou resultado é copiado para o LMS ou HubSpot.</p>
    </StatusPanel>
  </AppShell>;
}
