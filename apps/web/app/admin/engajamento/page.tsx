import { Image as ImageIcon, Megaphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import type { OperatorAnnouncement } from "@/lib/engagement/contracts";
import { engagementRuntime } from "@/lib/engagement/runtime";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  FORBIDDEN: "Seu papel não permite administrar anúncios.",
  ANNOUNCEMENT_CONTENT_TYPE_NOT_ALLOWED: "Use uma imagem PNG, JPG ou WEBP.",
  ANNOUNCEMENT_FILE_SIZE_INVALID: "A imagem deve ter no máximo 4 MB.",
  ANNOUNCEMENT_FILE_EXTENSION_NOT_ALLOWED: "A extensão não corresponde ao formato da imagem.",
  ANNOUNCEMENT_IMAGE_REQUIRED: "Selecione uma imagem para o modo somente imagem.",
  ANNOUNCEMENT_IMAGE_ALT_REQUIRED: "Descreva a imagem para acessibilidade.",
  ANNOUNCEMENT_CTA_PAIR_REQUIRED: "Informe o texto e o endereço do botão, ou deixe ambos vazios.",
  ANNOUNCEMENT_WINDOW_INVALID: "O término deve acontecer depois do início.",
  ANNOUNCEMENT_VERSION_CONFLICT: "O anúncio foi alterado por outra pessoa. Recarregue a página.",
  ANNOUNCEMENT_SAVE_FAILED: "Não foi possível salvar o anúncio.",
};

function localDate(value: string | null) {
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
  searchParams: Promise<{ view?: string; sucesso?: string; erro?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("engagement.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Permissão necessária" tone="warning">Seu papel não permite administrar anúncios.</StatusPanel></AppShell>;
  }
  const view = query.view === "gerenciar" ? "gerenciar" : "novo";

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-7">
        <PageHeader eyebrow="Experiência do participante" title="Anúncios" description="Publique banners visuais no carrossel da Home. Se não houver anúncio publicado, o carrossel não aparece." />
        <nav className="grid gap-2 rounded-xl border border-border bg-white p-2 sm:grid-cols-2">
          <ButtonLink href="/admin/engajamento?view=novo" variant={view === "novo" ? "primary" : "ghost"} size="sm">Criar anúncio</ButtonLink>
          <ButtonLink href="/admin/engajamento?view=gerenciar" variant={view === "gerenciar" ? "primary" : "ghost"} size="sm">Gerenciar anúncios</ButtonLink>
        </nav>
        {query.sucesso === "salvo" ? <StatusPanel title="Anúncio salvo" tone="success">O banner publicado já está disponível para os participantes.</StatusPanel> : null}
        {query.erro ? <StatusPanel title="Alteração não concluída" tone="warning">{errorMessages[query.erro] ?? errorMessages.ANNOUNCEMENT_SAVE_FAILED}</StatusPanel> : null}
        {view === "novo" ? (
          <Card aria-labelledby="novo-anuncio-titulo">
            <CardHeader><CardTitle id="novo-anuncio-titulo">Novo anúncio</CardTitle></CardHeader>
            <BannerSpecifications />
            <div className="mt-6"><AnnouncementForm organizationId={organization.organization_id} /></div>
          </Card>
        ) : (
          <AnnouncementList actor={auth.identity.user_account_id} organizationId={organization.organization_id} />
        )}
      </div>
    </AppShell>
  );
}

function BannerSpecifications() {
  return (
    <section className="rounded-xl border border-primary/20 bg-primary-soft/40 p-5" aria-labelledby="banner-especificacoes">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-white"><ImageIcon size={19} /></span>
        <div>
          <h2 id="banner-especificacoes" className="font-semibold text-ink">Especificações da imagem</h2>
          <p className="mt-1 text-sm text-muted">Recomendado: <strong>1600 × 600 px</strong>, proporção horizontal 8:3. Mínimo sugerido: 1200 × 450 px.</p>
          <p className="mt-1 text-sm text-muted">Formatos PNG, JPG ou WEBP, até 4 MB. Evite texto importante nas bordas e mantenha a área central legível em celular.</p>
        </div>
      </div>
    </section>
  );
}

async function AnnouncementList({ actor, organizationId }: { actor: string; organizationId: string }) {
  const data = await engagementRuntime.listOperatorAnnouncements(actor, organizationId);
  if (!data.announcements.length) return <EmptyState icon={<Megaphone size={24} />} title="Nenhum anúncio" tone="info">Crie o primeiro banner. Enquanto não houver item publicado, nenhum carrossel será mostrado aos participantes.</EmptyState>;
  return (
    <section className="grid gap-4" aria-labelledby="anuncios-existentes-titulo">
      <div><h2 id="anuncios-existentes-titulo" className="text-xl font-semibold text-ink">Anúncios cadastrados</h2><p className="text-sm text-muted">Abra apenas o item que deseja editar.</p></div>
      <div className="grid gap-4">
        {data.announcements.map((announcement) => (
          <details className="rounded-xl border border-border bg-white" key={announcement.id}>
            <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
              {announcement.image_file_object_id ? <img src={`/api/announcements/${announcement.id}/image`} alt="" className="h-16 w-28 rounded-lg border border-border object-cover" /> : <span className="grid h-16 w-28 place-items-center rounded-lg bg-surface-muted text-muted"><ImageIcon /></span>}
              <div className="min-w-0 flex-1"><strong className="block truncate text-ink">{announcement.title}</strong><p className="mt-1 line-clamp-1 text-sm text-muted">{announcement.body}</p></div>
              <div className="flex shrink-0 items-center gap-2"><StatusPill tone={announcementTone(announcement.status)}>{announcement.status}</StatusPill><Badge>Prioridade {announcement.priority}</Badge></div>
            </summary>
            <div className="border-t border-border p-5">
              <BannerSpecifications />
              <div className="mt-6"><AnnouncementForm organizationId={organizationId} announcement={announcement} /></div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function AnnouncementForm({ organizationId, announcement }: { organizationId: string; announcement?: OperatorAnnouncement }) {
  return (
    <form action="/api/announcement-banner-uploads" method="post" encType="multipart/form-data" className="grid gap-5">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="announcement_id" value={announcement?.id ?? ""} />
      <input type="hidden" name="expected_version" value={announcement?.aggregate_version ?? ""} />
      <input type="hidden" name="current_image_file_object_id" value={announcement?.image_file_object_id ?? ""} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Label>Formato do banner<Select name="display_mode" defaultValue={announcement?.display_mode ?? "image_only"}><option value="image_only">Somente imagem</option><option value="image_with_text">Imagem com título e mensagem</option></Select></Label>
        <Label>Estado<Select name="status" defaultValue={announcement?.status ?? "draft"}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="retired">Retirado</option></Select></Label>
      </div>

      {announcement?.image_file_object_id ? <div className="rounded-xl border border-border bg-surface-muted p-3"><p className="mb-2 text-xs font-semibold text-muted">Imagem atual</p><img src={`/api/announcements/${announcement.id}/image`} alt={announcement.image_alt ?? "Banner atual"} className="max-h-72 w-full rounded-lg bg-white object-contain" /></div> : null}
      <FileUploadPreview name="file" accept="image/png,image/jpeg,image/webp" label={announcement?.image_file_object_id ? "Substituir imagem (opcional)" : "Imagem do banner"} help="A prévia aparece antes do envio. PNG, JPG ou WEBP; máximo de 4 MB." />
      <Label>Descrição acessível da imagem<Input name="image_alt" defaultValue={announcement?.image_alt ?? ""} minLength={3} maxLength={240} placeholder="Ex.: Empreendedora usando inteligência artificial para organizar seu negócio" /></Label>

      <div className="grid gap-4 lg:grid-cols-2">
        <Label>Título <span className="font-normal text-muted">(opcional em “somente imagem”)</span><Input name="title" defaultValue={announcement?.title ?? ""} maxLength={120} /></Label>
        <Label>Prioridade<Input name="priority" type="number" min={-1000} max={1000} defaultValue={announcement?.priority ?? 0} required /></Label>
      </div>
      <Label>Mensagem <span className="font-normal text-muted">(opcional em “somente imagem”)</span><Textarea name="body" defaultValue={announcement?.body ?? ""} maxLength={1200} rows={4} /></Label>
      <div className="grid gap-4 lg:grid-cols-2">
        <Label>Texto do botão <span className="font-normal text-muted">(opcional)</span><Input name="cta_label" defaultValue={announcement?.cta_label ?? ""} maxLength={60} /></Label>
        <Label>Link do botão <span className="font-normal text-muted">(opcional)</span><Input name="cta_url" defaultValue={announcement?.cta_url ?? ""} placeholder="/empreendedor ou https://..." maxLength={500} /></Label>
        <Label>Início <span className="font-normal text-muted">(opcional)</span><Input name="starts_at" type="datetime-local" defaultValue={localDate(announcement?.starts_at ?? null)} /></Label>
        <Label>Término <span className="font-normal text-muted">(opcional)</span><Input name="ends_at" type="datetime-local" defaultValue={localDate(announcement?.ends_at ?? null)} /></Label>
      </div>
      <Button type="submit" className="w-fit">{announcement ? "Salvar alterações" : "Criar anúncio"}</Button>
    </form>
  );
}
