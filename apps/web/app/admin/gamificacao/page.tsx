import { AdminDisclosure, AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { saveGamificationResourceAction } from "./actions";
import { CertificateEditor } from "./certificate-editor";
import { CertificateIssuerManager } from "./certificate-issuer-manager";
import { CertificateTemplateManager } from "./certificate-template-manager";
import { HomeBadgeHighlights } from "./home-badge-highlights";
import { PointRuleEditor } from "./point-rule-editor";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

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
  const [workspace, homeBadgeHighlights] = await Promise.all([
    getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id),
    engagementRuntime.adminHomeBadgeHighlights(auth.identity.user_account_id, organization.organization_id),
  ]);
  const ruleVersions = workspace.rules.flatMap((item) => item.versions.map((version) => ({ id: String(version.id), definitionName: item.name, version_number: Number(version.version_number) })));
  const journeyVersions = workspace.journeys.filter((item) => item.status !== "retired").flatMap((item) => item.versions.map((version) => ({ id: String(version.id), definitionName: item.name, version_number: Number(version.version_number) })));
  const type = ["pontos", "selos", "certificados"].includes(single(query.tipo)) ? single(query.tipo) : "pontos";
  const activePointRules = workspace.point_rules.filter((item) => item.status !== "retired");
  const pointRuleEditorData = activePointRules.map((item) => ({ definition_id: item.definition_id, name: item.name, versions: item.versions.map((version) => ({ id: String(version.id), version_number: Number(version.version_number), status: String(version.status), amount: Number(version.amount ?? 10), eligibility_rule_version_id: String(version.eligibility_rule_version_id ?? ""), recurrence_policy: objectValue(version.recurrence_policy) })) }));
  const certificateEditorData = workspace.certificates.map((item) => ({ definition_id: item.definition_id, name: item.name, versions: item.versions.map((version) => ({ id: String(version.id), version_number: Number(version.version_number), status: String(version.status), journey_version_id: String(version.journey_version_id ?? ""), requirements_rule_version_id: String(version.requirements_rule_version_id ?? ""), template_file_object_id: typeof version.template_file_object_id === "string" ? version.template_file_object_id : null, validity_policy: objectValue(version.validity_policy), template_layout: objectValue(version.template_layout) })) }));

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
      <Card><h2 className="text-lg font-semibold text-ink">Regras em uso</h2><p className="mt-1 text-sm text-muted">Veja quais ações geram pontos, o valor e a frequência.</p>{activePointRules.length ? <TableScroll className="mt-4"><Table><thead><tr><Th>Ação</Th><Th>Pontos</Th><Th>Frequência</Th></tr></thead><tbody>{activePointRules.map((item) => { const version = [...item.versions].sort((a,b) => Number(b.version_number)-Number(a.version_number)).find((entry) => String(entry.status)==="published") ?? item.versions[0]; const recurrence=objectValue(version?.recurrence_policy); return <tr key={item.definition_id}><Td><strong>{item.name}</strong></Td><Td>{String(version?.amount ?? "—")}</Td><Td>{frequencyLabels[String(recurrence.scope ?? "")] ?? "Uma única vez"}</Td></tr>; })}</tbody></Table></TableScroll> : <p className="mt-4 text-sm text-muted">Nenhuma regra criada.</p>}</Card>
      <fieldset disabled={!canEdit} className="contents"><PointRuleEditor pointRules={pointRuleEditorData} eligibilityRules={ruleVersions} /></fieldset>
    </div> : null}

    {type === "selos" ? <fieldset disabled={!canEdit} className="contents"><div className="grid gap-5"><HomeBadgeHighlights workspace={homeBadgeHighlights} /><Card><div><h2 className="text-lg font-black text-secondary">Criar ou atualizar selo</h2><p className="mt-1 text-sm text-muted">Defina o título e o que ele reconhece.</p></div><form action={saveGamificationResourceAction} className="mt-5 grid gap-4"><input type="hidden" name="resource_type" value="badge" /><div className="grid gap-4 sm:grid-cols-2"><Label>Selo existente<Select name="definition_id"><option value="">Criar novo</option>{workspace.badges.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select></Label><Label>Título para o participante<Input name="title" required /></Label></div><Label>O que o selo reconhece<Textarea name="description" rows={3} required /></Label><AdminDisclosure title="Condição e disponibilidade" description="Abra para escolher quando o selo será concedido."><div className="grid gap-4 sm:grid-cols-2"><Label>Nome interno<Input name="name" required /></Label><Label>Condição para receber<Select name="criteria_rule_version_id" required><option value="">Selecione</option>{ruleVersions.map((item) => <option value={item.id} key={item.id}>{item.definitionName}</option>)}</Select></Label><Label>Disponibilidade<Select name="status"><option value="draft">Preparar sem mostrar</option><option value="published">Ativar agora</option></Select></Label></div></AdminDisclosure><Button type="submit" className="w-fit">Salvar selo</Button></form></Card></div></fieldset> : null}

    {type === "certificados" ? <fieldset disabled={!canEdit} className="contents"><div className="grid gap-5"><CertificateIssuerManager /><CertificateTemplateManager /><CertificateEditor certificates={certificateEditorData} journeyVersions={journeyVersions} ruleVersions={ruleVersions} /></div></fieldset> : null}
  </div></AppShell>;
}
