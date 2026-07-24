import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { saveDiagnosticAction } from "./actions";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

const ARCHETYPES = [
  { code: "fazedor", icon: "🔨", name: "Fazedor(a)" },
  { code: "batalhador", icon: "💪", name: "Batalhador(a)" },
  { code: "construtor", icon: "🧱", name: "Construtor(a)" },
  { code: "navegador", icon: "🧭", name: "Navegador(a)" },
] as const;
const DIMENSIONS = [
  { code: "gestao_financeira", label: "D1 · Gestão financeira" },
  { code: "disciplina_habito", label: "D2 · Disciplina e hábito" },
  { code: "visao_planejamento", label: "D3 · Visão e planejamento" },
  { code: "perfil_empreendedor", label: "D4 · Perfil empreendedor" },
  { code: "credito_risco", label: "D5 · Relação com crédito e risco" },
] as const;

function versionTone(status: string): "success" | "info" | "neutral" {
  if (status === "published" || status === "active") return "success";
  if (status === "draft") return "info";
  return "neutral";
}

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel>
      </main>
    );
  }
  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("diagnostic.configuration.manage"));
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Diagnóstico restrito" tone="warning"><p>Seu papel não permite editar configurações de diagnóstico.</p></StatusPanel>
      </AppShell>
    );
  }

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const versions = workspace.diagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name, definitionId: item.definition_id, definitionCode: item.code, definitionPurpose: item.purpose })));
  const draftVersions = versions.filter((item) => item.status === "draft");

  const selectedVersionId = single(query.versao);
  const selectedVersion = (draftVersions.find((item) => String(item.id) === selectedVersionId) ?? null) as any;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Personalização"
          title="Diagnóstico e arquétipos"
          description="Configure dimensões, perguntas, opções e perfis em versões draft. A publicação e a ativação permanecem separadas para preservar revisão metodológica."
        />

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label>
            Organização
            <Select name="organization" defaultValue={organization.organization_id} className="w-64">
              {auth.identity.organizations
                .filter((item) => item.permissions.includes("diagnostic.configuration.manage"))
                .map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Label>
            Versão para editar
            <Select name="versao" defaultValue={selectedVersionId} className="w-72">
              <option value="">Novo diagnóstico (ou nova versão)</option>
              {draftVersions.map((item) => (
                <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>
              ))}
            </Select>
          </Label>
          <Button variant="secondary" type="submit">Selecionar</Button>
        </form>

        {single(query.sucesso) ? <StatusPanel title="Diagnóstico salvo" tone="success"><p>O draft foi persistido, versionado e auditado.</p></StatusPanel> : null}
        {single(query.erro) ? <StatusPanel title="Falha ao salvar" tone="warning"><p>Revise as informações do formulário e tente novamente.</p></StatusPanel> : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader><CardTitle>Editor completo</CardTitle></CardHeader>
            <form action={saveDiagnosticAction} className="grid gap-4">
              <input type="hidden" name="organization_id" value={organization.organization_id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Label>
                  Definição existente
                  <Select name="definition_id" defaultValue={selectedVersion?.definitionId ?? ""}>
                    <option value="">Novo diagnóstico</option>
                    {workspace.diagnostics.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
                  </Select>
                </Label>
                <Label>
                  Versão draft existente
                  <Select name="version_id" defaultValue={selectedVersionId}>
                    <option value="">Nova versão</option>
                    {draftVersions.map((item) => (
                      <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Código
                  <Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" defaultValue={selectedVersion?.definitionCode ?? ""} required />
                </Label>
                <Label>
                  Nome
                  <Input name="name" defaultValue={selectedVersion?.definitionName ?? ""} required />
                </Label>
              </div>
              <Label>
                Propósito
                <Textarea name="purpose" rows={3} defaultValue={selectedVersion?.definitionPurpose ?? ""} required />
              </Label>

              {selectedVersion?.status === "draft" || !selectedVersion ? (
                <StatusPanel title="Rascunho — pendente de aprovação institucional" tone="info">
                  <p>Esta versão só passa a valer para participantes reais depois de publicada, e só deve ser publicada após aprovação da metodologia pela equipe do Estímulo.</p>
                </StatusPanel>
              ) : null}

              <details className="group rounded-xl border border-border bg-surface" open>
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold text-ink">1. Arquétipos</span>
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid gap-4 border-t border-border p-4">
                  {ARCHETYPES.map((archetype) => (
                    <Label key={archetype.code}>
                      {archetype.icon} {archetype.name}
                      <Textarea
                        name={`archetype_description_${archetype.code}`}
                        rows={2}
                        defaultValue={selectedVersion?.archetypes?.find((a: any) => a.code === archetype.code)?.description ?? ""}
                      />
                    </Label>
                  ))}
                </div>
              </details>

              <details className="group rounded-xl border border-border bg-surface">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold text-ink">2. Dimensões</span>
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid gap-4 border-t border-border p-4">
                  {DIMENSIONS.map((dimension) => (
                    <Label key={dimension.code}>
                      {dimension.label}
                      <Input
                        name={`dimension_name_${dimension.code}`}
                        defaultValue={selectedVersion?.dimensions?.find((d: any) => d.code === dimension.code)?.name ?? dimension.label}
                      />
                    </Label>
                  ))}
                </div>
              </details>

              <details className="group rounded-xl border border-border bg-surface">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold text-ink">3. Perguntas</span>
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid gap-6 border-t border-border p-4">
                  {(selectedVersion?.items?.length ? selectedVersion.items : Array.from({ length: 12 })).map((item: any, index: number) => (
                    <fieldset key={index} className="grid gap-3 rounded-lg border border-border p-4">
                      <legend className="px-1 text-sm font-semibold text-ink">Pergunta {index + 1}</legend>
                      <Label>
                        Dimensão principal
                        <Select name={`item_dimension_${index}`} defaultValue={item?.dimension_code ?? ""}>
                          <option value="">Selecione</option>
                          {DIMENSIONS.map((dimension) => <option key={dimension.code} value={dimension.code}>{dimension.label}</option>)}
                        </Select>
                      </Label>
                      <Label>Pergunta<Textarea name={`item_prompt_${index}`} rows={2} defaultValue={item?.prompt ?? ""} /></Label>
                      {[0, 1, 2, 3].map((optionIndex) => (
                        <div key={optionIndex} className="grid gap-2 sm:grid-cols-[1fr_120px]">
                          <Label>Opção {optionIndex + 1}<Input name={`item_option_label_${index}_${optionIndex}`} defaultValue={item?.options?.[optionIndex]?.label ?? ""} /></Label>
                          <Label>Pontuação<Input name={`item_option_score_${index}_${optionIndex}`} type="number" defaultValue={item?.options?.[optionIndex]?.value?.score ?? ""} /></Label>
                        </div>
                      ))}
                    </fieldset>
                  ))}
                </div>
              </details>

              <details className="group rounded-xl border border-border bg-surface">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold text-ink">4. Critério de pontuação</span>
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid gap-4 border-t border-border p-4">
                  <p className="text-sm text-muted">Para cada arquétipo, defina a pontuação mínima que o participante precisa atingir em cada dimensão. O primeiro arquétipo (na ordem acima) cuja exigência for cumprida é o escolhido; se nenhum for cumprido, vale o arquétipo padrão.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 text-left">Arquétipo</th>
                          {DIMENSIONS.map((d) => <th key={d.code} className="p-2 text-left">{d.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {ARCHETYPES.map((archetype) => (
                          <tr key={archetype.code}>
                            <td className="p-2 font-medium text-ink">{archetype.icon} {archetype.name}</td>
                            {DIMENSIONS.map((dimension) => (
                              <td key={dimension.code} className="p-2">
                                <Input
                                  name={`threshold_${archetype.code}_${dimension.code}`}
                                  type="number"
                                  placeholder="—"
                                  defaultValue={selectedVersion?.configuration?.classification_rules?.rules
                                    ?.find((r: any) => r.archetype_code === archetype.code)?.thresholds?.[dimension.code] ?? ""}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Label>
                    Arquétipo padrão (quando nenhum critério acima for atingido)
                    <Select name="default_archetype_code" defaultValue={selectedVersion?.configuration?.classification_rules?.default_archetype_code ?? ""} required>
                      <option value="">Selecione</option>
                      {ARCHETYPES.map((archetype) => <option key={archetype.code} value={archetype.code}>{archetype.icon} {archetype.name}</option>)}
                    </Select>
                  </Label>
                </div>
              </details>

              <details className="group rounded-xl border border-border bg-surface">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold text-ink">5. Publicar</span>
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid gap-4 border-t border-border p-4">
                  <Label className="flex items-center gap-2.5">
                    <input type="checkbox" name="status" value="published" defaultChecked={selectedVersion?.status === "published"} className="size-4 accent-primary" />
                    Publicar esta versão (participantes reais passam a usá-la imediatamente)
                  </Label>
                </div>
              </details>

              <Button type="submit" className="w-fit">Salvar configuração</Button>
            </form>
          </Card>

          <div className="grid gap-6 self-start">
            <StatusPanel title="Separação de responsabilidades" tone="info">
              <p>Este editor cria drafts. Resultados não são usados em crédito nem enviados ao HubSpot sem aprovação e destino explícitos.</p>
            </StatusPanel>

            <Card>
              <CardHeader><CardTitle>Versões existentes</CardTitle></CardHeader>
              {workspace.diagnostics.length === 0 ? (
                <p className="text-sm text-muted">Nenhum diagnóstico configurado.</p>
              ) : (
                <div className="grid gap-3">
                  {workspace.diagnostics.map((item) => (
                    <div key={item.definition_id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-ink">{item.name}</strong>
                        <Badge>{item.code}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.versions.map((version) => (
                          <StatusPill key={String(version.id)} tone={versionTone(String(version.status))}>
                            v{String(version.version_number)} · {String(version.status)}
                          </StatusPill>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader><CardTitle>Checklist metodológico</CardTitle></CardHeader>
              <ul className="grid gap-2 text-sm text-ink">
                <li>Wording revisado</li>
                <li>Pesos e normalização aprovados</li>
                <li>Desempate e respostas ausentes definidos</li>
                <li>Textos dos resultados aprovados</li>
                <li>Casos de teste homologados</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
