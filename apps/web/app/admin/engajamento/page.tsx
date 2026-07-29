import { Image as ImageIcon, Megaphone } from "lucide-react";
import { AdminDisclosure, AdminSectionNav } from "@/components/admin-section-nav";
import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import type { OperatorAnnouncement } from "@/lib/engagement/contracts";
import { engagementRuntime } from "@/lib/engagement/runtime";

export const dynamic = "force-dynamic";
const errorMessages: Record<string, string> = { FORBIDDEN: "Seu papel não permite administrar anúncios.", ANNOUNCEMENT_CONTENT_TYPE_NOT_ALLOWED: "Use uma imagem PNG, JPG ou WEBP.", ANNOUNCEMENT_FILE_SIZE_INVALID: "A imagem deve ter no máximo 4 MB.", ANNOUNCEMENT_FILE_EXTENSION_NOT_ALLOWED: "A extensão não corresponde ao formato da imagem.", ANNOUNCEMENT_IMAGE_REQUIRED: "Selecione uma imagem para o modo somente imagem.", ANNOUNCEMENT_IMAGE_ALT_REQUIRED: "Descreva a imagem para acessibilidade.", ANNOUNCEMENT_CTA_PAIR_REQUIRED: "Informe o texto e o endereço do botão, ou deixe ambos vazios.", ANNOUNCEMENT_WINDOW_INVALID: "O término deve acontecer depois do início.", ANNOUNCEMENT_VERSION_CONFLICT: "O anúncio foi alterado por outra pessoa. Recarregue a página.", ANNOUNCEMENT_SAVE_FAILED: "Não foi possível salvar o anúncio." };
function localDate(value: string | null) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function announcementTone(status: string): "success" | "warning" | "neutral" { if (status === "published") return "success"; if (status === "retired") return "warning"; return "neutral"; }

export default async function EngagementAdminPage({ searchParams }: { searchParams: Promise<{ view?: string; sucesso?: string; erro?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const canEdit = organization.permissions.includes("engagement.manage");
  const view = query.view === "gerenciar" || !canEdit ? "gerenciar" : "novo";

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Comunicação" title="Anúncios" description="Crie banners para a página inicial e abra opções de agenda ou botão somente quando precisar." />
    {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode consultar os anúncios, mas não alterá-los.</StatusPanel> : null}
    <AdminSectionNav items={[...(canEdit ? [{ href: "/admin/engajamento?view=novo", label: "Novo anúncio", active: view === "novo" }] : []), { href: "/admin/engajamento?view=gerenciar", label: "Anúncios cadastrados", active: view === "gerenciar" }]} />
    {query.sucesso === "salvo" ? <StatusPanel title="Anúncio salvo" tone="success">Se publicado, o banner já está disponível para participantes.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Alteração não concluída" tone="warning">{errorMessages[query.erro] ?? errorMessages.ANNOUNCEMENT_SAVE_FAILED}</StatusPanel> : null}
    {view === "novo" && canEdit ? <Card><div><h2 className="text-lg font-black text-secondary">Novo anúncio</h2><p className="mt-1 text-sm text-muted">Imagem, descrição acessível e estado são os campos principais.</p></div><div className="mt-5"><AnnouncementForm organizationId={organization.organization_id} /></div></Card> : <AnnouncementList actor={auth.identity.user_account_id} organizationId={organization.organization_id} canEdit={canEdit} />}
  </div></AppShell>;
}

function ImageGuidance() { return <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-white"><ImageIcon size={19} /></span><div><p className="text-sm text-muted">Use imagem horizontal, preferencialmente <strong>1600 × 600 px</strong>, em PNG, JPG ou WEBP, com até 4 MB.</p><p className="mt-1 text-xs text-muted">Mantenha informações importantes longe das bordas para preservar a leitura no celular.</p></div></div>; }

async function AnnouncementList({ actor, organizationId, canEdit }: { actor: string; organizationId: string; canEdit: boolean }) {
  const data = await engagementRuntime.listOperatorAnnouncements(actor, organizationId);
  if (!data.announcements.length) return <EmptyState icon={<Megaphone size={24} />} title="Nenhum anúncio" tone="info">Nenhum banner foi cadastrado.</EmptyState>;
  return <section className="grid gap-4" aria-labelledby="anuncios-existentes-titulo"><div><h2 id="anuncios-existentes-titulo" className="text-lg font-semibold text-ink">Anúncios cadastrados</h2><p className="text-sm text-muted">Abra apenas o anúncio que deseja consultar ou editar.</p></div><div className="grid gap-4">{data.announcements.map((announcement) => <details className="rounded-xl border border-border bg-white" key={announcement.id}><summary className="flex cursor-pointer list-none items-center gap-4 p-5">{announcement.image_file_object_id ? <img src={`/api/announcements/${announcement.id}/image`} alt="" className="h-16 w-28 rounded-lg border border-border object-cover" /> : <span className="grid h-16 w-28 place-items-center rounded-lg bg-surface-muted text-muted"><ImageIcon /></span>}<div className="min-w-0 flex-1"><strong className="block truncate text-ink">{announcement.title || "Anúncio sem título"}</strong><p className="mt-1 line-clamp-1 text-sm text-muted">{announcement.body || announcement.image_alt}</p></div><StatusPill tone={announcementTone(announcement.status)}>{announcement.status === "published" ? "Publicado" : announcement.status === "retired" ? "Retirado" : "Rascunho"}</StatusPill></summary><div className="border-t border-border p-5">{canEdit ? <AnnouncementForm organizationId={organizationId} announcement={announcement} /> : <div className="grid gap-2 text-sm"><p><strong>Descrição acessível:</strong> {announcement.image_alt ?? "Não informada"}</p><p><strong>Formato:</strong> {announcement.display_mode === "image_only" ? "Somente imagem" : "Imagem com texto"}</p></div>}</div></details>)}</div></section>;
}

function AnnouncementForm({ organizationId, announcement }: { organizationId: string; announcement?: OperatorAnnouncement }) {
  return <form action="/api/announcement-banner-uploads" method="post" encType="multipart/form-data" className="grid gap-5"><input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="announcement_id" value={announcement?.id ?? ""} /><input type="hidden" name="expected_version" value={announcement?.aggregate_version ?? ""} /><input type="hidden" name="current_image_file_object_id" value={announcement?.image_file_object_id ?? ""} />
    {announcement?.image_file_object_id ? <div className="rounded-xl border border-border bg-surface-muted p-3"><p className="mb-2 text-xs font-semibold text-muted">Imagem atual</p><img src={`/api/announcements/${announcement.id}/image`} alt={announcement.image_alt ?? "Banner atual"} className="max-h-72 w-full rounded-lg bg-white object-contain" /></div> : null}
    <FileUploadPreview name="file" accept="image/png,image/jpeg,image/webp" label={announcement?.image_file_object_id ? "Substituir imagem (opcional)" : "Imagem do banner"} help="A prévia aparece antes do envio." />
    <Label>Descrição acessível<Input name="image_alt" defaultValue={announcement?.image_alt ?? ""} minLength={3} maxLength={240} /><span className="text-[11px] font-normal text-muted">Explique o conteúdo da imagem para pessoas que usam leitor de tela.</span></Label>
    <div className="grid gap-4 sm:grid-cols-2"><Label>Título<Input name="title" defaultValue={announcement?.title ?? ""} maxLength={120} /><span className="text-[11px] font-normal text-muted">Usado somente quando houver texto sobre a imagem.</span></Label><Label>Estado<Select name="status" defaultValue={announcement?.status ?? "draft"}><option value="draft">Salvar rascunho</option><option value="published">Publicar agora</option><option value="retired">Retirar do ar</option></Select></Label></div>
    <Label>Mensagem<Textarea name="body" defaultValue={announcement?.body ?? ""} maxLength={1200} rows={4} /></Label>
    <AdminDisclosure title="Formato, botão e período" description="Opções para exibir texto, definir prioridade, adicionar ação e agendar o anúncio."><ImageGuidance /><div className="mt-5 grid gap-4 sm:grid-cols-2"><Label>Formato<Select name="display_mode" defaultValue={announcement?.display_mode ?? "image_only"}><option value="image_only">Somente imagem</option><option value="image_with_text">Imagem com título e mensagem</option></Select></Label><Label>Prioridade<Input name="priority" type="number" min={-1000} max={1000} defaultValue={announcement?.priority ?? 0} required /><span className="text-[11px] font-normal text-muted">Números maiores aparecem primeiro.</span></Label><Label>Texto do botão<Input name="cta_label" defaultValue={announcement?.cta_label ?? ""} maxLength={60} /></Label><Label>Link do botão<Input name="cta_url" defaultValue={announcement?.cta_url ?? ""} maxLength={500} /></Label><Label>Início<Input name="starts_at" type="datetime-local" defaultValue={localDate(announcement?.starts_at ?? null)} /></Label><Label>Término<Input name="ends_at" type="datetime-local" defaultValue={localDate(announcement?.ends_at ?? null)} /></Label></div></AdminDisclosure>
    <Button type="submit" className="w-fit">{announcement ? "Salvar alterações" : "Criar anúncio"}</Button>
  </form>;
}
