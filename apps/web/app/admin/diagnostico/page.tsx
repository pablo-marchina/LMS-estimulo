import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { saveDiagnosticAction } from "./actions";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

const ARCHETYPES = [
  { code: "fazedor", name: "Fazedor(a)" },
  { code: "batalhador", name: "Batalhador(a)" },
  { code: "construtor", name: "Construtor(a)" },
  { code: "navegador", name: "Navegador(a)" },
] as const;
const DIMENSIONS = [
  { code: "gestao_financeira", label: "Gestão financeira" },
  { code: "disciplina_habito", label: "Disciplina e hábito" },
  { code: "visao_planejamento", label: "Visão e planejamento" },
  { code: "perfil_empreendedor", label: "Perfil empreendedor" },
  { code: "credito_risco", label: "Relação com crédito e risco" },
] as const;

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Diagnóstico restrito" tone="warning">Seu papel não permite editar diagnósticos.</StatusPanel></AppShell>;

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const activeDiagnostics = workspace.diagnostics.filter((item) => item.status !== "retired");
  const versions = activeDiagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name, definitionId: item.definition_id, definitionCode: item.code, definitionPurpose: item.purpose })));
  const draftVersions = versions.filter((item) => item.status === "draft");
  const selectedVersionId = single(query.versao);
  const selectedVersion = (draftVersions.find((item) => String(item.id) === selectedVersionId) ?? null) as any;

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Personalização" title="Diagnóstico e perfis" description="Edite uma etapa por vez. Códigos e vínculos técnicos são gerados automaticamente." />

    <Card><form method="get" className="flex flex-wrap items-end gap-3"><Label className="min-w-72 flex-1">Rascunho para editar<Select name="versao" defaultValue={selectedVersionId}><option value="">Criar novo diagnóstico ou versão</option>{draftVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>)}</Select></Label><Button variant="secondary" type="submit">Abrir</Button></form></Card>
    {single(query.sucesso) ? <StatusPanel title="Diagnóstico salvo" tone="success">O rascunho foi versionado e registrado.</StatusPanel> : null}
    {single(query.erro) ? <StatusPanel title="Não foi possível salvar" tone="warning">Revise perguntas, opções e critérios.</StatusPanel> : null}

    <form action={saveDiagnosticAction} className="grid gap-5">
      <input type="hidden" name="definition_id" value={selectedVersion?.definitionId ?? ""} />
      <input type="hidden" name="version_id" value={selectedVersionId} />
      <input type="hidden" name="definition_code" value={selectedVersion?.definitionCode ?? ""} />

      <Card className="grid gap-4">
        <CardHeader className="flex-col items-start gap-1"><CardTitle>1. Identificação</CardTitle><p className="text-sm text-muted">Defina o objetivo antes de entrar nas perguntas.</p></CardHeader>
        <Label>Nome do diagnóstico<Input name="name" defaultValue={selectedVersion?.definitionName ?? ""} required /></Label>
        <Label>Propósito<Textarea name="purpose" rows={3} defaultValue={selectedVersion?.definitionPurpose ?? ""} required /></Label>
        <StatusPanel title="Rascunho institucional" tone="info">Publique somente depois da revisão metodológica da Estímulo.</StatusPanel>
      </Card>

      <details className="group rounded-xl border border-border bg-white" open>
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden"><span><strong className="text-ink">2. Perfis de resultado</strong><small className="mt-1 block text-muted">Textos apresentados após a classificação</small></span><ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">{ARCHETYPES.map((archetype) => <Label key={archetype.code}>{archetype.name}<Textarea name={`archetype_description_${archetype.code}`} rows={3} defaultValue={selectedVersion?.archetypes?.find((item: any) => item.code === archetype.code)?.description ?? ""} /></Label>)}</div>
      </details>

      <details className="group rounded-xl border border-border bg-white">
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden"><span><strong className="text-ink">3. Dimensões avaliadas</strong><small className="mt-1 block text-muted">Eixos usados para organizar as respostas</small></span><ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">{DIMENSIONS.map((dimension) => <Label key={dimension.code}>{dimension.label}<Input name={`dimension_name_${dimension.code}`} defaultValue={selectedVersion?.dimensions?.find((item: any) => item.code === dimension.code)?.name ?? dimension.label} /></Label>)}</div>
      </details>

      <details className="group rounded-xl border border-border bg-white">
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden"><span><strong className="text-ink">4. Perguntas</strong><small className="mt-1 block text-muted">Até 12 perguntas com quatro opções</small></span><ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-5 border-t border-border p-5">{(selectedVersion?.items?.length ? selectedVersion.items : Array.from({ length: 12 })).map((item: any, index: number) => <fieldset key={index} className="grid gap-3 rounded-xl border border-border bg-surface-muted/45 p-4"><legend className="px-1 text-sm font-semibold text-ink">Pergunta {index + 1}</legend><Label>Dimensão<Select name={`item_dimension_${index}`} defaultValue={item?.dimension_code ?? ""}><option value="">Selecione</option>{DIMENSIONS.map((dimension) => <option key={dimension.code} value={dimension.code}>{dimension.label}</option>)}</Select></Label><Label>Enunciado<Textarea name={`item_prompt_${index}`} rows={2} defaultValue={item?.prompt ?? ""} /></Label><div className="grid gap-3 sm:grid-cols-2">{[0,1,2,3].map((optionIndex) => <div key={optionIndex} className="grid grid-cols-[1fr_96px] gap-2"><Label>Opção {optionIndex + 1}<Input name={`item_option_label_${index}_${optionIndex}`} defaultValue={item?.options?.[optionIndex]?.label ?? ""} /></Label><Label>Pontos<Input name={`item_option_score_${index}_${optionIndex}`} type="number" defaultValue={item?.options?.[optionIndex]?.value?.score ?? ""} /></Label></div>)}</div></fieldset>)}</div>
      </details>

      <details className="group rounded-xl border border-border bg-white">
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden"><span><strong className="text-ink">5. Classificação</strong><small className="mt-1 block text-muted">Pontuação mínima por dimensão e perfil padrão</small></span><ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-5 border-t border-border p-5"><p className="text-sm text-muted">O primeiro perfil cujos limites forem atingidos será escolhido. Use o perfil padrão quando nenhum critério for atendido.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Perfil</th>{DIMENSIONS.map((dimension) => <th key={dimension.code} className="p-2 text-left">{dimension.label}</th>)}</tr></thead><tbody>{ARCHETYPES.map((archetype) => <tr key={archetype.code} className="border-t border-border"><td className="p-2 font-medium text-ink">{archetype.name}</td>{DIMENSIONS.map((dimension) => <td key={dimension.code} className="p-2"><Input name={`threshold_${archetype.code}_${dimension.code}`} type="number" placeholder="—" defaultValue={selectedVersion?.configuration?.classification_rules?.rules?.find((rule: any) => rule.archetype_code === archetype.code)?.thresholds?.[dimension.code] ?? ""} /></td>)}</tr>)}</tbody></table></div><Label>Perfil padrão<Select name="default_archetype_code" defaultValue={selectedVersion?.configuration?.classification_rules?.default_archetype_code ?? ""} required><option value="">Selecione</option>{ARCHETYPES.map((archetype) => <option key={archetype.code} value={archetype.code}>{archetype.name}</option>)}</Select></Label></div>
      </details>

      <Card className="grid gap-4 border-primary/20 bg-primary-soft/40"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-ink">6. Salvar ou publicar</h2><p className="mt-1 text-sm text-muted">A publicação torna a versão imediatamente disponível para participantes.</p></div><StatusPill tone={selectedVersion?.status === "published" ? "success" : "neutral"}>{selectedVersion?.status === "published" ? "Publicado" : "Rascunho"}</StatusPill></div><Label className="flex items-center gap-2.5"><input type="checkbox" name="status" value="published" className="size-4 accent-primary" />Publicar esta versão agora</Label><Button type="submit" className="w-fit">Salvar configuração</Button></Card>
    </form>

    <Card><CardHeader><CardTitle>Diagnósticos ativos</CardTitle></CardHeader><div className="grid gap-3 sm:grid-cols-2">{activeDiagnostics.map((item) => <div key={item.definition_id} className="rounded-xl border border-border p-4"><strong className="text-ink">{item.name}</strong><p className="mt-2 text-xs text-muted">{item.versions.length} versão(ões)</p></div>)}</div></Card>
  </div></AppShell>;
}