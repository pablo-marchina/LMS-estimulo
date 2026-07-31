import { Building2, UsersRound } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { B2bPageEditor } from "@/app/admin/b2b/b2b-editor";
import { AppShell } from "@/components/app-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function arrayValue(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

export default async function AdminB2bPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();
  const groups = workspace.b2b.groups.map((group) => ({ id: stringValue(group.id), name: stringValue(group.name) }));

  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Conteúdo exclusivo" title="B2B" description="Crie uma página, escolha quem pode acessar e publique." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">A página ou o grupo foi atualizado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Building2 className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Criar página exclusiva</h2><p className="text-sm text-muted">Siga as três etapas abaixo. A página só aparecerá para quem você selecionar.</p></div></div>
      <B2bPageEditor participants={workspace.participants} groups={groups} />
    </Card>

    <details className="rounded-2xl border border-border bg-white shadow-sm">
      <summary className="cursor-pointer p-4 font-bold text-secondary"><span className="inline-flex items-center gap-2"><UsersRound size={18} className="text-primary" />Gerenciar grupos de acesso</span></summary>
      <div className="grid gap-4 border-t border-border p-4">
        <p className="text-sm text-muted">Grupos são opcionais. Use-os quando várias pessoas receberem o mesmo acesso.</p>
        <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_auto] lg:items-end">
          <input type="hidden" name="resource_type" value="b2b_group" /><input type="hidden" name="return_to" value="/admin/b2b" /><input type="hidden" name="array_fields" value="user_ids" />
          <Label>Nome do grupo<Input name="name" placeholder="Ex.: Parceiro A" required /></Label>
          <Label>Participantes<Select name="user_ids" multiple className="min-h-28">{workspace.participants.map((participant) => <option key={participant.user_account_id} value={participant.user_account_id}>{participant.name} · {participant.email}</option>)}</Select></Label>
          <PendingSubmitButton pendingLabel="Criando…">Criar grupo</PendingSubmitButton>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{workspace.b2b.groups.map((group) => <article key={stringValue(group.id)} className="rounded-xl border border-border p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-ink">{stringValue(group.name)}</h3><p className="text-xs text-muted">{Array.isArray(group.member_ids) ? group.member_ids.length : 0} usuário(s)</p></div></div><details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-primary">Editar</summary><form action={saveExtensionAction} className="mt-3 grid gap-3"><input type="hidden" name="resource_type" value="b2b_group" /><input type="hidden" name="return_to" value="/admin/b2b" /><input type="hidden" name="array_fields" value="user_ids" /><input type="hidden" name="id" value={stringValue(group.id)} /><Label>Nome<Input name="name" defaultValue={stringValue(group.name)} required /></Label><Label>Descrição<Textarea name="description" rows={2} defaultValue={stringValue(group.description)} /></Label><Label>Participantes<Select name="user_ids" multiple className="min-h-36" defaultValue={Array.isArray(group.member_ids) ? group.member_ids.map(String) : []}>{workspace.participants.map((participant) => <option key={participant.user_account_id} value={participant.user_account_id}>{participant.name} · {participant.email}</option>)}</Select></Label><PendingSubmitButton pendingLabel="Salvando…" size="sm">Salvar</PendingSubmitButton></form></details></article>)}</div>
      </div>
    </details>

    <section className="grid gap-3">
      <div><p className="brand-kicker">Páginas criadas</p><h2 className="display-font mt-1 text-2xl text-secondary">Conteúdo B2B</h2></div>
      {workspace.b2b.pages.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma página criada.</p></Card> : workspace.b2b.pages.map((page) => {
        const versions = arrayValue(page.versions);
        const published = versions.find((version) => version.status === "published");
        return <Card key={stringValue(page.id)} className="grid gap-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-ink">{stringValue(page.name)}</h3><p className="text-sm text-primary">/empreendedor/b2b/{stringValue(page.slug)}</p><p className="mt-1 text-xs text-muted">{Array.isArray(page.user_ids) ? page.user_ids.length : 0} usuário(s) · {Array.isArray(page.group_ids) ? page.group_ids.length : 0} grupo(s)</p></div><StatusPill tone={published ? "success" : "warning"}>{published ? "Publicada" : "Rascunho"}</StatusPill></div><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar página</summary><div className="border-t border-border p-4"><B2bPageEditor page={page} participants={workspace.participants} groups={groups} /></div></details><form action={saveExtensionAction}><input type="hidden" name="resource_type" value="b2b_page_delete" /><input type="hidden" name="return_to" value="/admin/b2b" /><input type="hidden" name="id" value={stringValue(page.id)} /><Button type="submit" variant="secondary" size="sm">Excluir página</Button></form></Card>;
      })}
    </section>
  </div></AppShell>;
}
