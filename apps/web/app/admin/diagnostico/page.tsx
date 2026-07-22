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

const dimensionExample = JSON.stringify([
  { code: "gestao", name: "Gestão", description: "Organização e tomada de decisão", minimum_answer_ratio: 1, position: 1 },
], null, 2);
const itemExample = JSON.stringify([
  { code: "gestao_1", dimension_code: "gestao", item_type: "single_choice", prompt: "Como você organiza sua gestão?", position: 1, is_required: true, options: [
    { code: "a", label: "Tenho rotina e indicadores", value: { score: 3 }, position: 1 },
    { code: "b", label: "Organizo quando surge necessidade", value: { score: 1 }, position: 2 },
  ] },
], null, 2);
const archetypeExample = JSON.stringify([
  { code: "estrategista", name: "Estrategista", description: "Perfil que estrutura decisões e prioridades." },
], null, 2);

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
  const versions = workspace.diagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));

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
          <Button variant="secondary" type="submit">Selecionar</Button>
        </form>

        {single(query.sucesso) ? <StatusPanel title="Diagnóstico salvo" tone="success"><p>O draft foi persistido, versionado e auditado.</p></StatusPanel> : null}
        {single(query.erro) ? <StatusPanel title="Falha ao salvar" tone="warning"><p>Revise permissões e estruturas JSON.</p></StatusPanel> : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader><CardTitle>Editor completo</CardTitle></CardHeader>
            <form action={saveDiagnosticAction} className="grid gap-4">
              <input type="hidden" name="organization_id" value={organization.organization_id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Label>
                  Definição existente
                  <Select name="definition_id">
                    <option value="">Novo diagnóstico</option>
                    {workspace.diagnostics.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
                  </Select>
                </Label>
                <Label>
                  Versão draft existente
                  <Select name="version_id">
                    <option value="">Nova versão</option>
                    {versions.filter((item) => item.status === "draft").map((item) => (
                      <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Código
                  <Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required />
                </Label>
                <Label>
                  Nome
                  <Input name="name" required />
                </Label>
              </div>
              <Label>
                Propósito
                <Textarea name="purpose" rows={3} required />
              </Label>
              <Label>
                Configuração geral JSON
                <Textarea className="font-mono text-xs" name="configuration" rows={5} defaultValue={'{"optional":true,"minimum_answer_ratio":1}'} />
              </Label>
              <Label>
                Dimensões JSON
                <Textarea className="font-mono text-xs" name="dimensions" rows={10} defaultValue={dimensionExample} />
              </Label>
              <Label>
                Perguntas e opções JSON
                <Textarea className="font-mono text-xs" name="items" rows={18} defaultValue={itemExample} />
              </Label>
              <Label>
                Arquétipos JSON
                <Textarea className="font-mono text-xs" name="archetypes" rows={10} defaultValue={archetypeExample} />
              </Label>
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
