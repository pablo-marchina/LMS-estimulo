import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
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

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading">
      <p className="eyebrow">Experiência do participante</p>
      <h1>Engajamento e anúncios</h1>
      <p>Publique comunicações reais no carrossel do painel. Toda alteração usa versão otimista, idempotência e evento administrativo.</p>
    </header>

    {!organization ? <StatusPanel title="Permissão necessária" tone="warning"><p>Nenhuma organização permite administrar engajamento.</p></StatusPanel> : <>
      {query.sucesso === "salvo" ? <StatusPanel title="Anúncio salvo" tone="success"><p>O estado publicado já pode aparecer para participantes elegíveis.</p></StatusPanel> : null}
      {query.erro ? <StatusPanel title="Alteração não concluída" tone="warning"><p>{errorMessages[query.erro] ?? errorMessages.falha}</p></StatusPanel> : null}

      <form className="inline-form" method="get">
        <label>Organização<select name="organization" defaultValue={organization.organization_id}>{manageable.map((item) => <option key={item.organization_id} value={item.organization_id}>{item.display_name}</option>)}</select></label>
        <button className="button button--secondary" type="submit">Selecionar</button>
      </form>

      <section className="card stack" aria-labelledby="novo-anuncio-titulo">
        <h2 id="novo-anuncio-titulo">Criar anúncio</h2>
        <AnnouncementForm organizationId={organization.organization_id} />
      </section>

      <AnnouncementList actor={auth.identity.user_account_id} organizationId={organization.organization_id} />
    </>}
  </AppShell>;
}

async function AnnouncementList({ actor, organizationId }: { actor: string; organizationId: string }) {
  const data = await engagementRuntime.listOperatorAnnouncements(actor, organizationId);
  if (!data.announcements.length) {
    return <StatusPanel title="Nenhum anúncio" tone="info"><p>Crie o primeiro item do carrossel do participante.</p></StatusPanel>;
  }
  return <section className="stack stack--large" aria-labelledby="anuncios-existentes-titulo">
    <h2 id="anuncios-existentes-titulo">Anúncios cadastrados</h2>
    <div className="card-grid">
      {data.announcements.map((announcement) => <article className="card stack" key={announcement.id}>
        <div className="card-meta"><span className="status-pill">{announcement.status}</span><span>Prioridade {announcement.priority}</span></div>
        <h3>{announcement.title}</h3>
        <p>{announcement.body}</p>
        <details>
          <summary>Editar anúncio</summary>
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
        </details>
      </article>)}
    </div>
  </section>;
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
  return <form action={saveAnnouncementAction} className="stack announcement-form">
    <input type="hidden" name="organization_id" value={organizationId} />
    <input type="hidden" name="announcement_id" value={announcementId ?? ""} />
    <input type="hidden" name="expected_version" value={expectedVersion ?? ""} />
    <label>Título<input name="title" defaultValue={title} minLength={2} maxLength={120} required /></label>
    <label>Mensagem<textarea name="body" defaultValue={body} minLength={2} maxLength={1200} rows={4} required /></label>
    <div className="form-grid">
      <label>Texto do botão <span className="metadata">(opcional)</span><input name="cta_label" defaultValue={ctaLabel ?? ""} maxLength={60} /></label>
      <label>Link do botão <span className="metadata">(opcional)</span><input name="cta_url" defaultValue={ctaUrl ?? ""} placeholder="/empreendedor ou https://..." maxLength={500} /></label>
      <label>Início <span className="metadata">(opcional)</span><input name="starts_at" type="datetime-local" defaultValue={localDate(startsAt)} /></label>
      <label>Término <span className="metadata">(opcional)</span><input name="ends_at" type="datetime-local" defaultValue={localDate(endsAt)} /></label>
      <label>Prioridade<input name="priority" type="number" min={-1000} max={1000} defaultValue={priority} required /></label>
      <label>Estado<select name="status" defaultValue={status}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="retired">Retirado</option></select></label>
    </div>
    <button className="button button--primary" type="submit">{announcementId ? "Salvar alterações" : "Criar anúncio"}</button>
  </form>;
}
