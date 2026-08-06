import { AppShell } from "@/components/app-shell";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import {
  resolvedInterfaceValue,
  type AdminInterfaceContentEntry,
  type AdminInterfaceContentWorkspace,
} from "@/lib/interface-content/contracts";
import { interfaceRouteDefinition } from "@/lib/interface-content/route-catalog";
import { getAdminInterfaceContent } from "@/lib/interface-content/runtime";
import {
  archiveInterfaceElementAction,
  publishInterfaceContentAction,
  registerInterfaceElementAction,
  saveInterfaceContentAction,
} from "./actions";
import { VisualInterfaceSelector } from "./visual-interface-selector";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const areaLabels: Record<string, string> = {
  shared: "Compartilhado",
  public: "Público",
  participant: "Participante",
  admin: "Administrador",
};

const typeLabels: Record<string, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  navigation: "Item de menu",
  button: "Botão",
  link: "Link",
  image: "Imagem",
  notice: "Aviso",
  section: "Bloco de conteúdo",
  element: "Elemento",
};

const placementLabels: Record<string, string> = {
  navigation: "Navegação",
  header: "Cabeçalho",
  before_content: "Antes do conteúdo",
  content: "Conteúdo",
  after_content: "Depois do conteúdo",
  footer: "Rodapé",
};

function valueString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" ? String(value[key]) : "";
}

function valueNumber(value: Record<string, unknown>, key: string, fallback: number) {
  return typeof value[key] === "number" && Number.isFinite(value[key]) ? Number(value[key]) : fallback;
}

function schemaString(schema: Record<string, unknown>, key: string, fallback: string) {
  return typeof schema[key] === "string" && schema[key] ? String(schema[key]) : fallback;
}

function schemaNumber(schema: Record<string, unknown>, key: string, fallback: number) {
  return typeof schema[key] === "number" && Number.isFinite(schema[key]) ? Number(schema[key]) : fallback;
}

function ElementSpecifications({ entry }: { entry: AdminInterfaceContentEntry }) {
  const schema = entry.editor_schema;
  const desktopDimensions = schemaString(schema, "desktop_dimensions", entry.element_type === "image" ? "1920 × 640 px" : "Não se aplica");
  const mobileDimensions = schemaString(schema, "mobile_dimensions", entry.element_type === "image" ? "800 × 600 px" : "Não se aplica");
  const maxSizeMb = schemaNumber(schema, "max_size_mb", 4);

  return (
    <details className="rounded-xl border border-border bg-surface-muted" open>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Especificações e alcance</summary>
      <dl className="grid gap-3 border-t border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Área</dt><dd className="mt-1 font-semibold text-secondary">{areaLabels[entry.area]}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Rota</dt><dd className="mt-1 break-all font-semibold text-secondary">{entry.route_pattern ?? "Compartilhado"}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Posição</dt><dd className="mt-1 font-semibold text-secondary">{placementLabels[entry.placement] ?? entry.placement}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Tipo</dt><dd className="mt-1 font-semibold text-secondary">{typeLabels[entry.element_type] ?? entry.element_type}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Grupo</dt><dd className="mt-1 font-semibold text-secondary">{entry.group_name ?? "Sem grupo"}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Chave técnica</dt><dd className="mt-1 break-all font-mono text-xs text-secondary">{entry.content_key}</dd></div>
        {entry.element_type === "image" ? <>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Desktop recomendado</dt><dd className="mt-1 font-semibold text-secondary">{desktopDimensions}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Mobile recomendado</dt><dd className="mt-1 font-semibold text-secondary">{mobileDimensions}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Tamanho máximo</dt><dd className="mt-1 font-semibold text-secondary">{maxSizeMb} MB por arquivo</dd></div>
        </> : null}
      </dl>
    </details>
  );
}

function ElementFields({ entry }: { entry: AdminInterfaceContentEntry }) {
  const value = resolvedInterfaceValue(entry);
  const textType = ["text", "textarea", "navigation", "button", "link"].includes(entry.element_type);
  const blockType = ["notice", "section", "element"].includes(entry.element_type);
  const imageType = entry.element_type === "image";
  const desktopId = valueString(value, "image_file_object_id");
  const mobileId = valueString(value, "mobile_image_file_object_id");
  const desktopPreview = desktopId
    ? `/api/interface-content/image?key=${encodeURIComponent(entry.content_key)}&variant=desktop&draft=1`
    : valueString(value, "image_url") || null;
  const mobilePreview = mobileId
    ? `/api/interface-content/image?key=${encodeURIComponent(entry.content_key)}&variant=mobile&draft=1`
    : valueString(value, "mobile_image_url") || desktopPreview;
  const schema = entry.editor_schema;

  return (
    <>
      <ElementSpecifications entry={entry} />

      {textType ? (
        <Label>
          {entry.element_type === "textarea" ? "Texto" : "Rótulo"}
          {entry.element_type === "textarea"
            ? <Textarea name="text" rows={5} defaultValue={valueString(value, "text")} />
            : <Input name="text" defaultValue={valueString(value, "text")} />}
          <span className="text-[11px] font-normal text-muted">É o conteúdo visível para a pessoa.</span>
        </Label>
      ) : <input type="hidden" name="text" value={valueString(value, "text")} />}

      {blockType ? (
        <div className="grid gap-4">
          <Label>Título<Input name="title" defaultValue={valueString(value, "title")} /></Label>
          <Label>Mensagem<Textarea name="body" rows={5} defaultValue={valueString(value, "body")} /></Label>
        </div>
      ) : <>
        <input type="hidden" name="title" value={valueString(value, "title")} />
        <input type="hidden" name="body" value={valueString(value, "body")} />
      </>}

      {imageType ? (
        <section className="grid gap-4 rounded-2xl border border-border bg-surface-muted p-4">
          <input type="hidden" name="current_image_file_object_id" value={desktopId} />
          <input type="hidden" name="current_mobile_image_file_object_id" value={mobileId} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FileUploadPreview
              name="desktop_image_file"
              accept="image/png,image/jpeg,image/webp"
              label="Imagem desktop"
              maxSizeBytes={schemaNumber(schema, "max_size_mb", 4) * 1024 * 1024}
              recommendedDimensions={schemaString(schema, "desktop_dimensions", "1920 × 640 px")}
              recommendedAspectRatio={schemaString(schema, "desktop_aspect_ratio", "3:1")}
              minWidth={schemaNumber(schema, "desktop_min_width", 1200)}
              existingPreviewUrl={desktopPreview}
            />
            <FileUploadPreview
              name="mobile_image_file"
              accept="image/png,image/jpeg,image/webp"
              label="Imagem mobile"
              maxSizeBytes={schemaNumber(schema, "max_size_mb", 4) * 1024 * 1024}
              recommendedDimensions={schemaString(schema, "mobile_dimensions", "800 × 600 px")}
              recommendedAspectRatio={schemaString(schema, "mobile_aspect_ratio", "4:3")}
              minWidth={schemaNumber(schema, "mobile_min_width", 640)}
              existingPreviewUrl={mobilePreview}
              help="Se não houver imagem mobile, a versão desktop será utilizada."
            />
          </div>
          <details className="rounded-xl border border-border bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">URLs alternativas</summary>
            <div className="grid gap-4 border-t border-border p-4">
              <Label>URL desktop<Input name="image_url" type="url" defaultValue={valueString(value, "image_url")} placeholder="https://..." /></Label>
              <Label>URL mobile<Input name="mobile_image_url" type="url" defaultValue={valueString(value, "mobile_image_url")} placeholder="https://..." /></Label>
            </div>
          </details>
          <Label>Descrição da imagem<Input name="alt" defaultValue={valueString(value, "alt")} /><span className="text-[11px] font-normal text-muted">Ajuda pessoas que usam leitores de tela.</span></Label>
        </section>
      ) : <>
        <input type="hidden" name="image_url" value={valueString(value, "image_url")} />
        <input type="hidden" name="mobile_image_url" value={valueString(value, "mobile_image_url")} />
        <input type="hidden" name="current_image_file_object_id" value={desktopId} />
        <input type="hidden" name="current_mobile_image_file_object_id" value={mobileId} />
        <input type="hidden" name="alt" value={valueString(value, "alt")} />
      </>}

      {entry.element_type === "navigation" || entry.element_type === "button" || entry.element_type === "link" || blockType || imageType ? (
        <details className="rounded-xl border border-border" open={entry.placement === "header"}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Ação, layout e aparência</summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
            <Label>Destino<Input name="href" defaultValue={valueString(value, "href")} placeholder="/pagina ou https://..." /><span className="text-[11px] font-normal text-muted">Página aberta ao clicar. Deixe vazio quando não houver ação.</span></Label>
            {blockType ? <Label>Texto do botão<Input name="button_text" defaultValue={valueString(value, "button_text")} placeholder="Saiba mais" /></Label> : <input type="hidden" name="button_text" value={valueString(value, "button_text")} />}
            <Label>Tom<Select name="tone" defaultValue={valueString(value, "tone") || "neutral"}><option value="neutral">Neutro</option><option value="primary">Destaque</option><option value="info">Informação</option><option value="success">Sucesso</option><option value="warning">Atenção</option></Select></Label>
            <Label>Densidade ou layout<Select name="layout_variant" defaultValue={(valueString(value, "layout_variant") === "cover" ? "hero" : valueString(value, "layout_variant")) || (entry.placement === "header" ? "compact" : "default")}><option value="compact">Compacto</option><option value="default">Padrão</option><option value="wide">Amplo</option><option value="hero">Hero</option><option value="grid">Grade</option></Select><span className="text-[11px] font-normal text-muted">Nos cabeçalhos, “Compacto” remove o espaço vertical desnecessário.</span></Label>
            <Label>Posição da imagem<Select name="image_position" defaultValue={valueString(value, "image_position") || "center"}><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Base</option><option value="left">Esquerda</option><option value="right">Direita</option></Select></Label>
            <Label>Escurecimento da imagem<Input name="overlay_opacity" type="number" min="0" max="0.9" step="0.05" defaultValue={valueNumber(value, "overlay_opacity", 0.48)} /></Label>
            <Label>Limite de itens<Input name="max_items" type="number" min="1" max="100" defaultValue={valueNumber(value, "max_items", 6)} /><span className="text-[11px] font-normal text-muted">Usado por listas, grades e destaques que suportam limite.</span></Label>
            <Label>Ordem<Input name="order" type="number" defaultValue={valueNumber(value, "order", 9999)} /><span className="text-[11px] font-normal text-muted">Números menores aparecem primeiro.</span></Label>
          </div>
        </details>
      ) : <>
        <input type="hidden" name="href" value={valueString(value, "href")} />
        <input type="hidden" name="button_text" value={valueString(value, "button_text")} />
        <input type="hidden" name="tone" value={valueString(value, "tone") || "neutral"} />
        <input type="hidden" name="layout_variant" value={valueString(value, "layout_variant") || "default"} />
        <input type="hidden" name="image_position" value={valueString(value, "image_position") || "center"} />
        <input type="hidden" name="overlay_opacity" value={valueNumber(value, "overlay_opacity", 0.48)} />
        <input type="hidden" name="max_items" value={valueNumber(value, "max_items", 6)} />
        <input type="hidden" name="order" value={valueNumber(value, "order", 9999)} />
      </>}

      <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink">
        <input type="checkbox" name="visible" defaultChecked={value.visible !== false} className="mt-0.5 size-4 accent-primary" />
        <span><strong className="block">Exibir este elemento</strong><small className="text-muted">Desmarque para ocultar sem apagar o conteúdo.</small></span>
      </label>
    </>
  );
}

function safePreviewRoute(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/empreendedor";
  const definition = interfaceRouteDefinition(value);
  return definition?.previewable ? value : "/empreendedor";
}

export default async function AdminExperiencePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  const canEdit = organization.permissions.includes("interface.content.manage") || organization.permissions.includes("journey.definition.manage");

  let workspace: AdminInterfaceContentWorkspace;
  try {
    workspace = await getAdminInterfaceContent({ actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id });
  } catch {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Interface temporariamente indisponível" tone="warning">Não foi possível carregar as configurações da interface. Nenhuma alteração foi aplicada. Tente novamente mais tarde.</StatusPanel></AppShell>;
  }

  const selectedKey = single(query.edit);
  const selected = workspace.entries.find((entry) => entry.content_key === selectedKey) ?? null;
  const previewRoute = safePreviewRoute(single(query.preview_route) || "/empreendedor");
  const pending = workspace.entries.filter((entry) => entry.has_pending_changes).length;
  const success = single(query.sucesso);
  const error = single(query.erro);

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Experiência"
          title="Interface da plataforma"
          description="Configure seções administrativas, do participante e públicas; visualize a rota real e consulte as especificações antes de publicar."
          actions={pending && canEdit ? <form action={publishInterfaceContentAction}><Button type="submit" variant="secondary">Publicar {pending} alteração(ões)</Button></form> : null}
        />

        <Card className="grid gap-3 sm:grid-cols-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Preview completo</p><p className="mt-1 text-sm text-muted">Rotas administrativas, do participante e públicas em modo somente leitura.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Especificações</p><p className="mt-1 text-sm text-muted">Rota, posição, tipo, dimensões de imagem, estado e chave técnica por elemento.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Controle administrativo</p><p className="mt-1 text-sm text-muted">Visibilidade, ordem, destino, tom, densidade do cabeçalho, layout e mídia responsiva.</p></div>
        </Card>

        {!canEdit ? <StatusPanel title="Acesso somente para visualização" tone="info">Você pode navegar e consultar os elementos e suas especificações, mas não alterá-los.</StatusPanel> : null}
        {success ? <StatusPanel title="Alteração concluída" tone="success">{success === "rascunho_salvo" ? "O rascunho foi salvo. Publique quando estiver pronto." : success === "elemento_criado" ? "O novo elemento foi criado como rascunho." : success === "elemento_removido" ? "O elemento foi removido da experiência." : "A interface publicada já está disponível."}</StatusPanel> : null}
        {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos e tente novamente.</StatusPanel> : null}

        <VisualInterfaceSelector entries={workspace.entries} selectedKey={selected?.content_key ?? ""} initialRoute={previewRoute} />

        {selected ? (
          <Card id="editor-elemento" className="grid scroll-mt-24 gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-lg font-black text-secondary">Editar: {selected.element_name}</h2>{selected.has_pending_changes ? <StatusPill tone="warning">Rascunho</StatusPill> : selected.published_value ? <StatusPill tone="success">Publicado</StatusPill> : <StatusPill tone="neutral">Não publicado</StatusPill>}</div>
                <p className="mt-1 text-sm text-muted">{selected.description}</p>
                <p className="mt-1 text-xs text-muted">{areaLabels[selected.area]} · {selected.page} · {typeLabels[selected.element_type] ?? selected.element_type}</p>
              </div>
              {selected.can_delete && canEdit ? <form action={archiveInterfaceElementAction}><input type="hidden" name="content_key" value={selected.content_key} /><Button type="submit" variant="secondary" size="sm">Remover</Button></form> : null}
            </div>
            <fieldset disabled={!canEdit}>
              <form action={saveInterfaceContentAction} encType="multipart/form-data" className="grid gap-4">
                <input type="hidden" name="content_key" value={selected.content_key} />
                <input type="hidden" name="locale" value={workspace.locale} />
                <ElementFields entry={selected} />
                <div className="flex flex-wrap gap-3"><Button type="submit" name="publish_now" value="true">Salvar e publicar agora</Button><Button type="submit" variant="secondary">Salvar rascunho</Button></div>
                <p className="text-xs text-muted">“Salvar e publicar agora” atualiza a interface no próximo carregamento. O rascunho permite revisar na prévia antes.</p>
              </form>
            </fieldset>
          </Card>
        ) : <StatusPanel title="Selecione um elemento na interface" tone="info">Clique em um item contornado dentro da prévia ou escolha-o na lista lateral para abrir a edição e as especificações.</StatusPanel>}

        {canEdit ? (
          <details className="rounded-2xl border border-border bg-white">
            <summary className="cursor-pointer px-5 py-4 font-semibold text-secondary">Adicionar elemento a qualquer seção</summary>
            <form action={registerInterfaceElementAction} className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
              <Label>Nome do elemento<Input name="element_name" required placeholder="Ex.: Aviso da página inicial" /></Label>
              <Label>Tipo<Select name="element_type" defaultValue="notice"><option value="text">Texto curto</option><option value="textarea">Texto longo</option><option value="navigation">Item de navegação</option><option value="button">Botão</option><option value="link">Link</option><option value="image">Imagem responsiva</option><option value="notice">Aviso</option><option value="section">Bloco de conteúdo</option><option value="element">Elemento genérico</option></Select></Label>
              <Label>Área<Select name="area" defaultValue="participant"><option value="participant">Participante</option><option value="admin">Administrador</option><option value="public">Público</option><option value="shared">Compartilhado</option></Select></Label>
              <Label>Página ou grupo<Input name="page" required placeholder="inicio" /></Label>
              <Label>Endereço da página<Input name="route_pattern" required placeholder="/empreendedor ou /admin/*" /><span className="text-[11px] font-normal text-muted">Use /* para incluir subpáginas.</span></Label>
              <Label>Posição<Select name="placement" defaultValue="before_content"><option value="before_content">Antes do conteúdo</option><option value="after_content">Depois do conteúdo</option><option value="footer">Rodapé</option></Select><span className="text-[11px] font-normal text-muted">Cabeçalhos e navegação existentes são editados diretamente pela prévia; novos blocos entram apenas nos espaços seguros renderizados pela plataforma.</span></Label>
              <Label>Grupo opcional<Input name="group_name" placeholder="Ex.: Cabeçalho da página" /></Label>
              <Label>Ordem inicial<Input name="order" type="number" defaultValue={9999} /></Label>
              <Label className="sm:col-span-2">Conteúdo inicial<Textarea name="initial_text" rows={3} /></Label>
              <Label className="sm:col-span-2">Explicação para outros administradores<Input name="description" placeholder="Quando, onde e para quem este elemento aparece" /></Label>
              <Button type="submit" className="w-fit">Criar rascunho</Button>
            </form>
          </details>
        ) : null}
      </div>
    </AppShell>
  );
}
