import { Gift, PackageCheck, WalletCards } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { AppShell } from "@/components/app-shell";
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
  const { auth, workspace } = await requireAdminExtensionsWorkspace();
  const settings = workspace.reward_settings ?? {};

  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Engajamento" title="Recompensas" description="Crie recompensas e acompanhe os pedidos em um único lugar." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">O sistema de recompensas foi atualizado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <details className="rounded-2xl border border-border bg-white shadow-sm"><summary className="cursor-pointer p-4 font-bold text-secondary"><span className="inline-flex items-center gap-2"><WalletCards size={18} className="text-primary" />Taxa de conversão</span></summary><form action={saveExtensionAction} className="grid gap-3 border-t border-border p-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end"><input type="hidden" name="resource_type" value="reward_settings" /><input type="hidden" name="return_to" value="/admin/recompensas" /><Label>Pontos de engajamento<Input name="source_points_per_unit" type="number" min="1" defaultValue={String(numberValue(settings.source_points_per_unit, 1))} required /></Label><span className="pb-2 text-sm font-bold text-muted">equivalem a</span><Label>Pontos de recompensa<Input name="reward_points_per_unit" type="number" min="1" defaultValue={String(numberValue(settings.reward_points_per_unit, 1))} required /></Label><PendingSubmitButton pendingLabel="Salvando…">Salvar</PendingSubmitButton></form></details>

    <Card className="grid gap-4"><div className="flex items-start gap-3"><Gift className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Criar recompensa</h2><p className="text-sm text-muted">Preencha os campos principais. Datas e detalhes de entrega são opcionais.</p></div></div><RewardForm /></Card>

    <section className="grid gap-3"><div><p className="brand-kicker">Catálogo</p><h2 className="display-font mt-1 text-2xl text-secondary">Recompensas criadas</h2></div>{workspace.rewards.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma recompensa criada.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.rewards.map((reward) => <Card key={stringValue(reward.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{stringValue(reward.name)}</h3><p className="text-sm text-muted">{numberValue(reward.cost_points)} ponto(s) · {stringValue(reward.reward_type)}</p></div><StatusPill tone={stringValue(reward.status) === "published" ? "success" : "neutral"}>{stringValue(reward.status) === "published" ? "Publicada" : stringValue(reward.status)}</StatusPill></div><p className="line-clamp-3 text-sm text-muted">{stringValue(reward.description)}</p><p className="text-xs text-muted">Estoque: {reward.stock_quantity === null ? "ilimitado" : numberValue(reward.stock_quantity)} · {numberValue(reward.redemption_count)} resgate(s)</p><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar</summary><div className="border-t border-border p-4"><RewardForm reward={reward} /></div></details></Card>)}</div>}</section>

    <Card className="grid gap-4"><div className="flex items-start gap-3"><PackageCheck className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Pedidos de resgate</h2><p className="text-sm text-muted">Abra um pedido para atualizar o andamento. Cancelamentos devolvem pontos e estoque.</p></div></div>{workspace.redemptions.map((redemption) => <details key={stringValue(redemption.id)} className="rounded-xl border border-border"><summary className="cursor-pointer p-3"><span className="flex flex-wrap items-center justify-between gap-3"><span><strong className="block text-ink">{stringValue(redemption.preferred_name) || stringValue(redemption.legal_name)}</strong><small className="text-muted">{stringValue(redemption.reward_name)} · {numberValue(redemption.points_spent)} ponto(s)</small></span><StatusPill tone={stringValue(redemption.status) === "cancelled" ? "warning" : stringValue(redemption.status) === "delivered" ? "success" : "info"}>{statusLabels[stringValue(redemption.status)] ?? stringValue(redemption.status)}</StatusPill></span></summary><form action={saveExtensionAction} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2"><input type="hidden" name="resource_type" value="redemption_status" /><input type="hidden" name="return_to" value="/admin/recompensas" /><input type="hidden" name="json_fields" value="fulfillment_details" /><input type="hidden" name="id" value={stringValue(redemption.id)} /><Label>Novo status<Select name="status" defaultValue={stringValue(redemption.status)}>{Object.entries(statusLabels).map(([status,label]) => <option key={status} value={status}>{label}</option>)}</Select></Label><Label>Motivo do cancelamento<Input name="cancellation_reason" placeholder="Obrigatório somente ao cancelar" /></Label><Label className="sm:col-span-2">Informações de entrega<Textarea name="fulfillment_details" rows={3} defaultValue={pretty(redemption.fulfillment_details, {})} placeholder="Código, link, endereço, rastreamento ou instruções" /></Label><PendingSubmitButton pendingLabel="Atualizando…" size="sm">Atualizar pedido</PendingSubmitButton></form></details>)}{workspace.redemptions.length === 0 ? <p className="text-sm text-muted">Nenhum resgate solicitado.</p> : null}</Card>
  </div></AppShell>;
}

function RewardForm({ reward = {} }: { reward?: JsonRecord }) {
  return <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="reward" /><input type="hidden" name="return_to" value="/admin/recompensas" /><input type="hidden" name="json_fields" value="fulfillment_configuration" /><input type="hidden" name="id" value={stringValue(reward.id)} />
    <Label>Nome<Input name="name" defaultValue={stringValue(reward.name)} placeholder="Ex.: Mentoria individual" required /></Label>
    <Label>Tipo<Select name="reward_type" defaultValue={stringValue(reward.reward_type) || "digital"}><option value="digital">Digital</option><option value="physical">Física</option><option value="experience">Experiência</option><option value="service">Serviço</option></Select></Label>
    <Label>Custo em pontos<Input name="cost_points" type="number" min="1" defaultValue={String(numberValue(reward.cost_points, 1))} required /></Label>
    <Label>Estoque<Input name="stock_quantity" type="number" min="0" defaultValue={reward.stock_quantity === null ? "" : String(numberValue(reward.stock_quantity))} placeholder="Vazio = ilimitado" /></Label>
    <Label className="sm:col-span-2">Descrição<Textarea name="description" rows={3} defaultValue={stringValue(reward.description)} required /></Label>
    <Label className="sm:col-span-2">Regulamento<Textarea name="regulation" rows={5} defaultValue={stringValue(reward.regulation)} required /></Label>
    <Label>Estado<Select name="status" defaultValue={stringValue(reward.status) || "draft"}><option value="draft">Salvar como rascunho</option><option value="published">Publicar</option><option value="inactive">Desativar</option></Select></Label>
    <input type="hidden" name="code" value={stringValue(reward.code) || `recompensa_${Date.now()}`} />
    <details className="rounded-xl border border-border sm:col-span-2"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Disponibilidade e entrega</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2"><Label>Limite por usuário<Input name="max_per_user" type="number" min="1" defaultValue={reward.max_per_user === null ? "" : String(numberValue(reward.max_per_user))} /></Label><Label>Imagem (ID opcional)<Input name="image_file_object_id" defaultValue={stringValue(reward.image_file_object_id)} /></Label><Label>Início<Input name="starts_at" type="datetime-local" defaultValue={stringValue(reward.starts_at).slice(0,16)} /></Label><Label>Fim<Input name="ends_at" type="datetime-local" defaultValue={stringValue(reward.ends_at).slice(0,16)} /></Label><Label className="sm:col-span-2">Configuração de entrega em JSON<Textarea name="fulfillment_configuration" rows={5} defaultValue={pretty(reward.fulfillment_configuration, { fields: [], instructions: "" })} /></Label></div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar recompensa</PendingSubmitButton>
  </form>;
}
