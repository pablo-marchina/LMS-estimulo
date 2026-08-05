import Link from "next/link";
import { Image as ImageIcon, Monitor, Smartphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StandardizedFileUpload } from "@/components/standardized-file-upload";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { getAdminInterfaceContent } from "@/lib/interface-content/runtime";
import { resolvedInterfaceValue, type AdminInterfaceContentEntry } from "@/lib/interface-content/contracts";

export const dynamic = "force-dynamic";

function textValue(entry: AdminInterfaceContentEntry | undefined, fallback = "") {
  if (!entry) return fallback;
  const value = resolvedInterfaceValue(entry).text;
  return typeof value === "string" && value.trim() ? value : fallback;
}

function mediaValue(entry: AdminInterfaceContentEntry) {
  return resolvedInterfaceValue(entry);
}

function relatedEntry(entries: AdminInterfaceContentEntry[], media: AdminInterfaceContentEntry, suffix: "title" | "description" | "eyebrow") {
  return entries.find((entry) => entry.content_key === media.content_key.replace(/\.media$/, `.${suffix}`));
}

export default async function HeaderMediaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  }
  const canEdit = organization.permissions.includes("interface.content.manage") || organization.permissions.includes("journey.definition.manage");
  const workspace = await getAdminInterfaceContent({
    actorUserAccountId: auth.identity.user_account_id,
    organizationId: organization.organization_id,
  });
  const mediaEntries = workspace.entries
    .filter((entry) => entry.area === "participant" && entry.placement === "header" && entry.element_type === "image" && entry.content_key.endsWith(".media"))
    .sort((a, b) => a.page.localeCompare(b.page, "pt-BR"));

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Experiência"
          title="Cabeçalhos responsivos"
          description="Substitua o fundo padrão das páginas por imagens próprias para desktop e celular. Títulos e subtítulos continuam editáveis no CMS principal."
          actions={<Link href="/admin/experiencia" className="inline-flex min-h-10 items-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-secondary hover:bg-surface-muted">Voltar ao CMS</Link>}
        />
        {!canEdit ? <StatusPanel title="Somente consulta" tone="info">Você pode visualizar as configurações, mas não alterá-las.</StatusPanel> : null}
        {query.sucesso ? <StatusPanel title="Cabeçalho atualizado" tone="success">A configuração foi salva. Quando publicada, aparecerá no próximo carregamento da página.</StatusPanel> : null}
        {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Revise os arquivos e tente novamente.</StatusPanel> : null}

        <Card className="grid gap-4">
          <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><ImageIcon size={21} /></span><div><h2 className="font-black text-secondary">Padrão de mídia</h2><p className="mt-1 text-sm leading-6 text-muted">Desktop: 1600 × 480 px. Mobile: 900 × 600 px. PNG, JPG ou WEBP, até 8 MB. Se a imagem mobile não for enviada, o desktop será usado como fallback.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="flex gap-3 rounded-xl bg-surface-muted p-4"><Monitor className="shrink-0 text-primary" size={20} /><p className="text-sm text-muted"><strong className="block text-ink">Desktop</strong>Formato horizontal e área segura central para título e subtítulo.</p></div><div className="flex gap-3 rounded-xl bg-surface-muted p-4"><Smartphone className="shrink-0 text-secondary" size={20} /><p className="text-sm text-muted"><strong className="block text-ink">Mobile</strong>Composição própria para telas estreitas, sem depender de recorte automático.</p></div></div>
        </Card>

        <div className="grid gap-5">
          {mediaEntries.map((entry) => {
            const value = mediaValue(entry);
            const title = textValue(relatedEntry(workspace.entries, entry, "title"), entry.page);
            const description = textValue(relatedEntry(workspace.entries, entry, "description"));
            const eyebrow = textValue(relatedEntry(workspace.entries, entry, "eyebrow"));
            const desktopId = typeof value.image_file_object_id === "string" ? value.image_file_object_id : "";
            const mobileId = typeof value.mobile_image_file_object_id === "string" ? value.mobile_image_file_object_id : "";
            return (
              <details key={entry.content_key} className="rounded-2xl border border-border bg-white shadow-sm">
                <summary className="cursor-pointer list-none p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow || entry.page}</p><h2 className="mt-1 text-lg font-black text-secondary">{title}</h2><p className="mt-1 text-sm text-muted">{description || entry.route_pattern}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${value.visible && desktopId ? "bg-success-soft text-success" : "bg-surface-muted text-muted"}`}>{value.visible && desktopId ? "Imagem ativa" : "Cabeçalho padrão"}</span></div>
                </summary>
                <form action="/api/interface-content-media" method="post" encType="multipart/form-data" className="grid gap-5 border-t border-border p-5">
                  <input type="hidden" name="content_key" value={entry.content_key} />
                  <input type="hidden" name="locale" value={workspace.locale} />
                  <input type="hidden" name="current_image_file_object_id" value={desktopId} />
                  <input type="hidden" name="current_mobile_image_file_object_id" value={mobileId} />
                  <input type="hidden" name="order" value={typeof value.order === "number" ? value.order : 0} />
                  <input type="hidden" name="tone" value={typeof value.tone === "string" ? value.tone : "neutral"} />

                  <div className="grid gap-5 lg:grid-cols-2">
                    <StandardizedFileUpload name="desktop_file" accept="image/png,image/jpeg,image/webp" label={desktopId ? "Substituir imagem desktop" : "Imagem desktop"} maxSizeMb={8} recommendedDimensions="1600 × 480 px" recommendedRatio="10:3" currentPreviewUrl={desktopId ? `/api/interface-media/${desktopId}` : null} currentPreviewAlt={typeof value.alt === "string" ? value.alt : "Cabeçalho desktop atual"} />
                    <StandardizedFileUpload name="mobile_file" accept="image/png,image/jpeg,image/webp" label={mobileId ? "Substituir imagem mobile" : "Imagem mobile (opcional)"} maxSizeMb={8} recommendedDimensions="900 × 600 px" recommendedRatio="3:2" currentPreviewUrl={mobileId ? `/api/interface-media/${mobileId}` : null} currentPreviewAlt={typeof value.alt === "string" ? value.alt : "Cabeçalho mobile atual"} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Label>Descrição acessível<Input name="alt" defaultValue={typeof value.alt === "string" ? value.alt : ""} maxLength={240} /><span className="text-[11px] font-normal text-muted">Descreva apenas informação visual relevante que não esteja no título ou subtítulo.</span></Label>
                    <Label>Posição do recorte<Select name="image_position" defaultValue={value.image_position === "top" || value.image_position === "bottom" ? value.image_position : "center"}><option value="center">Centralizado</option><option value="top">Alinhado ao topo</option><option value="bottom">Alinhado à base</option></Select></Label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2"><label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm"><input type="checkbox" name="visible" defaultChecked={value.visible === true} className="mt-0.5 size-4 accent-primary" /><span><strong className="block text-ink">Usar imagem neste cabeçalho</strong><small className="text-muted">Desmarque para voltar ao fundo padrão sem apagar os arquivos.</small></span></label><div className="grid gap-2"><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="remove_desktop" /> Remover imagem desktop</label><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="remove_mobile" /> Remover imagem mobile</label></div></div>

                  <div className="flex flex-wrap gap-3"><Button type="submit" name="publish_now" value="true">Salvar e publicar</Button><Button type="submit" variant="secondary">Salvar rascunho</Button><Link href={`/admin/experiencia?edit=${encodeURIComponent(entry.content_key.replace(/\.media$/, ".title"))}&preview_route=${encodeURIComponent(entry.route_pattern ?? "/empreendedor")}#editor-elemento`} className="inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-bold text-primary hover:bg-primary-soft">Editar título e subtítulo</Link></div>
                </form>
              </details>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
