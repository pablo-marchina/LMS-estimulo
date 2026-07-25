import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { maturityPreviewRuntime } from "@/lib/admin/maturity-preview";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { calculateMaturityPreview, maturityDimensions, type MaturityAnswer, type MaturityDimensionCode } from "@/lib/maturity/engine";

export const dynamic = "force-dynamic";
type Query = Record<string, string | string[] | undefined>;
const blockerLabels: Record<string, string> = { methodology_owner_approval: "Aprovação do responsável pela metodologia", question_wording_review: "Revisão da redação das perguntas", threshold_validation: "Validação dos limites dos níveis", fairness_and_bias_review: "Revisão de equidade e vieses", privacy_and_legal_approval: "Aprovação jurídica e de privacidade", learning_path_mapping_approval: "Aprovação do vínculo com as trilhas" };
const segmentLabels = { base: "Base", traction: "Tração", evolution: "Evolução" } as const;
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function previewAnswers(query: Query): MaturityAnswer[] | null { const values:MaturityAnswer[]=[]; for (const dimension of maturityDimensions) { const raw=single(query[`score_${dimension.code}`]); if (raw===undefined||raw==="") return null; values.push({ dimension: dimension.code, score:Number(raw) }); } return values; }
function dimensionLabel(code: MaturityDimensionCode) { return maturityDimensions.find((dimension) => dimension.code===code)?.label ?? code; }

export default async function MaturityConfigurationPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Revisão restrita" tone="warning">Seu papel não permite revisar o diagnóstico de maturidade.</StatusPanel></AppShell>;
  const workspace = await maturityPreviewRuntime.get(auth.identity.user_account_id, organization.organization_id);
  const answers = previewAnswers(query);
  const calculation = answers ? calculateMaturityPreview(answers) : null;
  const view = single(query.view) === "governanca" ? "governanca" : "simulacao";

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Configuração versionada" title="Maturidade do negócio" description="Prévia educacional do rascunho. A simulação não salva respostas e não envia dados a sistemas externos." />
    <nav className="grid gap-2 rounded-xl border border-border bg-white p-2 sm:grid-cols-2"><ButtonLink href="/admin/maturidade?view=simulacao" variant={view === "simulacao" ? "primary" : "ghost"} size="sm">Simular diagnóstico</ButtonLink><ButtonLink href="/admin/maturidade?view=governanca" variant={view === "governanca" ? "primary" : "ghost"} size="sm">Governança e revisão</ButtonLink></nav>

    {view === "simulacao" ? <>
      <StatusPanel title="Simulação local" tone="info">Nenhum resultado é gravado, usado para crédito ou aplicado a participantes.</StatusPanel>
      <form className="grid gap-4" method="get"><input type="hidden" name="view" value="simulacao" />{workspace.dimensions.map((dimension) => { const current=single(query[`score_${dimension.code}`]); return <Card key={dimension.id}><fieldset className="grid gap-2"><legend className="font-semibold text-ink">{dimension.position}. {dimension.name}</legend><p className="text-sm text-muted">{dimension.item.prompt}</p><Label>Resposta<Select name={`score_${dimension.code}`} defaultValue={current ?? ""} required><option value="" disabled>Selecione</option>{dimension.item.options.map((option) => <option value={String(option.value.score)} key={option.id}>{option.label}</option>)}</Select></Label></fieldset></Card>; })}<Button type="submit" className="w-fit">Calcular prévia local</Button></form>
      {calculation?.status === "calculated" ? <Card aria-labelledby="resultado-previa"><CardHeader><CardTitle id="resultado-previa">Resultado da prévia</CardTitle></CardHeader><p className="text-2xl font-bold text-ink">{calculation.overallScore}% <span className="text-base font-medium text-muted">· {segmentLabels[calculation.segment]}</span></p><p className="mt-2 text-sm text-ink">Dimensão de foco: <strong>{dimensionLabel(calculation.focusDimension)}</strong>.</p><dl className="mt-4 grid gap-2 sm:grid-cols-2">{maturityDimensions.map((dimension) => <div key={dimension.code} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm"><dt className="text-muted">{dimension.label}</dt><dd className="font-semibold text-ink">{calculation.dimensionScores[dimension.code]}%</dd></div>)}</dl></Card> : null}
      {calculation?.status === "abstained" ? <StatusPanel title="Cálculo não realizado" tone="warning">As respostas não atendem ao contrato do rascunho: {calculation.reason}.</StatusPanel> : null}
    </> : null}

    {view === "governanca" ? <>
      <StatusPanel title="Ativação bloqueada" tone="warning">Versão {workspace.version.version_number} · uso em crédito proibido · sincronização com CRM desativada até aprovação.</StatusPanel>
      <Card><CardHeader><CardTitle>Pendências para homologação</CardTitle></CardHeader><ul className="grid gap-2 text-sm text-ink">{workspace.version.configuration.publication_blockers.map((blocker) => <li key={blocker} className="flex items-start gap-2.5"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />{blockerLabels[blocker] ?? blocker}</li>)}</ul></Card>
      <section className="grid gap-4"><h2 className="text-xl font-semibold text-ink">Perguntas versionadas</h2><div className="grid gap-4">{workspace.dimensions.map((dimension) => <Card key={`review:${dimension.id}`}><h3 className="font-semibold text-ink">{dimension.name}</h3><p className="mt-1 text-sm text-muted">{dimension.description}</p><p className="mt-3 text-sm font-semibold text-ink">{dimension.item.prompt}</p><ol className="mt-2 grid gap-1.5 text-sm text-ink">{dimension.item.options.map((option) => <li key={option.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3.5 py-2"><span>{option.label}</span><Badge>{option.value.score}</Badge></li>)}</ol></Card>)}</div></section>
      <section className="grid gap-4"><h2 className="text-xl font-semibold text-ink">Segmentos ainda não publicados</h2><div className="grid gap-4 sm:grid-cols-3">{workspace.segments.map((segment) => <Card key={segment.version_id}><h3 className="font-semibold text-ink">{segment.name}</h3><p className="mt-1 text-sm text-muted">{segment.description}</p><StatusPill tone="neutral" className="mt-3">Estado: {segment.status}</StatusPill></Card>)}</div></section>
    </> : null}
  </div></AppShell>;
}