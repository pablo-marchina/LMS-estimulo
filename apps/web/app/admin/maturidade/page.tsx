import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { maturityPreviewRuntime } from "@/lib/admin/maturity-preview";
import { getAuthContext } from "@/lib/auth/context";
import {
  calculateMaturityPreview,
  maturityDimensions,
  type MaturityAnswer,
  type MaturityDimensionCode,
} from "@/lib/maturity/engine";

export const dynamic = "force-dynamic";

type Query = Record<string, string | string[] | undefined>;

const blockerLabels: Record<string, string> = {
  methodology_owner_approval: "Aprovação do responsável pela metodologia",
  question_wording_review: "Revisão da redação das perguntas",
  threshold_validation: "Validação dos limites dos níveis",
  fairness_and_bias_review: "Revisão de equidade e vieses",
  privacy_and_legal_approval: "Aprovação jurídica e de privacidade",
  learning_path_mapping_approval: "Aprovação do vínculo com as trilhas",
};

const segmentLabels = {
  base: "Base",
  traction: "Tração",
  evolution: "Evolução",
} as const;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function previewAnswers(query: Query): MaturityAnswer[] | null {
  const values: MaturityAnswer[] = [];
  for (const dimension of maturityDimensions) {
    const raw = single(query[`score_${dimension.code}`]);
    if (raw === undefined || raw === "") return null;
    values.push({ dimension: dimension.code, score: Number(raw) });
  }
  return values;
}

function dimensionLabel(code: MaturityDimensionCode): string {
  return maturityDimensions.find((dimension) => dimension.code === code)?.label ?? code;
}

export default async function MaturityConfigurationPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com uma identidade confirmada.</p></StatusPanel></main>;
  }

  const requestedOrganization = single(query.organization);
  const organization = auth.identity.organizations.find(
    (candidate) => candidate.organization_id === requestedOrganization,
  ) ?? auth.identity.organizations[0];
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;
  }
  if (!organization.permissions.includes("diagnostic.configuration.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Revisão de diagnóstico restrita" tone="warning"><p>Este vínculo não possui a permissão explícita <code>diagnostic.configuration.manage</code>.</p></StatusPanel></AppShell>;
  }

  const workspace = await maturityPreviewRuntime.get(
    auth.identity.user_account_id,
    organization.organization_id,
  );
  const answers = previewAnswers(query);
  const calculation = answers ? calculateMaturityPreview(answers) : null;

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading">
      <p className="eyebrow">Configuração versionada</p>
      <h1>Maturidade do negócio</h1>
      <p>Pré-visualização educacional do draft. A simulação não salva respostas, não atribui nível, não matricula participantes e não envia dados ao HubSpot.</p>
    </header>

    <StatusPanel title="Ativação bloqueada" tone="warning">
      <p>Versão {workspace.version.version_number} · definição {workspace.definition.status} · regra {workspace.rule.status}.</p>
      <p>Uso em crédito: <strong>proibido</strong>. Política de CRM: <strong>não sincronizar até aprovação de governança</strong>.</p>
      <p>Atribuições existentes neste draft: <strong>{workspace.assignment_count}</strong>.</p>
    </StatusPanel>

    <form className="inline-form" method="get" aria-label="Selecionar organização">
      <label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}</select></label>
      <button className="button button--secondary" type="submit">Selecionar</button>
    </form>

    <section className="card stack" aria-labelledby="bloqueios-maturidade">
      <h2 id="bloqueios-maturidade">Pendências para homologação</h2>
      <ul>{workspace.version.configuration.publication_blockers.map((blocker) => <li key={blocker}>{blockerLabels[blocker] ?? blocker}</li>)}</ul>
    </section>

    <section className="stack stack--large" aria-labelledby="simulador-maturidade">
      <div>
        <h2 id="simulador-maturidade">Simular cálculo sem persistência</h2>
        <p className="support-note">Os valores permanecem apenas na URL desta página. Nenhum resultado é gravado ou usado para personalização.</p>
      </div>
      <form className="stack" method="get">
        <input type="hidden" name="organization" value={organization.organization_id} />
        {workspace.dimensions.map((dimension) => {
          const current = single(query[`score_${dimension.code}`]);
          return <fieldset className="card stack" key={dimension.id}>
            <legend><strong>{dimension.position}. {dimension.name}</strong></legend>
            <p>{dimension.item.prompt}</p>
            <label>Resposta<select name={`score_${dimension.code}`} defaultValue={current ?? ""} required>
              <option value="" disabled>Selecione</option>
              {dimension.item.options.map((option) => <option value={String(option.value.score)} key={option.id}>{option.label}</option>)}
            </select></label>
          </fieldset>;
        })}
        <button className="button button--primary" type="submit">Calcular prévia local</button>
      </form>
    </section>

    {calculation?.status === "calculated" ? <section className="card stack" aria-labelledby="resultado-previa">
      <h2 id="resultado-previa">Resultado da prévia</h2>
      <p><strong>{calculation.overallScore}%</strong> · {segmentLabels[calculation.segment]}</p>
      <p>Dimensão de foco: <strong>{dimensionLabel(calculation.focusDimension)}</strong>.</p>
      <p className="support-note">Confiança: não calculada enquanto a metodologia permanecer em draft.</p>
      <dl>{maturityDimensions.map((dimension) => <div key={dimension.code}><dt>{dimension.label}</dt><dd>{calculation.dimensionScores[dimension.code]}%</dd></div>)}</dl>
    </section> : null}

    {calculation?.status === "abstained" ? <StatusPanel title="Cálculo não realizado" tone="warning"><p>As respostas não atendem ao contrato do draft: {calculation.reason}.</p></StatusPanel> : null}

    <section className="stack" aria-labelledby="questoes-configuradas">
      <h2 id="questoes-configuradas">Perguntas e opções versionadas</h2>
      {workspace.dimensions.map((dimension) => <article className="card stack" key={`review:${dimension.id}`}>
        <h3>{dimension.name}</h3>
        <p>{dimension.description}</p>
        <p><strong>{dimension.item.prompt}</strong></p>
        <ol>{dimension.item.options.map((option) => <li key={option.id}>{option.label} <span className="metadata">({option.value.score})</span></li>)}</ol>
      </article>)}
    </section>

    <section className="stack" aria-labelledby="segmentos-configurados">
      <h2 id="segmentos-configurados">Segmentos ainda não publicados</h2>
      {workspace.segments.map((segment) => <article className="card" key={segment.version_id}><h3>{segment.name}</h3><p>{segment.description}</p><p className="metadata">Estado: {segment.status} · publicado: não</p></article>)}
    </section>
  </AppShell>;
}
