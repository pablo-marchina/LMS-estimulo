import { Gift, PackageCheck, WalletCards } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function numberValue(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback, null, 2); }
const statusLabels: Record<string, string> = { pending: "Pendente", approved: "Aprovada", preparing: "Em preparação", sent: "Enviada", available: "Disponibilizada", delivered: "Entregue", cancelled: "Cancelada" };

export default async function AdminRewardsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  const settings = workspace.reward_settings ?? {};

  return <div className="grid gap-6">
    <PageHeader eyebrow="Engajamento" title="Recompensas" description="Gerencie a conversão de pontos, catálogo, estoque, regulamentos e atendimento dos resgates." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">O sistema de recompensas foi atualizado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Código: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><WalletCards className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Taxa de conversão</h2><p className="text-sm text-muted">A taxa inicial está configurada como 1 ponto de engajamento para 1 ponto de recompensa. Alterações futuras não afetam o histórico.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <input type="hidden" name="resource_type" value="reward_settings" /><input type="hidden" name="return_to" value="/admin/recompensas" />
        <Label>Pontos de engajamento<Input name="source_points_per_unit" type="number" min="1" defaultValue={String(numberValue(settings.source_points_per_unit, 1))} required /></Label><span className="pb-2 text-sm font-bold text-muted">equivalem a</span><Label>Pontos de recompensa<Input name="reward_points_per_unit" type="number" min="1" defaultValue={String(numberValue(settings.reward_points_per_unit, 1))} required /></Label><PendingSubmitButton pendingLabel="Salvando…">Salvar taxa</PendingSubmitButton>
      </form>
    </Card>

    <Card className="grid gap-5">
      <div className="flex items-start gap-3"><Gift className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Nova recompensa</h2><p className="text-sm text-muted">Os campos de entrega são configuráveis por recompensa, permitindo fluxos físicos, digitais, experiências ou serviços.</p></div></div>
      <RewardForm />
    </Card>

    <section className="grid gap-4">
      <div><p className="brand-kicker">Catálogo</p><h2 className="display-font mt-1 text-2xl text-secondary">Recompensas configuradas</h2></div>
      {workspace.rewards.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma recompensa criada.</p></Card> : <div className="grid gap-4 lg:grid-cols-2">{workspace.rewards.map((reward) => <Card key={stringValue(reward.id)} className="grid gap-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{stringValue(reward.name)}</h3><p className="text-sm text-muted">{numberValue(reward.cost_points)} ponto(s) · {stringValue(reward.reward_type)}</p></div><StatusPill tone={stringValue(reward.status) === "published" ? "success" : "neutral"}>{stringValue(reward.status)}</StatusPill></div>
        <p className="text-sm text-muted">{stringValue(reward.description)}</p>
        <p className="text-xs text-muted">Estoque: {reward.stock_quantity === null ? "ilimitado" : numberValue(reward.stock_quantity)} · {numberValue(reward.redemption_count)} resgate(s)</p>
        <details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar recompensa</summary><div className="border-t border-border p-4"><RewardForm reward={reward} /></div></details>
      </Card>)}</div>}
    </section>

    <Card className="overflow-x-auto">
      <div className="flex items-start gap-3"><PackageCheck className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Solicitações de resgate</h2><p className="text-sm text-muted">Cancelar devolve pontos e estoque automaticamente.</p></div></div>
      <table className="mt-5 w-full min-w-[980px] text-sm"><thead><tr className="border-b border-border text-left text-muted"><th className="p-2">Solicitante</th><th className="p-2">Recompensa</th><th className="p-2">Pontos</th><th className="p-2">Status</th><th className="p-2">Detalhes e ação</th></tr></thead><tbody>{workspace.redemptions.map((redemption) => <tr key={stringValue(redemption.id)} className="border-b border-border/70 align-top"><td className="p-2"><strong className="block text-ink">{stringValue(redemption.preferred_name) || stringValue(redemption.legal_name)}</strong><span className="text-xs text-muted">{stringValue(redemption.email_normalized)}</span></td><td className="p-2">{stringValue(redemption.reward_name)}</td><td className="p-2">{numberValue(redemption.points_spent)}</td><td className="p-2"><StatusPill tone={stringValue(redemption.status) === "cancelled" ? "warning" : stringValue(redemption.status) === "delivered" ? "success" : "info"}>{statusLabels[stringValue(redemption.status)] ?? stringValue(redemption.status)}</StatusPill></td><td className="p-2"><form action={saveExtensionAction} className="grid gap-2"><input type="hidden" name="resource_type" value="redemption_status" /><input type="hidden" name="return_to" value="/admin/recompensas" /><input type="hidden" name="json_fields" value="fulfillment_details" /><input type="hidden" name="id" value={stringValue(redemption.id)} /><Select name="status" defaultValue={stringValue(redemption.status)}>{Object.entries(statusLabels).map(([status,label]) => <option key={status} value={status}>{label}</option>)}</Select><Textarea name="fulfillment_details" rows={3} defaultValue={pretty(redemption.fulfillment_details, {})} placeholder="Código, link, endereço, rastreamento, comprovante ou instruções em JSON" /><Input name="cancellation_reason" placeholder="Motivo obrigatório ao cancelar" /><PendingSubmitButton pendingLabel="Atualizando…" size="sm">Atualizar</PendingSubmitButton></form></td></tr>)}</tbody></table>
      {workspace.redemptions.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhum resgate solicitado.</p> : null}
    </Card>
  </div>;
}

function RewardForm({ reward = {} }: { reward?: JsonRecord }) {
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="reward" /><input type="hidden" name="return_to" value="/admin/recompensas" /><input type="hidden" name="json_fields" value="fulfillment_configuration" /><input type="hidden" name="id" value={stringValue(reward.id)} />
    <Label>Nome<Input name="name" defaultValue={stringValue(reward.name)} required /></Label><Label>Código<Input name="code" defaultValue={stringValue(reward.code)} pattern="[a-z][a-z0-9_-]{1,79}" required /></Label>
    <Label>Tipo<Select name="reward_type" defaultValue={stringValue(reward.reward_type) || "digital"}><option value="digital">Digital</option><option value="physical">Física</option><option value="experience">Experiência</option><option value="service">Serviço</option></Select></Label><Label>Custo em pontos<Input name="cost_points" type="number" min="1" defaultValue={String(numberValue(reward.cost_points, 1))} required /></Label>
    <Label>Estoque<Input name="stock_quantity" type="number" min="0" defaultValue={reward.stock_quantity === null ? "" : String(numberValue(reward.stock_quantity))} placeholder="Vazio = ilimitado" /></Label><Label>Limite por usuário<Input name="max_per_user" type="number" min="1" defaultValue={reward.max_per_user === null ? "" : String(numberValue(reward.max_per_user))} /></Label>
    <Label>Início<Input name="starts_at" type="datetime-local" defaultValue={stringValue(reward.starts_at).slice(0,16)} /></Label><Label>Fim<Input name="ends_at" type="datetime-local" defaultValue={stringValue(reward.ends_at).slice(0,16)} /></Label>
    <Label className="sm:col-span-2">Descrição<Textarea name="description" rows={3} defaultValue={stringValue(reward.description)} required /></Label>
    <Label className="sm:col-span-2">Regulamento<Textarea name="regulation" rows={7} defaultValue={stringValue(reward.regulation)} required /></Label>
    <Label className="sm:col-span-2">Configuração de entrega em JSON<Textarea name="fulfillment_configuration" rows={7} defaultValue={pretty(reward.fulfillment_configuration, { fields: [], instructions: "" })} /><span className="text-[11px] font-normal text-muted">Pode definir código, link, arquivo, endereço, rastreamento, comprovante, agendamento e outros campos necessários.</span></Label>
    <Label>Arquivo de imagem (ID opcional)<Input name="image_file_object_id" defaultValue={stringValue(reward.image_file_object_id)} placeholder="Use um arquivo enviado à biblioteca" /></Label>
    <Label>Estado<Select name="status" defaultValue={stringValue(reward.status) || "draft"}><option value="draft">Rascunho</option><option value="published">Publicada</option><option value="inactive">Inativa</option></Select></Label>
    <PendingSubmitButton pendingLabel="Salvando recompensa…" className="w-fit sm:col-span-2">Salvar recompensa</PendingSubmitButton>
  </form>;
}
