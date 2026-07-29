import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { resolvedInterfaceValue, type AdminInterfaceContentEntry, type AdminInterfaceContentWorkspace } from "@/lib/interface-content/contracts";
import { getAdminInterfaceContent } from "@/lib/interface-content/runtime";
import { publishInterfaceContentAction, saveInterfaceContentAction } from "./actions";

export const dynamic = "force-dynamic";

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function groupLabel(area: string, page: string) {
  const areaLabels: Record<string, string> = {
    shared: "Elementos compartilhados",
    public: "Área pública",
    participant: "Experiência do participante",
    admin: "Administração",
  };
  const pageLabels: Record<string, string> = {
    shell: "Cabeçalho e ações gerais",
    navigation: "Navegação",
    journey: "Tela da jornada",
  };
  return `${areaLabels[area] ?? area} · ${pageLabels[page] ?? page}`;
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
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;
  }

  const canEdit = organization.permissions.includes("interface.content.manage");
  let workspace: AdminInterfaceContentWorkspace | null = null;
  let workspaceUnavailable = false;
  try {
    workspace = await getAdminInterfaceContent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
    });
  } catch (error) {
    workspaceUnavailable = true;
    console.error(JSON.stringify({
      level: "error",
      event: "admin_interface_content_unavailable",
      component: "admin_experience_page",
      organization_id: organization.organization_id,
      error_name: error instanceof Error ? error.name : "unknown",
    }));
  }

  const entries = workspace?.entries ?? [];
  const pendingCount = entries.filter((entry) => entry.has_pending_changes).length;
  const groups = new Map<string, AdminInterfaceContentEntry[]>();
  for (const entry of entries) {
    const key = `${entry.area}:${entry.page}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const success = single(query.sucesso);
  const error = single(query.erro);

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader eyebrow="Experiência" title="Textos e elementos da interface" description="Altere textos, visibilidade e ordem dos elementos cadastrados sem editar o código." />

        <Card className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><h2 className="font-black text-secondary">Como funciona</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Salvar cria um rascunho. Publicar aplica todas as alterações pendentes e invalida o cache da interface. Os valores padrão permanecem como fallback seguro.</p></div>
          <div className="rounded-xl bg-primary-soft px-4 py-3 text-center"><strong className="text-2xl text-primary">{pendingCount}</strong><p className="text-xs text-muted">alterações pendentes</p></div>
        </Card>

        {success ? <StatusPanel title={success === "interface_publicada" ? "Interface publicada" : "Rascunho salvo"} tone="success">{success === "interface_publicada" ? "As mudanças foram publicadas e o cache foi invalidado." : "Revise os campos e publique quando estiver pronto."}</StatusPanel> : null}
        {error ? <StatusPanel title="Não foi possível concluir" tone="warning">Nenhuma alteração incompleta foi publicada. Revise os dados e tente novamente.</StatusPanel> : null}
        {workspaceUnavailable ? <StatusPanel title="CMS temporariamente indisponível" tone="warning">O conteúdo não pôde ser carregado. A interface pública continua usando os valores publicados ou os fallbacks versionados.</StatusPanel> : null}
        {!canEdit ? <StatusPanel title="Somente visualização" tone="info">Sua função não possui a permissão específica para alterar a interface.</StatusPanel> : null}

        {!workspaceUnavailable && entries.length ? (
          <form action={saveInterfaceContentAction} className="grid gap-4">
            <input type="hidden" name="entry_count" value={String(entries.length)} />
            {Array.from(groups.entries()).map(([groupKey, groupEntries]) => (
              <details key={groupKey} className="rounded-2xl border border-border bg-white shadow-sm" open={groupEntries.some((entry) => entry.has_pending_changes)}>
                <summary className="cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-secondary">{groupLabel(groupEntries[0].area, groupEntries[0].page)}</h2><p className="text-sm text-muted">{groupEntries.length} elemento(s)</p></div>{groupEntries.some((entry) => entry.has_pending_changes) ? <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning">Rascunho pendente</span> : <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">Publicado</span>}</div></summary>
                <div className="grid gap-3 border-t border-border p-4">
                  {groupEntries.map((entry) => {
                    const index = entries.findIndex((item) => item.id === entry.id);
                    const value = resolvedInterfaceValue(entry);
                    return (
                      <section key={entry.id} className="grid gap-3 rounded-xl bg-surface-muted p-4 lg:grid-cols-[minmax(0,1fr)_9rem]">
                        <input type="hidden" name={`content_key_${index}`} value={entry.content_key} />
                        <input type="hidden" name={`locale_${index}`} value={workspace?.locale ?? "pt-BR"} />
                        <label className="grid gap-1 text-sm font-medium text-ink">{entry.element_name}<Input name={`text_${index}`} defaultValue={typeof value.text === "string" ? value.text : ""} disabled={!canEdit} maxLength={2000} /><span className="text-[11px] font-normal leading-5 text-muted">{entry.description}</span></label>
                        <div className="grid content-start gap-3"><label className="flex items-center gap-2 rounded-lg border border-border bg-white p-3 text-sm text-ink"><input type="checkbox" name={`visible_${index}`} defaultChecked={value.visible !== false} disabled={!canEdit} className="size-4 accent-primary" /> Mostrar</label>{entry.element_type === "navigation" ? <label className="grid gap-1 text-xs font-medium text-muted">Ordem<Input name={`order_${index}`} type="number" min="0" max="10000" defaultValue={String(typeof value.order === "number" ? value.order : index * 10 + 10)} disabled={!canEdit} /></label> : null}</div>
                      </section>
                    );
                  })}
                </div>
              </details>
            ))}
            {canEdit ? <Button type="submit" className="w-fit">Salvar rascunho</Button> : null}
          </form>
        ) : !workspaceUnavailable ? <StatusPanel title="Nenhum elemento cadastrado" tone="info">O registro de elementos da interface está vazio.</StatusPanel> : null}

        {canEdit && !workspaceUnavailable ? <Card className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-black text-secondary">Publicar alterações</h2><p className="mt-1 text-sm text-muted">Aplica de uma vez todos os rascunhos pendentes.</p></div><form action={publishInterfaceContentAction}><Button type="submit" disabled={pendingCount === 0}>Publicar interface</Button></form></Card> : null}
      </div>
    </AppShell>
  );
}
