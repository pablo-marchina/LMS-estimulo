import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { saveGamificationResourceAction } from "./actions";

export const dynamic = "force-dynamic";
function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function AdminGamificationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
    ?? auth.identity.organizations.find((item) => item.permissions.includes("engagement.manage"));
  if (!organization?.permissions.includes("engagement.manage")) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Gamificação restrita" tone="warning"><p>Seu papel não permite configurar pontos e credenciais.</p></StatusPanel>
      </AppShell>
    );
  }

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const ruleVersions = workspace.rules.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));
  const journeyVersions = workspace.journeys.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Engajamento governado"
          title="Pontos, selos e certificados"
          description="Configure regras versionadas e credenciais sem alterar o ledger histórico. Publicação é explícita e auditada."
        />

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label>
            Organização
            <Select name="organization" defaultValue={organization.organization_id} className="w-64">
              {auth.identity.organizations
                .filter((item) => item.permissions.includes("engagement.manage"))
                .map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Button variant="secondary" type="submit">Selecionar</Button>
        </form>

        {single(query.sucesso) ? <StatusPanel title="Configuração salva" tone="success"><p>A nova versão foi persistida.</p></StatusPanel> : null}
        {single(query.erro) ? <StatusPanel title="Falha ao salvar" tone="warning"><p>Revise campos, regras vinculadas e JSON.</p></StatusPanel> : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <details className="group rounded-xl border border-border bg-surface" open>
            <summary className="grid cursor-pointer gap-1 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
              <strong className="text-ink">Regra de pontos</strong>
              <span className="text-sm text-muted">Valor, elegibilidade e recorrência</span>
            </summary>
            <div className="border-t border-border p-5">
              <form action={saveGamificationResourceAction} className="grid gap-4">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="resource_type" value="point_rule" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Label>
                    Definição existente
                    <Select name="definition_id">
                      <option value="">Nova regra</option>
                      {workspace.point_rules.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
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
                  <Label>
                    Pontos
                    <Input name="amount" type="number" required />
                  </Label>
                  <Label>
                    Regra de elegibilidade
                    <Select name="eligibility_rule_version_id" required>
                      {ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}
                    </Select>
                  </Label>
                  <Label>
                    Status
                    <Select name="status">
                      <option value="draft">Draft</option>
                      <option value="published">Publicada</option>
                    </Select>
                  </Label>
                </div>
                <Label>
                  Recorrência JSON
                  <Textarea className="font-mono text-xs" name="recurrence_policy" rows={4} defaultValue={'{"mode":"once"}'} />
                </Label>
                <Button type="submit" className="w-fit">Salvar regra de pontos</Button>
              </form>
            </div>
          </details>

          <details className="group rounded-xl border border-border bg-surface">
            <summary className="grid cursor-pointer gap-1 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
              <strong className="text-ink">Selo</strong>
              <span className="text-sm text-muted">Conquista e critério</span>
            </summary>
            <div className="border-t border-border p-5">
              <form action={saveGamificationResourceAction} className="grid gap-4">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="resource_type" value="badge" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Label>
                    Definição existente
                    <Select name="definition_id">
                      <option value="">Novo selo</option>
                      {workspace.badges.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
                    </Select>
                  </Label>
                  <Label>
                    Código
                    <Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required />
                  </Label>
                  <Label>
                    Nome interno
                    <Input name="name" required />
                  </Label>
                  <Label>
                    Título ao participante
                    <Input name="title" required />
                  </Label>
                  <Label>
                    Regra de critério
                    <Select name="criteria_rule_version_id" required>
                      {ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}
                    </Select>
                  </Label>
                  <Label>
                    Status
                    <Select name="status">
                      <option value="draft">Draft</option>
                      <option value="published">Publicado</option>
                    </Select>
                  </Label>
                </div>
                <Label>
                  Descrição
                  <Textarea name="description" rows={3} required />
                </Label>
                <Button type="submit" className="w-fit">Salvar selo</Button>
              </form>
            </div>
          </details>

          <details className="group rounded-xl border border-border bg-surface">
            <summary className="grid cursor-pointer gap-1 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
              <strong className="text-ink">Certificado</strong>
              <span className="text-sm text-muted">Jornada, requisitos e validade</span>
            </summary>
            <div className="border-t border-border p-5">
              <form action={saveGamificationResourceAction} className="grid gap-4">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="resource_type" value="certificate" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Label>
                    Definição existente
                    <Select name="definition_id">
                      <option value="">Novo certificado</option>
                      {workspace.certificates.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
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
                  <Label>
                    Jornada
                    <Select name="journey_version_id" required>
                      {journeyVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)} · {String(item.status)}</option>)}
                    </Select>
                  </Label>
                  <Label>
                    Regra de requisitos
                    <Select name="requirements_rule_version_id" required>
                      {ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}
                    </Select>
                  </Label>
                  <Label>
                    Status
                    <Select name="status">
                      <option value="draft">Draft</option>
                      <option value="published">Publicado</option>
                    </Select>
                  </Label>
                </div>
                <Label>
                  Política de validade JSON
                  <Textarea className="font-mono text-xs" name="validity_policy" rows={4} defaultValue={'{"expires":false}'} />
                </Label>
                <Button type="submit" className="w-fit">Salvar certificado</Button>
              </form>
            </div>
          </details>
        </div>

        <Card>
          <CardHeader><CardTitle>Inventário de engajamento</CardTitle></CardHeader>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Regras de pontos</h3>
              <div className="mt-3 grid gap-2">
                {workspace.point_rules.map((item) => (
                  <div key={item.definition_id} className="text-sm text-ink">
                    <strong>{item.name}</strong>
                    <p className="text-xs text-muted">{item.versions.length} versões</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Selos</h3>
              <div className="mt-3 grid gap-2">
                {workspace.badges.map((item) => (
                  <div key={item.definition_id} className="text-sm text-ink">
                    <strong>{item.name}</strong>
                    <p className="text-xs text-muted">{item.versions.length} versões</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Certificados</h3>
              <div className="mt-3 grid gap-2">
                {workspace.certificates.map((item) => (
                  <div key={item.definition_id} className="text-sm text-ink">
                    <strong>{item.name}</strong>
                    <p className="text-xs text-muted">{item.versions.length} versões</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
