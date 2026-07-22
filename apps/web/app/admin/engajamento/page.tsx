import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { saveAnnouncementAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os campos do anúncio.",
  sem_permissao: "Seu papel não permite administrar engajamento.",
  cta_incompleto: "Informe o texto e o endereço do botão, ou deixe ambos vazios.",
  periodo_invalido: "O término deve acontecer depois do início.",
  conflito_versao: "O anúncio foi alterado por outra pessoa. Recarregue a página.",
  falha: "Não foi possível salvar o anúncio.",
};

function localDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function announcementTone(status: string): "success" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "retired") return "warning";
  return "neutral";
}

export default async function EngagementAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string; sucesso?: string; erro?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const manageable = auth.identity.organizations.filter((item) => item.permissions.includes("engagement.manage"));
  const organization = manageable.find((item) => item.organization_id === query.organization) ?? manageable[0];

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Experiência do participante"
          title="Engajamento e anúncios"
          description="Publique comunicações reais no carrossel do painel. Toda alteração usa versão otimista, idempotência e evento administrativo."
          actions={
            organization ? (
              <form className="flex flex-wrap items-end gap-3" method="get">
                <Label>
                  Organização
                  <Select name="organization" defaultValue={organization.organization_id}>
                    {manageable.map((item) => (
                      <option key={item.organization_id} value={item.organization_id}>
                        {item.display_name}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Button variant="secondary" type="submit">
                  Selecionar
                </Button>
              </form>
            ) : undefined
          }
        />

        {!organization ? (
          <StatusPanel title="Permissão necessária" tone="warning">
            Nenhuma organização permite administrar engajamento.
          </StatusPanel>
        ) : (
          <>
            {query.sucesso === "salvo" ? (
              <StatusPanel title="Anúncio salvo" tone="success">
                O estado publicado já pode aparecer para participantes elegíveis.
              </StatusPanel>
            ) : null}
            {query.erro ? (
              <StatusPanel title="Alteração não concluída" tone="warning">
                {errorMessages[query.erro] ?? errorMessages.falha}
              </StatusPanel>
            ) : null}

            <Card aria-labelledby="novo-anuncio-titulo">
              <CardHeader>
                <CardTitle id="novo-anuncio-titulo">Criar anúncio</CardTitle>
              </CardHeader>
              <AnnouncementForm organizationId={organization.organization_id} />
            </Card>

            <AnnouncementList actor={auth.identity.user_account_id} organizationId={organization.organization_id} />
          </>
        )}
      </div>
    </AppShell>
  );
}

async function AnnouncementList({ actor, organizationId }: { actor: string; organizationId: string }) {
  const data = await engagementRuntime.listOperatorAnnouncements(actor, organizationId);
  if (!data.announcements.length) {
    return (
      <EmptyState title="Nenhum anúncio" tone="info">
        Crie o primeiro item do carrossel do participante.
      </EmptyState>
    );
  }
  return (
    <section className="grid gap-4" aria-labelledby="anuncios-existentes-titulo">
      <h2 id="anuncios-existentes-titulo" className="text-xl font-semibold text-ink">
        Anúncios cadastrados
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <CardTitle>{announcement.title}</CardTitle>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone={announcementTone(announcement.status)}>{announcement.status}</StatusPill>
                <Badge>Prioridade {announcement.priority}</Badge>
              </div>
            </CardHeader>
            <p className="text-sm text-ink">{announcement.body}</p>
            <details className="mt-4 border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-primary">Editar anúncio</summary>
              <div className="mt-4">
                <AnnouncementForm
                  organizationId={organizationId}
                  announcementId={announcement.id}
                  expectedVersion={announcement.aggregate_version}
                  title={announcement.title}
                  body={announcement.body}
                  ctaLabel={announcement.cta_label}
                  ctaUrl={announcement.cta_url}
                  status={announcement.status}
                  priority={announcement.priority}
                  startsAt={announcement.starts_at}
                  endsAt={announcement.ends_at}
                />
              </div>
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}

function AnnouncementForm({
  organizationId,
  announcementId = null,
  expectedVersion = null,
  title = "",
  body = "",
  ctaLabel = null,
  ctaUrl = null,
  status = "draft",
  priority = 0,
  startsAt = null,
  endsAt = null,
}: {
  organizationId: string;
  announcementId?: string | null;
  expectedVersion?: number | null;
  title?: string;
  body?: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  status?: "draft" | "published" | "retired";
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  return (
    <form action={saveAnnouncementAction} className="grid gap-4">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="announcement_id" value={announcementId ?? ""} />
      <input type="hidden" name="expected_version" value={expectedVersion ?? ""} />
      <Label>
        Título
        <Input name="title" defaultValue={title} minLength={2} maxLength={120} required />
      </Label>
      <Label>
        Mensagem
        <Textarea name="body" defaultValue={body} minLength={2} maxLength={1200} rows={4} required />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          Texto do botão <span className="font-normal text-muted">(opcional)</span>
          <Input name="cta_label" defaultValue={ctaLabel ?? ""} maxLength={60} />
        </Label>
        <Label>
          Link do botão <span className="font-normal text-muted">(opcional)</span>
          <Input name="cta_url" defaultValue={ctaUrl ?? ""} placeholder="/empreendedor ou https://..." maxLength={500} />
        </Label>
        <Label>
          Início <span className="font-normal text-muted">(opcional)</span>
          <Input name="starts_at" type="datetime-local" defaultValue={localDate(startsAt)} />
        </Label>
        <Label>
          Término <span className="font-normal text-muted">(opcional)</span>
          <Input name="ends_at" type="datetime-local" defaultValue={localDate(endsAt)} />
        </Label>
        <Label>
          Prioridade
          <Input name="priority" type="number" min={-1000} max={1000} defaultValue={priority} required />
        </Label>
        <Label>
          Estado
          <Select name="status" defaultValue={status}>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="retired">Retirado</option>
          </Select>
        </Label>
      </div>
      <Button type="submit" className="w-fit">
        {announcementId ? "Salvar alterações" : "Criar anúncio"}
      </Button>
    </form>
  );
}
