import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
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

export default async function AdminDiagnosticPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel></main>;
  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("diagnostic.configuration.manage"));
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) return <AppShell area="admin" email={auth.email}><StatusPanel title="Diagnóstico restrito" tone="warning"><p>Seu papel não permite editar configurações de diagnóstico.</p></StatusPanel></AppShell>;

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const versions = workspace.diagnostics.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading"><p className="eyebrow">Personalização</p><h1>Diagnóstico e arquétipos</h1><p>Configure dimensões, perguntas, opções e perfis em versões draft. A publicação e a ativação permanecem separadas para preservar revisão metodológica.</p></header>
    <form className="inline-form" method="get"><label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.filter((item) => item.permissions.includes("diagnostic.configuration.manage")).map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}</select></label><button className="button button--secondary" type="submit">Selecionar</button></form>
    {single(query.sucesso) ? <StatusPanel title="Diagnóstico salvo" tone="success"><p>O draft foi persistido, versionado e auditado.</p></StatusPanel> : null}
    {single(query.erro) ? <StatusPanel title="Falha ao salvar" tone="warning"><p>Revise permissões e estruturas JSON.</p></StatusPanel> : null}

    <section className="admin-columns">
      <article className="card stack">
        <h2>Editor completo</h2>
        <form className="stack" action={saveDiagnosticAction}>
          <input type="hidden" name="organization_id" value={organization.organization_id} />
          <div className="form-grid"><label>Definição existente<select name="definition_id"><option value="">Novo diagnóstico</option>{workspace.diagnostics.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</select></label><label>Versão draft existente<select name="version_id"><option value="">Nova versão</option>{versions.filter((item) => item.status === "draft").map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · v{String(item.version_number)}</option>)}</select></label><label>Código<input name="code" pattern="[a-z][a-z0-9_-]{1,79}" required /></label><label>Nome<input name="name" required /></label></div>
          <label>Propósito<textarea name="purpose" rows={3} required /></label>
          <label>Configuração geral JSON<textarea className="code-input" name="configuration" rows={5} defaultValue={'{"optional":true,"minimum_answer_ratio":1}'} /></label>
          <label>Dimensões JSON<textarea className="code-input" name="dimensions" rows={10} defaultValue={dimensionExample} /></label>
          <label>Perguntas e opções JSON<textarea className="code-input" name="items" rows={18} defaultValue={itemExample} /></label>
          <label>Arquétipos JSON<textarea className="code-input" name="archetypes" rows={10} defaultValue={archetypeExample} /></label>
          <button className="button button--primary" type="submit">Salvar configuração</button>
        </form>
      </article>

      <aside className="stack">
        <StatusPanel title="Separação de responsabilidades" tone="info"><p>Este editor cria drafts. Resultados não são usados em crédito nem enviados ao HubSpot sem aprovação e destino explícitos.</p></StatusPanel>
        <article className="card stack"><h2>Versões existentes</h2>{workspace.diagnostics.length === 0 ? <p>Nenhum diagnóstico configurado.</p> : workspace.diagnostics.map((item) => <div className="inventory-item" key={item.definition_id}><strong>{item.name}</strong><span>{item.code}</span>{item.versions.map((version) => <small key={String(version.id)}>v{String(version.version_number)} · {String(version.status)}</small>)}</div>)}</article>
        <article className="card stack"><h2>Checklist metodológico</h2><ul><li>Wording revisado</li><li>Pesos e normalização aprovados</li><li>Desempate e respostas ausentes definidos</li><li>Textos dos resultados aprovados</li><li>Casos de teste homologados</li></ul></article>
      </aside>
    </section>
  </AppShell>;
}
