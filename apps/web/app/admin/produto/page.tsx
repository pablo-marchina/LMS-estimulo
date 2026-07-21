import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
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
  if (auth.status !== "authenticated") return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel></main>;
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
    <header className="page-heading">
      <p className="eyebrow">Produto configurável</p>
      <h1>Jornadas, atividades e regras</h1>
      <p>Edite drafts sobre o modelo operacional real. Versões publicadas permanecem imutáveis e a publicação continua no fluxo de operação.</p>
    </header>

    <form className="inline-form" method="get">
      <label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.filter((item) => item.permissions.includes("journey.definition.manage")).map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}</select></label>
      <button className="button button--secondary" type="submit">Selecionar</button>
    </form>

    {success ? <StatusPanel title="Configuração salva" tone="success"><p>O draft foi persistido e auditado.</p></StatusPanel> : null}
    {error ? <StatusPanel title="Não foi possível salvar" tone="warning"><p>Revise os campos, permissões e JSON informado.</p></StatusPanel> : null}

    <section className="metrics-grid admin-workspace-metrics">
      <article className="metric"><span>Jornadas</span><strong>{workspace.journeys.length}</strong></article>
      <article className="metric"><span>Atividades</span><strong>{workspace.activities.length}</strong></article>
      <article className="metric"><span>Trilhas</span><strong>{workspace.paths.length}</strong></article>
      <article className="metric"><span>Regras</span><strong>{workspace.rules.length}</strong></article>
    </section>

    <section className="admin-editor-grid">
      <details className="card admin-editor" open>
        <summary><strong>Jornada</strong><span>Criar ou atualizar um draft</span></summary>
        <form className="stack" action={saveProductResourceAction}>
          <input type="hidden" name="organization_id" value={organization.organization_id} />
          <input type="hidden" name="resource_type" value="journey" />
          <div className="form-grid">
            <label>Programa<select name="program_id" required><option value="">Selecione</option>{workspace.programs.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Definição existente<select name="definition_id"><option value="">Nova jornada</option>{workspace.journeys.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</select></label>
            <label>Versão draft existente<select name="version_id"><option value="">Nova versão</option>{journeyVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label>
            <label>Código<input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
            <label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label>
            <label>Nome<input name="name" required /></label>
            <label>Título da versão<input name="title" required /></label>
          </div>
          <label>Propósito<textarea name="purpose" rows={2} /></label>
          <label>Descrição<textarea name="description" rows={3} /></label>
          <label>Configuração JSON<textarea className="code-input" name="configuration" rows={5} defaultValue="{}" /></label>
          <button className="button button--primary" type="submit">Salvar jornada</button>
        </form>
      </details>

      <details className="card admin-editor">
        <summary><strong>Atividade e conteúdo</strong><span>Vídeo, texto, link, avaliação ou prática</span></summary>
        <form className="stack" action={saveProductResourceAction}>
          <input type="hidden" name="organization_id" value={organization.organization_id} />
          <input type="hidden" name="resource_type" value="activity" />
          <div className="form-grid">
            <label>Definição existente<select name="definition_id"><option value="">Nova atividade</option>{workspace.activities.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</select></label>
            <label>Versão draft existente<select name="version_id"><option value="">Nova versão</option>{activityVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label>
            <label>Código<input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
            <label>Tipo<select name="activity_type" required><option value="content">Conteúdo</option><option value="video">Vídeo</option><option value="assessment">Avaliação</option><option value="practice">Prática</option><option value="external">Externo</option></select></label>
            <label>Nome<input name="name" required /></label>
            <label>Título<input name="title" required /></label>
            <label>Duração estimada<input name="estimated_minutes" type="number" min="0" defaultValue="10" /></label>
          </div>
          <label>Descrição<textarea name="description" rows={3} /></label>
          <label>Configuração JSON<textarea className="code-input" name="configuration" rows={4} defaultValue="{}" /></label>
          <fieldset className="nested-fieldset"><legend>Asset opcional</legend><div className="form-grid"><label>Título<input name="asset_title" /></label><label>Tipo<select name="asset_type"><option value="external_link">Link</option><option value="video">Vídeo</option><option value="text">Texto</option><option value="document">Documento</option></select></label><label>URL<input name="asset_url" type="url" /></label><label>Idioma<input name="asset_language" defaultValue="pt-BR" /></label></div><label><input name="asset_required" type="checkbox" defaultChecked /> Obrigatório</label><label>Acessibilidade JSON<textarea className="code-input" name="asset_accessibility" rows={3} defaultValue="{}" /></label></fieldset>
          <fieldset className="nested-fieldset"><legend>Prática</legend><div className="form-grid"><label>Modo<input name="submission_mode" defaultValue="file" /></label><label>Máximo de envios<input name="max_submissions" type="number" min="1" /></label><label>Versão dos termos<input name="terms_version" /></label></div><label><input name="review_required" type="checkbox" defaultChecked /> Revisão humana obrigatória</label><label>Tipos de evidência JSON<textarea className="code-input" name="allowed_evidence_types" rows={2} defaultValue={'["file"]'} /></label></fieldset>
          <button className="button button--primary" type="submit">Salvar atividade</button>
        </form>
      </details>

      <details className="card admin-editor">
        <summary><strong>Trilha e bloco</strong><span>Organizar atividades e regras de disponibilidade</span></summary>
        <form className="stack" action={saveProductResourceAction}>
          <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="resource_type" value="path_step" />
          <div className="form-grid">
            <label>Trilha existente<select name="path_template_id"><option value="">Nova trilha</option>{workspace.paths.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Jornada draft<select name="journey_version_id"><option value="">Selecione para nova trilha</option>{journeyVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label>
            <label>Código da trilha<input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label>
            <label>Nome da trilha<input name="path_name" required /></label>
            <label>ID do passo existente<input name="step_id" /></label>
            <label>Código da atividade no bloco<input name="step_code" required /></label>
            <label>Atividade<select name="activity_version_id" required>{activityVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)} · {String(item.status)}</option>)}</select></label>
            <label>Posição<input name="position" type="number" min="1" defaultValue="1" required /></label>
            <label>Regra de disponibilidade<select name="availability_rule_version_id"><option value="">Sempre disponível</option>{ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label>
            <label>Regra de conclusão<select name="completion_rule_version_id"><option value="">Regra da atividade</option>{ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label>
            <label>Prazo relativo<input name="due_offset" placeholder="7 days" /></label>
          </div>
          <label>Descrição da trilha<textarea name="path_description" rows={2} /></label>
          <label><input name="is_default" type="checkbox" /> Trilha padrão</label><label><input name="is_required" type="checkbox" defaultChecked /> Atividade obrigatória</label>
          <label>Metadados do bloco JSON<textarea className="code-input" name="metadata" rows={3} defaultValue={'{"block":"Módulo 1"}'} /></label>
          <button className="button button--primary" type="submit">Salvar trilha e atividade</button>
        </form>
      </details>

      <details className="card admin-editor">
        <summary><strong>Regra</strong><span>Elegibilidade, disponibilidade, conclusão ou credencial</span></summary>
        <form className="stack" action={saveProductResourceAction}>
          <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="resource_type" value="rule" />
          <div className="form-grid"><label>Definição existente<select name="definition_id"><option value="">Nova regra</option>{workspace.rules.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</select></label><label>Versão draft<select name="version_id"><option value="">Nova versão</option>{ruleVersions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label><label>Código<input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label><label>Nome<input name="name" required /></label><label>Tipo<select name="rule_type"><option value="eligibility">Elegibilidade</option><option value="availability">Disponibilidade</option><option value="completion">Conclusão</option><option value="credential">Credencial</option><option value="points">Pontos</option></select></label><label>Linguagem<input name="language" defaultValue="json-logic" /></label></div>
          <label>Expressão JSON<textarea className="code-input" name="expression" rows={6} defaultValue={'{"==":[1,1]}'} /></label><label>Schema de entrada<textarea className="code-input" name="input_schema" rows={3} defaultValue="{}" /></label><label>Schema de saída<textarea className="code-input" name="output_schema" rows={3} defaultValue="{}" /></label>
          <button className="button button--primary" type="submit">Salvar regra</button>
        </form>
      </details>
    </section>

    <section className="card stack"><h2>Inventário configurado</h2><div className="admin-inventory-grid"><div><h3>Jornadas</h3>{workspace.journeys.map((item) => <p key={item.definition_id}><strong>{item.name}</strong><br /><small>{item.code} · {item.versions.length} versões · {String(latest(item)?.status ?? item.status)}</small></p>)}</div><div><h3>Atividades</h3>{workspace.activities.map((item) => <p key={item.definition_id}><strong>{item.name}</strong><br /><small>{item.code} · {item.versions.length} versões · {String(latest(item)?.status ?? item.status)}</small></p>)}</div><div><h3>Trilhas</h3>{workspace.paths.map((item) => <p key={item.id}><strong>{item.name}</strong><br /><small>{item.steps.length} atividades · {item.status}</small></p>)}</div><div><h3>Regras</h3>{workspace.rules.map((item) => <p key={item.definition_id}><strong>{item.name}</strong><br /><small>{item.code} · {item.versions.length} versões</small></p>)}</div></div></section>
  </AppShell>;
}
