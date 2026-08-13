import { AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { getAdminGamificationWorkspace } from "@/lib/admin/gamification-management";
import type { DefinitionSummary, VersionSummary } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { BadgeEditor } from "./badge-editor";
import { CertificateEditor } from "./certificate-editor";
import { CertificateIssuerManager } from "./certificate-issuer-manager";
import { CertificateTemplateManager } from "./certificate-template-manager";
import { HomeBadgeHighlights } from "./home-badge-highlights";
import { PointRuleEditor } from "./point-rule-editor";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function definitions(value: unknown): DefinitionSummary[] { return Array.isArray(value) ? value as DefinitionSummary[] : []; }
function versionsOf(item: DefinitionSummary): VersionSummary[] { return Array.isArray(item.versions) ? item.versions : []; }

const frequencyLabels: Record<string, string> = {
  participant: "Uma única vez",
  enrollment_activity: "Uma vez por aula",
  enrollment_assessment: "Uma vez por avaliação",
  path: "Uma vez por trilha",
  journey: "Uma vez por jornada",
  participant_day: "Limite diário",
  participant_week: "Limite semanal",
  event: "Sem limite",
};

export default async function AdminGamificationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const canEdit = organization.permissions.includes("engagement.manage");
  const type = ["pontos", "selos", "certificados"].includes(single(query.tipo)) ? single(query.tipo) : "pontos";
  const workspace = await getAdminGamificationWorkspace(auth.identity.user_account_id, organization.organization_id).catch(() => null);
  if (!workspace) return <AppShell area="admin" email={auth.email}><div className="grid gap-6"><PageHeader eyebrow="Reconhecimento" title="Pontos, selos e certificados" description="Configure como a plataforma reconhece o progresso dos participantes." /><AdminSectionNav items={[{ href: "/admin/gamificacao?tipo=pontos", label: "Pontos", active: type === "pontos" },{ href: "/admin/gamificacao?tipo=selos", label: "Selos", active: type === "selos" },{ href: "/admin/gamificacao?tipo=certificados", label: "Certificados", active: type === "certificados" }]} /><StatusPanel title="Pontuação temporariamente indisponível" tone="warning">A página abriu, mas os dados de reconhecimento não puderam ser carregados. Nenhuma configuração foi alterada.</StatusPanel></div></AppShell>;

  const rules = definitions(workspace.rules);
  const journeys = definitions(workspace.journeys);
  const pointRules = definitions(workspace.point_rules);
  const badges = definitions(workspace.badges);
  const certificates = definitions(workspace.certificates);
  const homeBadgeHighlights = type === "selos"
    ? await engagementRuntime.adminHomeBadgeHighlights(auth.identity.user_account_id, organization.organization_id).catch(() => null)
    : null;
  const ruleVersions = rules.flatMap((item) => versionsOf(item).filter((version) => version.status === "published").map((version) => ({ id: String(version.id), definitionName: item.name, version_number: Number(version.version_number) })));
  const journeyVersions = journeys.filter((item) => item.status !== "retired").flatMap((item) => versionsOf(item).map((version) => ({ id: String(version.id), definitionName: item.name, version_number: Number(version.version_number) })));
  const activePointRules = pointRules.filter((item) => item.status !== "retired");
  const pointRuleEditorData = activePointRules.map((item) => ({ definition_id: item.definition_id, name: item.name, versions: versionsOf(item).map((version) => ({ id: String(version.id), version_number: Number(version.version_number), status: String(version.status), amount: Number(version.amount ?? 10), eligibility_rule_version_id: String(version.eligibility_rule_version_id ?? ""), recurrence_policy: objectValue(version.recurrence_policy) })) }));
  const badgeEditorData = badges.filter((item) => item.status !== "retired").map((item) => ({ definition_id: item.definition_id, name: item.name, versions: versionsOf(item).map((version) => ({ id: String(version.id), version_number: Number(version.version_number), status: String(version.status), title: String(version.title ?? item.name), description: String(version.description ?? ""), criteria_rule_version_id: String(version.criteria_rule_version_id ?? "") })) }));
  const certificateEditorData = certificates.map((item) => ({ definition_id: item.definition_id, name: item.name, versions: versionsOf(item).map((version) => ({ id: String(version.id), version_number: Number(version.version_number), status: String(version.status), journey_version_id: String(version.journey_version_id ?? ""), requirements_rule_version_id: String(version.requirements_rule_version_id ?? ""), template_file_object_id: typeof version.template_file_object_id === "string" ? version.template_file_object_id : null, validity_policy: objectValue(version.validity_policy), template_layout: objectValue(version.template_layout) })) }));

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Reconhecimento" title="Pontos, selos e certificados" description="Configure como a plataforma reconhece o progresso dos participantes." />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">As configurações estão visíveis, mas não podem ser alteradas.</StatusPanel> : null}
    <AdminSectionNav items={[
      { href: "/admin/gamificacao?tipo=pontos", label: "Pontos", active: type === "pontos" },
      { href: "/admin/gamificacao?tipo=selos", label: "Selos", active: type === "selos" },
      { href: "/admin/gamificacao?tipo=certificados", label: "Certificados", active: type === "certificados" },
    ]} />
    {single(query.sucesso) ? <StatusPanel title="Configuração salva" tone="success">A alteração já foi registrada.</StatusPanel> : null}
    {single(query.erro) ? <StatusPanel title="Não foi possível salvar" tone="warning">Revise os campos e tente novamente.</StatusPanel> : null}

    {type === "pontos" ? <div className="grid gap-5">
      <Card><h2 className="text-lg font-semibold text-ink">Regras em uso</h2><p className="mt-1 text-sm text-muted">Veja quais ações geram pontos, o valor e a frequência.</p>{activePointRules.length ? <TableScroll className="mt-4"><Table><thead><tr><Th>Ação</Th><Th>Pontos</Th><Th>Frequência</Th></tr></thead><tbody>{activePointRules.map((item) => { const itemVersions = versionsOf(item); const version = [...itemVersions].sort((a,b) => Number(b.version_number)-Number(a.version_number)).find((entry) => String(entry.status)==="published") ?? itemVersions[0]; const recurrence=objectValue(version?.recurrence_policy); const frequencyLabel = recurrence.frequency === "per_certificate" ? "Uma vez por certificado" : frequencyLabels[String(recurrence.scope ?? "")] ?? "Uma única vez"; return <tr key={item.definition_id}><Td><strong>{item.name}</strong></Td><Td>{String(version?.amount ?? "—")}</Td><Td>{frequencyLabel}</Td></tr>; })}</tbody></Table></TableScroll> : <p className="mt-4 text-sm text-muted">Nenhuma regra criada.</p>}</Card>
      <fieldset disabled={!canEdit} className="contents"><PointRuleEditor pointRules={pointRuleEditorData} eligibilityRules={ruleVersions} /></fieldset>
    </div> : null}

    {type === "selos" ? <fieldset disabled={!canEdit} className="contents"><div className="grid gap-5">{homeBadgeHighlights ? <HomeBadgeHighlights workspace={homeBadgeHighlights} /> : <StatusPanel title="Destaques da Home indisponíveis" tone="warning">Os selos continuam acessíveis. Apenas a configuração opcional de destaques não pôde ser carregada.</StatusPanel>}<BadgeEditor badges={badgeEditorData} ruleVersions={ruleVersions} /></div></fieldset> : null}

    {type === "certificados" ? <fieldset disabled={!canEdit} className="contents"><div className="grid gap-5"><CertificateIssuerManager /><CertificateTemplateManager /><CertificateEditor certificates={certificateEditorData} journeyVersions={journeyVersions} ruleVersions={ruleVersions} /></div></fieldset> : null}
  </div></AppShell>;
}
