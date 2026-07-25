import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { buildInterviewAiUrl, externalSystems } from "@/lib/external-systems/registry";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ external_id?: string | string[] }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const operationalAccess = organization.permissions.some((permission) => ["journey.execution.read","journey.execution.manage","participant.manage","engagement.manage","diagnostic.configuration.manage"].includes(permission));
  if (!operationalAccess) return <AppShell area="admin" email={auth.email}><StatusPanel title="Integrações restritas" tone="warning">Seu papel não possui uma permissão operacional.</StatusPanel></AppShell>;

  const externalIdentifier = single(query.external_id).trim();
  let interviewUrl: string | null = null;
  let interviewError = false;
  if (externalIdentifier) { try { interviewUrl = buildInterviewAiUrl(externalIdentifier); } catch { interviewError = true; } }

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Sistemas existentes" title="Integrações" description="Atalhos controlados para sistemas externos. Nenhum acesso ou dado é compartilhado automaticamente." />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="grid gap-3"><h2 className="text-lg font-semibold text-ink">{externalSystems.trainingPlatform.name}</h2><p className="text-sm text-muted">Referência pública para cadastro e capacitação. O papel administrativo do LMS continua separado.</p><ButtonLink href={externalSystems.trainingPlatform.url} target="_blank" rel="noopener noreferrer" variant="secondary" className="w-fit">Abrir plataforma existente</ButtonLink></Card>
      <Card className="grid gap-3"><h2 className="text-lg font-semibold text-ink">{externalSystems.dataHub.name}</h2><p className="text-sm text-muted">Dashboards e análises externos, com sua própria camada de segurança.</p><ButtonLink href={externalSystems.dataHub.url} target="_blank" rel="noopener noreferrer" variant="secondary" className="w-fit">Abrir Data Hub</ButtonLink></Card>
    </div>
    <Card className="grid gap-4"><div><h2 className="text-lg font-semibold text-ink">{externalSystems.interviewAi.name}</h2><p className="mt-2 text-sm text-muted">Informe o identificador operacional e confirme que ele corresponde ao negócio correto.</p></div><form className="grid gap-3" method="get"><Label>Identificador externo<Input name="external_id" inputMode="numeric" pattern="[0-9]{1,20}" maxLength={20} defaultValue={externalIdentifier} required /></Label><Button variant="secondary" type="submit" className="w-fit">Validar endereço</Button></form>{interviewError ? <StatusPanel title="Identificador inválido" tone="warning">Use somente de 1 a 20 dígitos.</StatusPanel> : null}{interviewUrl ? <div className="grid gap-3"><StatusPanel title="Endereço preparado" tone="info">Confirme o negócio antes de abrir a ferramenta.</StatusPanel><ButtonLink href={interviewUrl} target="_blank" rel="noopener noreferrer" className="w-fit">Abrir IA de entrevista</ButtonLink></div> : null}</Card>
    <StatusPanel title="Sem sincronização implícita" tone="info">Esta tela apenas constrói links. Nenhum dado, token, entrevista ou resultado é copiado automaticamente.</StatusPanel>
  </div></AppShell>;
}