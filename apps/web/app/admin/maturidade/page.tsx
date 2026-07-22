import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
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
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <StatusPanel title="Acesso indisponível" tone="warning">
          Entre com uma identidade confirmada.
        </StatusPanel>
      </main>
    );
  }

  const requestedOrganization = single(query.organization);
  const organization = auth.identity.organizations.find(
    (candidate) => candidate.organization_id === requestedOrganization,
  ) ?? auth.identity.organizations[0];
  if (!organization) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Área indisponível" tone="warning">
          Nenhuma organização ativa foi encontrada.
        </StatusPanel>
      </AppShell>
    );
  }
  if (!organization.permissions.includes("diagnostic.configuration.manage")) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Revisão de diagnóstico restrita" tone="warning">
          Este vínculo não possui a permissão explícita{" "}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink">
            diagnostic.configuration.manage
          </code>
          .
        </StatusPanel>
      </AppShell>
    );
  }

  const workspace = await maturityPreviewRuntime.get(
    auth.identity.user_account_id,
    organization.organization_id,
  );
  const answers = previewAnswers(query);
  const calculation = answers ? calculateMaturityPreview(answers) : null;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Configuração versionada"
          title="Maturidade do negócio"
          description="Pré-visualização educacional do draft. A simulação não salva respostas, não atribui nível, não matricula participantes e não envia dados ao HubSpot."
          actions={
            <form className="flex flex-wrap items-end gap-3" method="get" aria-label="Selecionar organização">
              <Label>
                Organização
                <Select name="organization" defaultValue={organization.organization_id}>
                  {auth.identity.organizations.map((item) => (
                    <option value={item.organization_id} key={item.organization_id}>
                      {item.display_name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Button variant="secondary" type="submit">
                Selecionar
              </Button>
            </form>
          }
        />

        <StatusPanel title="Ativação bloqueada" tone="warning">
          <p>
            Versão {workspace.version.version_number} · definição {workspace.definition.status} · regra{" "}
            {workspace.rule.status}.
          </p>
          <p>
            Uso em crédito: <strong>proibido</strong>. Política de CRM:{" "}
            <strong>não sincronizar até aprovação de governança</strong>.
          </p>
          <p>
            Atribuições existentes neste draft: <strong>{workspace.assignment_count}</strong>.
          </p>
        </StatusPanel>

        <Card aria-labelledby="bloqueios-maturidade">
          <CardHeader>
            <CardTitle id="bloqueios-maturidade">Pendências para homologação</CardTitle>
          </CardHeader>
          <ul className="grid gap-2 text-sm text-ink">
            {workspace.version.configuration.publication_blockers.map((blocker) => (
              <li key={blocker} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                {blockerLabels[blocker] ?? blocker}
              </li>
            ))}
          </ul>
        </Card>

        <section className="grid gap-4" aria-labelledby="simulador-maturidade">
          <div>
            <h2 id="simulador-maturidade" className="text-xl font-semibold text-ink">
              Simular cálculo sem persistência
            </h2>
            <p className="text-sm text-muted">
              Os valores permanecem apenas na URL desta página. Nenhum resultado é gravado ou usado para
              personalização.
            </p>
          </div>
          <form className="grid gap-4" method="get">
            <input type="hidden" name="organization" value={organization.organization_id} />
            {workspace.dimensions.map((dimension) => {
              const current = single(query[`score_${dimension.code}`]);
              return (
                <Card key={dimension.id}>
                  <fieldset className="grid gap-2">
                    <legend className="font-semibold text-ink">
                      {dimension.position}. {dimension.name}
                    </legend>
                    <p className="text-sm text-muted">{dimension.item.prompt}</p>
                    <Label>
                      Resposta
                      <Select name={`score_${dimension.code}`} defaultValue={current ?? ""} required>
                        <option value="" disabled>
                          Selecione
                        </option>
                        {dimension.item.options.map((option) => (
                          <option value={String(option.value.score)} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </Label>
                  </fieldset>
                </Card>
              );
            })}
            <Button type="submit" className="w-fit">
              Calcular prévia local
            </Button>
          </form>
        </section>

        {calculation?.status === "calculated" ? (
          <Card aria-labelledby="resultado-previa">
            <CardHeader>
              <CardTitle id="resultado-previa">Resultado da prévia</CardTitle>
            </CardHeader>
            <p className="text-2xl font-bold text-ink">
              {calculation.overallScore}%{" "}
              <span className="text-base font-medium text-muted">· {segmentLabels[calculation.segment]}</span>
            </p>
            <p className="mt-2 text-sm text-ink">
              Dimensão de foco: <strong>{dimensionLabel(calculation.focusDimension)}</strong>.
            </p>
            <p className="mt-1 text-xs text-muted">Confiança: não calculada enquanto a metodologia permanecer em draft.</p>
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {maturityDimensions.map((dimension) => (
                <div
                  key={dimension.code}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm"
                >
                  <dt className="text-muted">{dimension.label}</dt>
                  <dd className="font-semibold text-ink">{calculation.dimensionScores[dimension.code]}%</dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}

        {calculation?.status === "abstained" ? (
          <StatusPanel title="Cálculo não realizado" tone="warning">
            As respostas não atendem ao contrato do draft: {calculation.reason}.
          </StatusPanel>
        ) : null}

        <section className="grid gap-4" aria-labelledby="questoes-configuradas">
          <h2 id="questoes-configuradas" className="text-xl font-semibold text-ink">
            Perguntas e opções versionadas
          </h2>
          <div className="grid gap-4">
            {workspace.dimensions.map((dimension) => (
              <Card key={`review:${dimension.id}`}>
                <h3 className="font-semibold text-ink">{dimension.name}</h3>
                <p className="mt-1 text-sm text-muted">{dimension.description}</p>
                <p className="mt-3 text-sm font-semibold text-ink">{dimension.item.prompt}</p>
                <ol className="mt-2 grid gap-1.5 text-sm text-ink">
                  {dimension.item.options.map((option) => (
                    <li
                      key={option.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3.5 py-2"
                    >
                      <span>{option.label}</span>
                      <Badge>{option.value.score}</Badge>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4" aria-labelledby="segmentos-configurados">
          <h2 id="segmentos-configurados" className="text-xl font-semibold text-ink">
            Segmentos ainda não publicados
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {workspace.segments.map((segment) => (
              <Card key={segment.version_id}>
                <h3 className="font-semibold text-ink">{segment.name}</h3>
                <p className="mt-1 text-sm text-muted">{segment.description}</p>
                <StatusPill tone="neutral" className="mt-3">
                  Estado: {segment.status} · publicado: não
                </StatusPill>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
