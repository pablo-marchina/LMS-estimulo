import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { saveProductResourceAction } from "./actions";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function latest<T extends { versions?: Array<Record<string, unknown>> }>(item: T) {
  return item.versions?.[0] ?? null;
}

export default async function AdminProductPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return <main className="mx-auto max-w-3xl px-4 py-10"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel></main>;
  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("journey.definition.manage"));
  if (!organization?.permissions.includes("journey.definition.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Gestão de produto restrita" tone="warning"><p>Seu papel não permite editar jornadas, atividades e regras.</p></StatusPanel></AppShell>;
  }

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const journeyVersions = workspace.journeys.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));
  const activityVersions = workspace.activities.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));
  const ruleVersions = workspace.rules.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));
  const success = single(query.sucesso);
  const error = single(query.erro);

  return <AppShell area="admin" email={auth.email}>
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Produto configurável"
        title="Jornadas, atividades e regras"
        description="Edite drafts sobre o modelo operacional real. Versões publicadas permanecem imutáveis e a publicação continua no fluxo de operação."
        actions={
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Organização
              <Select name="organization" defaultValue={organization.organization_id}>
                {auth.identity.organizations.filter((item) => item.permissions.includes("journey.definition.manage")).map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}
              </Select>
            </label>
            <Button variant="secondary" type="submit">Selecionar</Button>
          </form>
        }
      />

      {success ? <StatusPanel title="Configuração salva" tone="success"><p>O draft foi persistido e auditado.</p></StatusPanel> : null}
      {error ? <StatusPanel title="Não foi possível salvar" tone="warning"><p>Revise os campos, permissões e JSON informado.</p></StatusPanel> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Jornadas</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.journeys.length}</strong></Card>
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Atividades</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.activities.length}</strong></Card>
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Trilhas</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.paths.length}</strong></Card>
        <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Regras</span><strong className="mt-1 block text-2xl font-bold text-ink">{workspace.rules.length}</strong></Card>
      </section>

      <section className="grid gap-4">
        <details className="group rounded-xl border border-border bg-surface" open>
          <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="grid gap-1">
              <strong className="text-ink">Jornada</strong>
              <small className="text-muted">Criar ou atualizar um draft</small>
            </span>
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-border p-5">
            <form className="grid gap-4" action={saveProductResourceAction}>
              <input type="hidden" name="organization_id" value={organization.organization_id} />
              <input type="hidden" name="resource_type" value="journey" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink">Programa
                  <Select name="program_id" required><option value="">Selecione</option>{workspace.programs.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Definição existente
                  <Select name="definition_id"><option value="">Nova jornada</option>{workspace.journeys.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Versão draft existente
                  <Select name="version_id"><option value="">Nova versão</option>{journeyVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Código<Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Slug<Input name="slug" pattern="[a-z0-9-]+" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Nome<Input name="name" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Título da versão<Input name="title" required /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Propósito<Textarea name="purpose" rows={2} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={3} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Configuração JSON<Textarea className="font-mono text-xs" name="configuration" rows={5} defaultValue="{}" /></label>
              <Button type="submit" className="w-fit">Salvar jornada</Button>
            </form>
          </div>
        </details>

        <details className="group rounded-xl border border-border bg-surface">
          <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="grid gap-1">
              <strong className="text-ink">Atividade e conteúdo</strong>
              <small className="text-muted">Vídeo, texto, link, avaliação ou prática</small>
            </span>
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-border p-5">
            <form className="grid gap-4" action={saveProductResourceAction}>
              <input type="hidden" name="organization_id" value={organization.organization_id} />
              <input type="hidden" name="resource_type" value="activity" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink">Definição existente
                  <Select name="definition_id"><option value="">Nova atividade</option>{workspace.activities.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Versão draft existente
                  <Select name="version_id"><option value="">Nova versão</option>{activityVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Código<Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Tipo
                  <Select name="activity_type" required>
                    <option value="content">Conteúdo</option>
                    <option value="video">Vídeo</option>
                    <option value="assessment">Avaliação</option>
                    <option value="practice">Prática</option>
                    <option value="external">Externo</option>
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Nome<Input name="name" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Título<Input name="title" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Duração estimada<Input name="estimated_minutes" type="number" min="0" defaultValue="10" /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={3} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Configuração JSON<Textarea className="font-mono text-xs" name="configuration" rows={4} defaultValue="{}" /></label>

              <fieldset className="grid gap-4 rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-semibold text-ink">Asset opcional</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Título<Input name="asset_title" /></label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Tipo
                    <Select name="asset_type">
                      <option value="external_link">Link</option>
                      <option value="video">Vídeo</option>
                      <option value="text">Texto</option>
                      <option value="document">Documento</option>
                    </Select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">URL<Input name="asset_url" type="url" /></label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Idioma<Input name="asset_language" defaultValue="pt-BR" /></label>
                </div>
                <label className="flex items-center gap-2.5 text-sm text-ink"><input name="asset_required" type="checkbox" defaultChecked className="size-4 accent-primary" /> Obrigatório</label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Acessibilidade JSON<Textarea className="font-mono text-xs" name="asset_accessibility" rows={3} defaultValue="{}" /></label>
              </fieldset>

              <fieldset className="grid gap-4 rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-semibold text-ink">Prática</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Modo<Input name="submission_mode" defaultValue="file" /></label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Máximo de envios<Input name="max_submissions" type="number" min="1" /></label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Versão dos termos<Input name="terms_version" /></label>
                </div>
                <label className="flex items-center gap-2.5 text-sm text-ink"><input name="review_required" type="checkbox" defaultChecked className="size-4 accent-primary" /> Revisão humana obrigatória</label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Tipos de evidência JSON<Textarea className="font-mono text-xs" name="allowed_evidence_types" rows={2} defaultValue={'["file"]'} /></label>
              </fieldset>

              <Button type="submit" className="w-fit">Salvar atividade</Button>
            </form>
          </div>
        </details>

        <details className="group rounded-xl border border-border bg-surface">
          <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="grid gap-1">
              <strong className="text-ink">Trilha e bloco</strong>
              <small className="text-muted">Organizar atividades e regras de disponibilidade</small>
            </span>
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-border p-5">
            <form className="grid gap-4" action={saveProductResourceAction}>
              <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="resource_type" value="path_step" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink">Trilha existente
                  <Select name="path_template_id"><option value="">Nova trilha</option>{workspace.paths.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Jornada draft
                  <Select name="journey_version_id"><option value="">Selecione para nova trilha</option>{journeyVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Código da trilha<Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Nome da trilha<Input name="path_name" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">ID do passo existente<Input name="step_id" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Código da atividade no bloco<Input name="step_code" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Atividade
                  <Select name="activity_version_id" required>{activityVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)} · {String(item.status)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Posição<Input name="position" type="number" min="1" defaultValue="1" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Regra de disponibilidade
                  <Select name="availability_rule_version_id"><option value="">Sempre disponível</option>{ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Regra de conclusão
                  <Select name="completion_rule_version_id"><option value="">Regra da atividade</option>{ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Prazo relativo<Input name="due_offset" placeholder="7 days" /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Descrição da trilha<Textarea name="path_description" rows={2} /></label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2.5 text-sm text-ink"><input name="is_default" type="checkbox" className="size-4 accent-primary" /> Trilha padrão</label>
                <label className="flex items-center gap-2.5 text-sm text-ink"><input name="is_required" type="checkbox" defaultChecked className="size-4 accent-primary" /> Atividade obrigatória</label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Metadados do bloco JSON<Textarea className="font-mono text-xs" name="metadata" rows={3} defaultValue={'{"block":"Módulo 1"}'} /></label>
              <Button type="submit" className="w-fit">Salvar trilha e atividade</Button>
            </form>
          </div>
        </details>

        <details className="group rounded-xl border border-border bg-surface">
          <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="grid gap-1">
              <strong className="text-ink">Regra</strong>
              <small className="text-muted">Elegibilidade, disponibilidade, conclusão ou credencial</small>
            </span>
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-border p-5">
            <form className="grid gap-4" action={saveProductResourceAction}>
              <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="resource_type" value="rule" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink">Definição existente
                  <Select name="definition_id"><option value="">Nova regra</option>{workspace.rules.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Versão draft
                  <Select name="version_id"><option value="">Nova versão</option>{ruleVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Código<Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Nome<Input name="name" required /></label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Tipo
                  <Select name="rule_type">
                    <option value="eligibility">Elegibilidade</option>
                    <option value="availability">Disponibilidade</option>
                    <option value="completion">Conclusão</option>
                    <option value="credential">Credencial</option>
                    <option value="points">Pontos</option>
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink">Linguagem<Input name="language" defaultValue="json-logic" /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Expressão JSON<Textarea className="font-mono text-xs" name="expression" rows={6} defaultValue={'{"==":[1,1]}'} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Schema de entrada<Textarea className="font-mono text-xs" name="input_schema" rows={3} defaultValue="{}" /></label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">Schema de saída<Textarea className="font-mono text-xs" name="output_schema" rows={3} defaultValue="{}" /></label>
              <Button type="submit" className="w-fit">Salvar regra</Button>
            </form>
          </div>
        </details>
      </section>

      <Card className="grid gap-5">
        <h2 className="text-lg font-semibold text-ink">Inventário configurado</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Jornadas</h3>
            {workspace.journeys.map((item) => <p key={item.definition_id} className="text-sm text-ink"><strong>{item.name}</strong><br /><small className="text-muted">{item.code} · {item.versions.length} versões · {String(latest(item)?.status ?? item.status)}</small></p>)}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Atividades</h3>
            {workspace.activities.map((item) => <p key={item.definition_id} className="text-sm text-ink"><strong>{item.name}</strong><br /><small className="text-muted">{item.code} · {item.versions.length} versões · {String(latest(item)?.status ?? item.status)}</small></p>)}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Trilhas</h3>
            {workspace.paths.map((item) => <p key={item.id} className="text-sm text-ink"><strong>{item.name}</strong><br /><small className="text-muted">{item.steps.length} atividades · {item.status}</small></p>)}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Regras</h3>
            {workspace.rules.map((item) => <p key={item.definition_id} className="text-sm text-ink"><strong>{item.name}</strong><br /><small className="text-muted">{item.code} · {item.versions.length} versões</small></p>)}
          </div>
        </div>
      </Card>
    </div>
  </AppShell>;
}
