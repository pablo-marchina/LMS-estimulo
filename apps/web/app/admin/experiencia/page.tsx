import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { resolvedInterfaceValue, type AdminInterfaceContentEntry } from "@/lib/interface-content/contracts";
import { getAdminInterfaceContent } from "@/lib/interface-content/runtime";
import {
  archiveInterfaceElementAction,
  publishInterfaceContentAction,
  registerInterfaceElementAction,
  saveInterfaceContentAction,
} from "./actions";

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

function ElementFields({ entry }: { entry: AdminInterfaceContentEntry }) {
  const value = resolvedInterfaceValue(entry);
  const textType = ["text", "textarea", "navigation", "button", "link"].includes(entry.element_type);
  const blockType = ["notice", "section", "element"].includes(entry.element_type);

  return (
    <>
      {textType ? (
        <Label>
          {entry.element_type === "textarea" ? "Texto" : "Rótulo"}
          {entry.element_type === "textarea" ? (
            <Textarea name="text" rows={5} defaultValue={typeof value.text === "string" ? value.text : ""} />
          ) : (
            <Input name="text" defaultValue={typeof value.text === "string" ? value.text : ""} />
          )}
          <span className="text-[11px] font-normal text-muted">É o conteúdo visível para a pessoa.</span>
        </Label>
      ) : (
        <input type="hidden" name="text" value={typeof value.text === "string" ? value.text : ""} />
      )}

      {blockType ? (
        <div className="grid gap-4">
          <Label>
            Título
            <Input name="title" defaultValue={typeof value.title === "string" ? value.title : ""} />
          </Label>
          <Label>
            Mensagem
            <Textarea name="body" rows={5} defaultValue={typeof value.body === "string" ? value.body : ""} />
          </Label>
        </div>
      ) : (
        <>
          <input type="hidden" name="title" value={typeof value.title === "string" ? value.title : ""} />
          <input type="hidden" name="body" value={typeof value.body === "string" ? value.body : ""} />
        </>
      )}

      {entry.element_type === "image" ? (
        <div className="grid gap-4">
          <Label>
            Endereço da imagem
            <Input name="image_url" type="url" defaultValue={typeof value.image_url === "string" ? value.image_url : ""} placeholder="https://..." />
          </Label>
          <Label>
            Descrição da imagem
            <Input name="alt" defaultValue={typeof value.alt === "string" ? value.alt : ""} />
            <span className="text-[11px] font-normal text-muted">Ajuda pessoas que usam leitores de tela.</span>
          </Label>
        </div>
      ) : (
        <>
          <input type="hidden" name="image_url" value={typeof value.image_url === "string" ? value.image_url : ""} />
          <input type="hidden" name="alt" value={typeof value.alt === "string" ? value.alt : ""} />
        </>
      )}

      {entry.element_type === "navigation" || entry.element_type === "button" || entry.element_type === "link" || blockType || entry.element_type === "image" ? (
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">Ação e aparência</summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
            <Label>
              Destino
              <Input name="href" defaultValue={typeof value.href === "string" ? value.href : ""} placeholder="/pagina ou https://..." />
              <span className="text-[11px] font-normal text-muted">Página aberta ao clicar. Deixe vazio quando não houver ação.</span>
            </Label>
            {blockType ? (
              <Label>
                Texto do botão
                <Input name="button_text" defaultValue={typeof value.button_text === "string" ? value.button_text : ""} placeholder="Saiba mais" />
              </Label>
            ) : (
              <input type="hidden" name="button_text" value={typeof value.button_text === "string" ? value.button_text : ""} />
            )}
            <Label>
              Tom
              <Select name="tone" defaultValue={typeof value.tone === "string" ? value.tone : "neutral"}>
                <option value="neutral">Neutro</option>
                <option value="primary">Destaque</option>
                <option value="info">Informação</option>
                <option value="success">Sucesso</option>
                <option value="warning">Atenção</option>
              </Select>
            </Label>
            <Label>
              Ordem
              <Input name="order" type="number" defaultValue={typeof value.order === "number" ? value.order : 9999} />
              <span className="text-[11px] font-normal text-muted">Números menores aparecem primeiro.</span>
            </Label>
          </div>
        </details>
      ) : (
        <>
          <input type="hidden" name="href" value={typeof value.href === "string" ? value.href : ""} />
          <input type="hidden" name="button_text" value={typeof value.button_text === "string" ? value.button_text : ""} />
          <input type="hidden" name="tone" value={typeof value.tone === "string" ? value.tone : "neutral"} />
          <input type="hidden" name="order" value={typeof value.order === "number" ? value.order : 9999} />
        </>
      )}

      <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink">
        <input type="checkbox" name="visible" defaultChecked={value.visible !== false} className="mt-0.5 size-4 accent-primary" />
        <span>
          <strong className="block">Exibir este elemento</strong>
          <small className="text-muted">Desmarque para ocultar sem apagar o conteúdo.</small>
        </span>
      </label>
    </>
  );
}

export default async function AdminExperiencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const organization = administrativeOrganization(auth.identity);
  if (!organization) {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel>
      </AppShell>
    );
  }

  const canEdit = organization.permissions.includes("interface.content.manage");
  let workspace;
  try {
    workspace = await getAdminInterfaceContent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
    });
  } catch {
    return (
      <AppShell area="admin" email={auth.email}>
        <StatusPanel title="CMS temporariamente indisponível" tone="warning">
          Não foi possível carregar a configuração da interface. Nenhuma alteração foi aplicada. Tente novamente mais tarde.
        </StatusPanel>
      </AppShell>
    );
  }

  const area = single(query.area);
  const page = single(query.page);
  const search = single(query.q).toLocaleLowerCase("pt-BR");
  const pages = [...new Set(workspace.entries.map((entry) => entry.page))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtered = workspace.entries.filter((entry) =>
    (!area || entry.area === area)
    && (!page || entry.page === page)
    && (!search || `${entry.element_name} ${entry.description} ${entry.content_key}`.toLocaleLowerCase("pt-BR").includes(search))
  );
  const selectedKey = single(query.edit);
  const selected = workspace.entries.find((entry) => entry.content_key === selectedKey) ?? filtered[0] ?? null;
  const pending = workspace.entries.filter((entry) => entry.has_pending_changes).length;
  const success = single(query.sucesso);
  const error = single(query.erro);

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Experiência"
          title="Interface e textos"
          description="Edite menus, títulos, botões, imagens e blocos de conteúdo sem alterar o código."
          actions={pending && canEdit ? (
            <form action={publishInterfaceContentAction}>
              <Button type="submit" variant="secondary">Publicar {pending} alteração(ões)</Button>
            </form>
          ) : null}
        />
        {!canEdit ? (
          <StatusPanel title="Acesso somente para visualização" tone="info">
            Você pode consultar os elementos, mas não alterá-los.
          </StatusPanel>
        ) : null}
        {success ? (
          <StatusPanel title="Alteração concluída" tone="success">
            {success === "rascunho_salvo"
              ? "O rascunho foi salvo. Publique quando estiver pronto."
              : success === "elemento_criado"
                ? "O novo elemento foi criado como rascunho."
                : success === "elemento_removido"
                  ? "O elemento foi removido da experiência."
                  : "A interface publicada já está disponível."}
          </StatusPanel>
        ) : null}
        {error ? (
          <StatusPanel title="Não foi possível concluir" tone="warning">Revise os campos e tente novamente.</StatusPanel>
        ) : null}

        <Card className="grid gap-4">
          <div>
            <h2 className="font-semibold text-secondary">Encontre o que deseja alterar</h2>
            <p className="mt-1 text-sm text-muted">Filtre por área ou página. Somente o elemento selecionado será aberto para edição.</p>
          </div>
          <form method="get" className="grid gap-3 sm:grid-cols-4">
            <Label>
              Área
              <Select name="area" defaultValue={area}>
                <option value="">Todas</option>
                {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Label>
            <Label>
              Página
              <Select name="page" defaultValue={page}>
                <option value="">Todas</option>
                {pages.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Label>
            <Label className="sm:col-span-2">
              Buscar
              <Input name="q" defaultValue={single(query.q)} placeholder="Ex.: botão, jornadas, início" />
            </Label>
            <Button type="submit" variant="secondary" className="w-fit">Filtrar</Button>
          </form>
          <form method="get" className="grid gap-2">
            <input type="hidden" name="area" value={area} />
            <input type="hidden" name="page" value={page} />
            <input type="hidden" name="q" value={single(query.q)} />
            <Label>
              Elemento
              <Select name="edit" defaultValue={selected?.content_key ?? ""}>
                <option value="">Selecione</option>
                {filtered.map((entry) => (
                  <option key={entry.content_key} value={entry.content_key}>
                    {entry.element_name} · {typeLabels[entry.element_type] ?? entry.element_type}
                  </option>
                ))}
              </Select>
            </Label>
            <Button type="submit" className="w-fit">Abrir elemento</Button>
          </form>
        </Card>

        {selected ? (
          <Card className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-secondary">{selected.element_name}</h2>
                  {selected.has_pending_changes ? (
                    <StatusPill tone="warning">Rascunho</StatusPill>
                  ) : selected.published_value ? (
                    <StatusPill tone="success">Publicado</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Não publicado</StatusPill>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{selected.description}</p>
                <p className="mt-1 text-xs text-muted">
                  {areaLabels[selected.area]} · {selected.page} · {typeLabels[selected.element_type] ?? selected.element_type}
                </p>
              </div>
              {selected.can_delete && canEdit ? (
                <form action={archiveInterfaceElementAction}>
                  <input type="hidden" name="content_key" value={selected.content_key} />
                  <Button type="submit" variant="secondary" size="sm">Remover</Button>
                </form>
              ) : null}
            </div>
            <fieldset disabled={!canEdit}>
              <form action={saveInterfaceContentAction} className="grid gap-4">
                <input type="hidden" name="content_key" value={selected.content_key} />
                <input type="hidden" name="locale" value={workspace.locale} />
                <ElementFields entry={selected} />
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" name="publish_now" value="true">Salvar e publicar agora</Button>
                  <Button type="submit" variant="secondary">Salvar rascunho</Button>
                </div>
                <p className="text-xs text-muted">
                  “Salvar e publicar agora” atualiza a interface no próximo carregamento da página. O rascunho permite revisar antes.
                </p>
              </form>
            </fieldset>
          </Card>
        ) : (
          <StatusPanel title="Nenhum elemento encontrado" tone="info">Mude os filtros ou crie um novo elemento.</StatusPanel>
        )}

        {canEdit ? (
          <details className="rounded-2xl border border-border bg-white">
            <summary className="cursor-pointer px-5 py-4 font-semibold text-secondary">Adicionar texto, imagem ou bloco</summary>
            <form action={registerInterfaceElementAction} className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
              <Label>
                Nome do elemento
                <Input name="element_name" required placeholder="Ex.: Aviso da página inicial" />
              </Label>
              <Label>
                Tipo
                <Select name="element_type" defaultValue="notice">
                  <option value="text">Texto</option>
                  <option value="button">Botão</option>
                  <option value="link">Link</option>
                  <option value="image">Imagem</option>
                  <option value="notice">Aviso</option>
                  <option value="section">Bloco de conteúdo</option>
                </Select>
              </Label>
              <Label>
                Área
                <Select name="area" defaultValue="participant">
                  <option value="participant">Participante</option>
                  <option value="admin">Administrador</option>
                  <option value="public">Público</option>
                  <option value="shared">Compartilhado</option>
                </Select>
              </Label>
              <Label>
                Página ou grupo
                <Input name="page" required placeholder="inicio" />
              </Label>
              <Label>
                Endereço da página
                <Input name="route_pattern" required placeholder="/empreendedor ou /admin/*" />
                <span className="text-[11px] font-normal text-muted">Use /* para incluir subpáginas.</span>
              </Label>
              <Label>
                Posição
                <Select name="placement" defaultValue="before_content">
                  <option value="before_content">Antes do conteúdo</option>
                  <option value="after_content">Depois do conteúdo</option>
                  <option value="footer">Rodapé</option>
                </Select>
              </Label>
              <Label className="sm:col-span-2">
                Conteúdo inicial
                <Textarea name="initial_text" rows={3} />
              </Label>
              <Label className="sm:col-span-2">
                Explicação para outros administradores
                <Input name="description" placeholder="Quando e onde este elemento aparece" />
              </Label>
              <Button type="submit" className="w-fit">Criar rascunho</Button>
            </form>
          </details>
        ) : null}
      </div>
    </AppShell>
  );
}
