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

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminGamificationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return <main className="mx-auto max-w-xl px-4 py-16"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com sua conta Estímulo.</p></StatusPanel></main>;
  }
  const requested = single(query.organization);
  const organization = auth.identity.organizations.find((item) => item.organization_id === requested)
    ?? auth.identity.organizations.find((item) => item.permissions.includes("engagement.manage"));
  if (!organization?.permissions.includes("engagement.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Gamificação restrita" tone="warning"><p>Seu papel não permite configurar pontos e credenciais.</p></StatusPanel></AppShell>;
  }

  const workspace = await getAdminProductWorkspace(auth.identity.user_account_id, organization.organization_id);
  const ruleVersions = workspace.rules.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));
  const journeyVersions = workspace.journeys.flatMap((item) => item.versions.map((version) => ({ ...version, definitionName: item.name })));

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Engajamento"
          title="Pontos, selos e certificados"
          description="Defina o que a pessoa conquista, com que frequência e por quanto tempo. Os detalhes técnicos são montados automaticamente."
        />

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label>Organização
            <Select name="organization" defaultValue={organization.organization_id} className="w-64">
              {auth.identity.organizations.filter((item) => item.permissions.includes("engagement.manage")).map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Button variant="secondary" type="submit">Selecionar</Button>
        </form>

        {single(query.sucesso) ? <StatusPanel title="Configuração salva" tone="success"><p>A nova versão foi registrada.</p></StatusPanel> : null}
        {single(query.erro) ? <StatusPanel title="Não foi possível salvar" tone="warning"><p>Revise os campos obrigatórios e as regras selecionadas.</p></StatusPanel> : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <details className="group rounded-xl border border-border bg-surface" open>
            <summary className="grid cursor-pointer gap-1 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
              <strong className="text-ink">Regra de pontos</strong>
              <span className="text-sm text-muted">Quantos pontos e com qual frequência</span>
            </summary>
            <div className="border-t border-border p-5">
              <form action={saveGamificationResourceAction} className="grid gap-4">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="resource_type" value="point_rule" />
                <Label>Editar uma regra existente
                  <Select name="definition_id"><option value="">Criar nova regra</option>{workspace.point_rules.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select>
                </Label>
                <Label>Nome da regra<Input name="name" required placeholder="Ex.: Concluir uma aula" /></Label>
                <Label>Pontos por ação<Input name="amount" type="number" min="0" required defaultValue="10" /></Label>
                <Label>Quando a pessoa pode receber
                  <Select name="frequency" defaultValue="once">
                    <option value="once">Uma única vez</option>
                    <option value="per_activity">Uma vez por atividade</option>
                    <option value="per_assessment">Uma vez por avaliação</option>
                    <option value="daily">Até um limite por dia</option>
                    <option value="weekly">Até um limite por semana</option>
                    <option value="unlimited">Sempre que a ação acontecer</option>
                  </Select>
                </Label>
                <Label>Máximo no período<Input name="maximum_awards" type="number" min="1" defaultValue="1" /><span className="mt-1 block text-xs font-normal text-muted">Ignorado quando a frequência for “sempre”.</span></Label>
                <Label>Condição necessária
                  <Select name="eligibility_rule_version_id" required>
                    <option value="">Selecione</option>
                    {ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>)}
                  </Select>
                </Label>
                <Label>Disponibilidade
                  <Select name="status"><option value="draft">Salvar como rascunho</option><option value="published">Publicar agora</option></Select>
                </Label>
                <Button type="submit" className="w-fit">Salvar regra de pontos</Button>
              </form>
            </div>
          </details>

          <details className="group rounded-xl border border-border bg-surface">
            <summary className="grid cursor-pointer gap-1 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
              <strong className="text-ink">Selo</strong>
              <span className="text-sm text-muted">Reconhecimento por uma conquista</span>
            </summary>
            <div className="border-t border-border p-5">
              <form action={saveGamificationResourceAction} className="grid gap-4">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="resource_type" value="badge" />
                <Label>Editar um selo existente
                  <Select name="definition_id"><option value="">Criar novo selo</option>{workspace.badges.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select>
                </Label>
                <Label>Nome de organização<Input name="name" required placeholder="Ex.: Selo Gestão com IA" /></Label>
                <Label>Título mostrado ao participante<Input name="title" required placeholder="Ex.: Gestão com IA" /></Label>
                <Label>O que este selo reconhece<Textarea name="description" rows={3} required /></Label>
                <Label>Condição para receber
                  <Select name="criteria_rule_version_id" required><option value="">Selecione</option>{ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>)}</Select>
                </Label>
                <Label>Disponibilidade<Select name="status"><option value="draft">Salvar como rascunho</option><option value="published">Publicar agora</option></Select></Label>
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
                <Label>Editar um certificado existente
                  <Select name="definition_id"><option value="">Criar novo certificado</option>{workspace.certificates.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select>
                </Label>
                <Label>Nome do certificado<Input name="name" required /></Label>
                <Label>Jornada
                  <Select name="journey_version_id" required><option value="">Selecione</option>{journeyVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)} · {String(item.status) === "published" ? "publicada" : "rascunho"}</option>)}</Select>
                </Label>
                <Label>Condição para receber
                  <Select name="requirements_rule_version_id" required><option value="">Selecione</option>{ruleVersions.map((item) => <option value={String(item.id)} key={String(item.id)}>{item.definitionName} · versão {String(item.version_number)}</option>)}</Select>
                </Label>
                <Label>Validade
                  <Select name="validity_mode" defaultValue="never"><option value="never">Não expira</option><option value="months">Expira depois de alguns meses</option></Select>
                </Label>
                <Label>Quantidade de meses<Input name="validity_months" type="number" min="1" max="120" defaultValue="12" /><span className="mt-1 block text-xs font-normal text-muted">Usado somente quando o certificado tiver validade.</span></Label>
                <Label>Disponibilidade<Select name="status"><option value="draft">Salvar como rascunho</option><option value="published">Publicar agora</option></Select></Label>
                <Button type="submit" className="w-fit">Salvar certificado</Button>
              </form>
            </div>
          </details>
        </div>

        <Card>
          <CardHeader><CardTitle>Itens configurados</CardTitle></CardHeader>
          <div className="grid gap-6 sm:grid-cols-3">
            <Inventory title="Regras de pontos" items={workspace.point_rules} />
            <Inventory title="Selos" items={workspace.badges} />
            <Inventory title="Certificados" items={workspace.certificates} />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Inventory({ title, items }: { title: string; items: Array<{ definition_id: string; name: string; versions: unknown[] }> }) {
  return <div><h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3><div className="mt-3 grid gap-2">{items.length ? items.map((item) => <div key={item.definition_id} className="text-sm text-ink"><strong>{item.name}</strong><p className="text-xs text-muted">{item.versions.length} versão(ões)</p></div>) : <p className="text-sm text-muted">Nenhum item.</p>}</div></div>;
}
