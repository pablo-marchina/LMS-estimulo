import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { maturityPreviewRuntime } from "@/lib/admin/maturity-preview";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { calculateMaturityPreview, maturityDimensions, type MaturityAnswer, type MaturityDimensionCode } from "@/lib/maturity/engine";

export const dynamic = "force-dynamic";
type Query = Record<string, string | string[] | undefined>;
const segmentLabels = { base: "Base", traction: "Tração", evolution: "Evolução" } as const;
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function previewAnswers(query: Query): MaturityAnswer[] | null { const values:MaturityAnswer[]=[]; for (const dimension of maturityDimensions) { const raw=single(query[`score_${dimension.code}`]); if (raw===undefined||raw==="") return null; values.push({ dimension: dimension.code, score:Number(raw) }); } return values; }
function dimensionLabel(code: MaturityDimensionCode) { return maturityDimensions.find((dimension) => dimension.code===code)?.label ?? code; }

export default async function MaturityConfigurationPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const workspace = await maturityPreviewRuntime.get(auth.identity.user_account_id, organization.organization_id);
  const answers = previewAnswers(query);
  const calculation = answers ? calculateMaturityPreview(answers) : null;

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Simulação educacional" title="Maturidade do negócio" description="Teste respostas e visualize o resultado localmente. A simulação não salva dados nem envia informações a sistemas externos." />
    <StatusPanel title="Simulação local" tone="info">Nenhum resultado é gravado, usado para crédito ou aplicado a participantes.</StatusPanel>
    <form className="grid gap-4" method="get">{workspace.dimensions.map((dimension) => { const current=single(query[`score_${dimension.code}`]); return <Card key={dimension.id}><fieldset className="grid gap-2"><legend className="font-semibold text-ink">{dimension.position}. {dimension.name}</legend><p className="text-sm text-muted">{dimension.item.prompt}</p><Label>Resposta<Select name={`score_${dimension.code}`} defaultValue={current ?? ""} required><option value="" disabled>Selecione</option>{dimension.item.options.map((option) => <option value={String(option.value.score)} key={option.id}>{option.label}</option>)}</Select></Label></fieldset></Card>; })}<Button type="submit" className="w-fit">Calcular prévia local</Button></form>
    {calculation?.status === "calculated" ? <Card aria-labelledby="resultado-previa"><CardHeader><CardTitle id="resultado-previa">Resultado da prévia</CardTitle></CardHeader><p className="text-2xl font-bold text-ink">{calculation.overallScore}% <span className="text-base font-medium text-muted">· {segmentLabels[calculation.segment]}</span></p><p className="mt-2 text-sm text-ink">Dimensão de foco: <strong>{dimensionLabel(calculation.focusDimension)}</strong>.</p><dl className="mt-4 grid gap-2 sm:grid-cols-2">{maturityDimensions.map((dimension) => <div key={dimension.code} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm"><dt className="text-muted">{dimension.label}</dt><dd className="font-semibold text-ink">{calculation.dimensionScores[dimension.code]}%</dd></div>)}</dl></Card> : null}
    {calculation?.status === "abstained" ? <StatusPanel title="Cálculo não realizado" tone="warning">As respostas não atendem ao contrato do rascunho: {calculation.reason}.</StatusPanel> : null}
  </div></AppShell>;
}
