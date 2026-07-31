import { Building2, UsersRound } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { B2bPageEditor } from "@/app/admin/b2b/b2b-editor";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function arrayValue(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

export default async function AdminB2bPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  const groups = workspace.b2b.groups.map((group) => ({ id: stringValue(group.id), name: stringValue(group.name) }));

  return <div className="grid gap-5">
    <PageHeader eyebrow="Conteúdo exclusivo" title="Páginas B2B" description="Crie a página, escolha quem pode acessar e publique." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">A área B2B foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Building2 className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Criar uma página</h2><p className="text-sm text-muted">Monte o conteúdo e defina o acesso no mesmo formulário.</p></div></div>
      <B2bPageEditor participants={workspace.participants} groups={groups} />
    </Card>

    <section className="grid gap-3">
      <h2 className="text-lg font-black text-secondary">Páginas criadas</h2>
      {workspace.b2b.pages.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma página criada.</p></Card> : workspace.b2b.pages.map((page) => {
        const versions = arrayValue(page.versions);
        const published = versions.find((version) => version.status === "published");
        return <Card key={stringValue(page.id)} className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-ink">{stringValue(page.name)}</h3><p className="text-sm text-muted">{Array.isArray(page.user_ids) ? page.user_ids.length : 0} pessoa(s) · {Array.isArray(page.group_ids) ? page.group_ids.length : 0} grupo(s)</p></div><StatusPill tone={published ? "success" : "warning"}>{published ? "Publicada" : "Rascunho"}</StatusPill></div>
          <details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Editar página</summary><div className="border-t border-border p-4"><B2bPageEditor page={page} participants={workspace.participants} groups={groups} /></div></details>
          <form action={saveExtensionAction}><input type="hidden" name="resource_type" value="b2b_page_delete" /><input type="hidden" name="return_to" value="/admin/b2b" /><input type="hidden" name="id" value={stringValue(page.id)} /><Button type="submit" variant="ghost" size="sm">Excluir página</Button></form>
        </Card>;
      })}
    </section>

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><UsersRound className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Grupos de acesso</h2><p className="text-sm text-muted">Use grupos quando várias pessoas terão o mesmo acesso.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-4">
        <input type="hidden" name="resource_type" value="b2b_group" /><input type="hidden" name="return_to" value="/admin/b2b" /><input type="hidden" name="array_fields" value="user_ids" />
        <div className="grid gap-3 sm:grid-cols-2"><Label>Nome do grupo<Input name="name" placeholder="Parceiros 2026" required /></Label><Label>Descrição curta<Input name="description" placeholder="Opcional" /></Label></div>
        <details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Selecionar participantes</summary><div className="grid max-h-60 gap-2 overflow-y-auto border-t border-border p-3 sm:grid-cols-2">{workspace.participants.map((participant) => <label key={participant.user_account_id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-surface-muted"><input type="checkbox" name="user_ids" value={participant.user_account_id} className="mt-0.5 accent-primary" /><span><strong className="block text-ink">{participant.name}</strong><small className="text-muted">{participant.email}</small></span></label>)}</div></details>
        <PendingSubmitButton pendingLabel="Criando…" className="w-fit">Criar grupo</PendingSubmitButton>
      </form>
      {workspace.b2b.groups.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{workspace.b2b.groups.map((group) => <article key={stringValue(group.id)} className="rounded-xl border border-border bg-white p-3"><h3 className="font-bold text-ink">{stringValue(group.name)}</h3><p className="text-xs text-muted">{Array.isArray(group.member_ids) ? group.member_ids.length : 0} pessoa(s)</p><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-primary">Editar grupo</summary><form action={saveExtensionAction} className="mt-2 grid gap-2 rounded-lg bg-surface-muted p-3"><input type="hidden" name="resource_type" value="b2b_group" /><input type="hidden" name="return_to" value="/admin/b2b" /><input type="hidden" name="array_fields" value="user_ids" /><input type="hidden" name="id" value={stringValue(group.id)} /><Label>Nome<Input name="name" defaultValue={stringValue(group.name)} required /></Label><Label>Descrição<Textarea name="description" rows={2} defaultValue={stringValue(group.description)} /></Label><div className="grid max-h-48 gap-1 overflow-y-auto">{workspace.participants.map((participant) => <label key={participant.user_account_id} className="flex items-center gap-2 text-xs"><input type="checkbox" name="user_ids" value={participant.user_account_id} defaultChecked={Array.isArray(group.member_ids) && group.member_ids.map(String).includes(participant.user_account_id)} className="accent-primary" />{participant.name}</label>)}</div><PendingSubmitButton pendingLabel="Salvando…" size="sm">Salvar</PendingSubmitButton></form></details></article>)}</div> : null}
    </Card>
  </div>;
}
