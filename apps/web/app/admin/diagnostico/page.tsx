import { randomUUID } from "node:crypto";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { retireDiagnosticAction, saveDiagnosticAction } from "./actions";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
const ARCHETYPES = [{ code: "fazedor", name: "Fazedor(a)" },{ code: "batalhador", name: "Batalhador(a)" },{ code: "construtor", name: "Construtor(a)" },{ code: "navegador", name: "Navegador(a)" }] as const;
const DIMENSIONS = [{ code: "gestao_financeira", label: "Gestão financeira" },{ code: "disciplina_habito", label: "Disciplina e hábito" },{ code: "visao_planejamento", label: "Visão e planejamento" },{ code: "perfil_empreendedor", label: "Perfil empreendedor" },{ code: "credito_risco", label: "Relação com crédito e risco" }] as const;

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const canEdit = organization.permissions.includes("diagnostic.configuration.manage");
  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const activeDiagnostics = workspace.diagnostics.filter((item) => item.status !== "retired");
  const versions = activeDiagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name, definitionId: item.definition_id, definitionCode: item.code, definitionPurpose: item.purpose })));
  const draftVersions = versions.filter((item) => item.status === "draft");
  const selectedVersionId = single(query.versao);
  const selectedVersion = (draftVersions.find((item) => String(item.id) === selectedVersionId) ?? null) as any;
  const questions = selectedVersion?.items?.length ? selectedVersion.items : Array.from({ length: 12 });

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Personalização" title="Diagnósticos e perfis" description="Edite uma parte por vez. As configurações secundárias permanecem recolhidas até serem abertas." />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode consultar os diagnósticos, mas não criar, publicar ou excluir versões.</StatusPanel> : null}
    <Card><form method="get" className="flex flex-wrap items-end gap-3"><Label className="min-w-72 flex-1">Diagnóstico em rascunho<Select name="versao" defaultValue={selectedVersionId}><option value="">Criar novo diagnóstico</option>{draftVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>)}</Select><span className="text-[11px] font-normal text-muted">Versões publicadas não aparecem aqui; crie um novo rascunho para mudanças metodológicas.</span></Label><Button variant="secondary" type="submit">Abrir</Button></form></Card>
    {single(query.sucesso) === "excluido" ? <StatusPanel title="Diagnóstico excluído" tone="success">A definição foi retirada do painel e os resultados históricos foram preservados.</StatusPanel> : single(query.sucesso) ? <StatusPanel title="Rascunho salvo" tone="success">A configuração foi registrada.</StatusPanel> : null}
    {single(query.erro) ? <StatusPanel title="Alteração não concluída" tone="warning">Revise os dados e sua confirmação.</StatusPanel> : null}

    <fieldset disabled={!canEdit} className="contents">
      <form action={saveDiagnosticAction} className="grid gap-4">
        <input type="hidden" name="definition_id" value={selectedVersion?.definitionId ?? ""} /><input type="hidden" name="version_id" value={selectedVersionId} /><input type="hidden" name="definition_code" value={selectedVersion?.definitionCode ?? ""} />
        <Card className="grid gap-4"><div><h2 className="text-lg font-black text-secondary">Informações principais</h2><p className="mt-1 text-sm text-muted">Estes são os únicos campos necessários para iniciar o rascunho.</p></div><Label>Nome do diagnóstico<Input name="name" defaultValue={selectedVersion?.definitionName ?? ""} required /><span className="text-[11px] font-normal text-muted">Nome interno usado pela equipe.</span></Label><Label>Objetivo<Textarea name="purpose" rows={3} defaultValue={selectedVersion?.definitionPurpose ?? ""} required /><span className="text-[11px] font-normal text-muted">Explique o que o diagnóstico pretende compreender.</span></Label></Card>

        <AdminDisclosure title="Perfis de resultado" description="Textos apresentados depois da classificação.">
          <div className="grid gap-4 sm:grid-cols-2">{ARCHETYPES.map((archetype) => <Label key={archetype.code}>{archetype.name}<Textarea name={`archetype_description_${archetype.code}`} rows={3} defaultValue={selectedVersion?.archetypes?.find((item: any) => item.code === archetype.code)?.description ?? ""} /><span className="text-[11px] font-normal text-muted">Descrição que ajuda a pessoa a interpretar o próprio perfil.</span></Label>)}</div>
        </AdminDisclosure>

        <AdminDisclosure title="Dimensões avaliadas" description="Eixos usados para organizar perguntas e resultados.">
          <div className="grid gap-4 sm:grid-cols-2">{DIMENSIONS.map((dimension) => <Label key={dimension.code}>{dimension.label}<Input name={`dimension_name_${dimension.code}`} defaultValue={selectedVersion?.dimensions?.find((item: any) => item.code === dimension.code)?.name ?? dimension.label} /></Label>)}</div>
        </AdminDisclosure>

        <AdminDisclosure title="Perguntas" description="Abra somente a pergunta que deseja editar. Campos vazios não serão incluídos.">
          <div className="grid gap-3">{questions.map((item: any, index: number) => <details key={index} className="rounded-xl border border-border bg-surface-muted/35"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Pergunta {index + 1}{item?.prompt ? ` · ${item.prompt}` : ""}</summary><fieldset className="grid gap-3 border-t border-border p-4"><Label>Dimensão<Select name={`item_dimension_${index}`} defaultValue={item?.dimension_code ?? ""}><option value="">Selecione</option>{DIMENSIONS.map((dimension) => <option key={dimension.code} value={dimension.code}>{dimension.label}</option>)}</Select><span className="text-[11px] font-normal text-muted">Determina em qual resultado esta resposta terá efeito.</span></Label><Label>Enunciado<Textarea name={`item_prompt_${index}`} rows={2} defaultValue={item?.prompt ?? ""} /></Label><div className="grid gap-3 sm:grid-cols-2">{[0,1,2,3].map((optionIndex) => <div key={optionIndex} className="grid grid-cols-[1fr_96px] gap-2"><Label>Resposta {optionIndex + 1}<Input name={`item_option_label_${index}_${optionIndex}`} defaultValue={item?.options?.[optionIndex]?.label ?? ""} /></Label><Label>Pontos<Input name={`item_option_score_${index}_${optionIndex}`} type="number" defaultValue={item?.options?.[optionIndex]?.value?.score ?? ""} /></Label></div>)}</div></fieldset></details>)}</div>
        </AdminDisclosure>

        <AdminDisclosure title="Regras de classificação" description="Configuração metodológica avançada: limites por perfil e resultado padrão.">
          <div className="grid gap-5"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Perfil</th>{DIMENSIONS.map((dimension) => <th key={dimension.code} className="p-2 text-left">{dimension.label}</th>)}</tr></thead><tbody>{ARCHETYPES.map((archetype) => <tr key={archetype.code} className="border-t border-border"><td className="p-2 font-medium text-ink">{archetype.name}</td>{DIMENSIONS.map((dimension) => <td key={dimension.code} className="p-2"><Input name={`threshold_${archetype.code}_${dimension.code}`} type="number" placeholder="—" defaultValue={selectedVersion?.configuration?.classification_rules?.rules?.find((rule: any) => rule.archetype_code === archetype.code)?.thresholds?.[dimension.code] ?? ""} /></td>)}</tr>)}</tbody></table></div><Label>Perfil usado quando nenhuma regra específica é atendida<Select name="default_archetype_code" defaultValue={selectedVersion?.configuration?.classification_rules?.default_archetype_code ?? ""} required><option value="">Selecione</option>{ARCHETYPES.map((archetype) => <option key={archetype.code} value={archetype.code}>{archetype.name}</option>)}</Select></Label></div>
        </AdminDisclosure>

        <Card className="grid gap-4 border-primary/20 bg-primary-soft/40"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-ink">Salvar</h2><p className="mt-1 text-sm text-muted">Mantenha como rascunho durante a revisão metodológica ou publique quando estiver validado.</p></div><StatusPill tone="neutral">Rascunho</StatusPill></div><label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm text-ink"><input type="checkbox" name="status" value="published" className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Publicar agora</strong><small className="text-muted">A versão ficará disponível imediatamente para participantes.</small></span></label><Button type="submit" className="w-fit">Salvar diagnóstico</Button></Card>
      </form>
    </fieldset>

    <AdminDisclosure title="Diagnósticos ativos e exclusão" description="Consulte todas as definições. A exclusão retira a configuração do painel, mas preserva resultados históricos.">
      <div className="grid gap-3 sm:grid-cols-2">{activeDiagnostics.map((item) => <div key={item.definition_id} className="rounded-xl border border-border p-4"><strong className="text-ink">{item.name}</strong><p className="mt-1 text-xs text-muted">{item.versions.length} versão(ões)</p>{canEdit ? <details className="mt-4 rounded-xl border border-border"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">Excluir diagnóstico</summary><form action={retireDiagnosticAction} className="grid gap-2 border-t border-border p-3"><input type="hidden" name="definition_id" value={item.definition_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Label className="text-xs">Confirme digitando EXCLUIR<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm" className="w-fit">Excluir</Button></form></details> : null}</div>)}</div>
    </AdminDisclosure>
  </div></AppShell>;
}
