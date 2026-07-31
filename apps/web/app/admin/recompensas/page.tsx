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
function objectValue(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
const statusLabels: Record<string, string> = { pending: "Pendente", approved: "Aprovada", preparing: "Em preparação", sent: "Enviada", available: "Disponibilizada", delivered: "Entregue", cancelled: "Cancelada" };

export default async function AdminRewardsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  const settings = workspace.reward_settings ?? {};

  return <div className="grid gap-5">
    <PageHeader eyebrow="Engajamento" title="Recompensas" description="Crie recompensas e acompanhe as solicitações dos participantes." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">As recompensas foram atualizadas.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Gift className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Criar recompensa</h2><p className="text-sm text-muted">Informe o que a pessoa recebe, quantos pontos custa e como será entregue.</p></div></div>
      <RewardForm />
    </Card>

    <section className="grid gap-3"><h2 className="text-lg font-black text-secondary">Catálogo</h2>{workspace.rewards.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma recompensa criada.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.rewards.map((reward) => <Card key={stringValue(reward.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{stringValue(reward.name)}</h3><p className="text-sm text-muted">{numberValue(reward.cost_points)} ponto(s) · {reward.stock_quantity === null ? "sem limite de estoque" : `${numberValue(reward.stock_quantity)} disponível(is)`}</p></div><StatusPill tone={stringValue(reward.status) === "published" ? "success" : "neutral"}>{stringValue(reward.status) === "published" ? "Publicada" : stringValue(reward.status) === "inactive" ? "Inativa" : "Rascunho"}</StatusPill></div><p className="text-sm text-muted">{stringValue(reward.description)}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Editar recompensa</summary><div className="border-t border-border p-4"><RewardForm reward={reward} /></div></details></Card>)}</div>}</section>

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><PackageCheck className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Solicitações de resgate</h2><p className="text-sm text-muted">Atualize o andamento e informe ao participante como receber.</p></div></div>
      <div className="grid gap-3">{workspace.redemptions.map((redemption) => {
        const details = objectValue(redemption.fulfillment_details);
        return <article key={stringValue(redemption.id)} className="grid gap-3 rounded-2xl border border-border bg-white p-4 lg:grid-cols-[1fr_1.5fr]">
          <div><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-ink">{stringValue(redemption.reward_name)}</h3><p className="text-sm text-muted">{stringValue(redemption.preferred_name) || stringValue(redemption.legal_name)}</p></div><StatusPill tone={stringValue(redemption.status) === "cancelled" ? "warning" : stringValue(redemption.status) === "delivered" ? "success" : "info"}>{statusLabels[stringValue(redemption.status)] ?? stringValue(redemption.status)}</StatusPill></div><p className="mt-2 text-xs text-muted">{numberValue(redemption.points_spent)} ponto(s) usados · {stringValue(redemption.email_normalized)}</p></div>
          <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="resource_type" value="redemption_status" /><input type="hidden" name="return_to" value="/admin/recompensas" /><input type="hidden" name="id" value={stringValue(redemption.id)} /><Label>Andamento<Select name="status" defaultValue={stringValue(redemption.status)}>{Object.entries(statusLabels).map(([status,label]) => <option key={status} value={status}>{label}</option>)}</Select></Label><Label>Código ou voucher<Input name="delivery_code" defaultValue={stringValue(details.code)} placeholder="Opcional" /></Label><Label>Rastreamento<Input name="delivery_tracking" defaultValue={stringValue(details.tracking)} placeholder="Opcional" /></Label><Label>Link de comprovante<Input name="delivery_proof_url" type="url" defaultValue={stringValue(details.proof_url)} placeholder="Opcional" /></Label><Label className="sm:col-span-2">Mensagem para o participante<Textarea name="delivery_note" rows={2} defaultValue={stringValue(details.note)} placeholder="Ex.: Enviado hoje; o prazo é de 5 dias úteis." /></Label><Label className="sm:col-span-2">Motivo do cancelamento<Input name="cancellation_reason" placeholder="Preencha somente ao cancelar" /></Label><PendingSubmitButton pendingLabel="Atualizando…" size="sm" className="w-fit sm:col-span-2">Salvar andamento</PendingSubmitButton></form>
        </article>;
      })}{workspace.redemptions.length === 0 ? <p className="text-sm text-muted">Nenhum resgate solicitado.</p> : null}</div>
    </Card>

    <details className="rounded-2xl border border-border bg-white">
      <summary className="cursor-pointer px-5 py-4 font-black text-secondary"><span className="inline-flex items-center gap-2"><WalletCards size={18} />Configurar conversão de pontos</span></summary>
      <form action={saveExtensionAction} className="grid gap-4 border-t border-border p-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end"><input type="hidden" name="resource_type" value="reward_settings" /><input type="hidden" name="return_to" value="/admin/recompensas" /><Label>Pontos de engajamento<Input name="source_points_per_unit" type="number" min="1" defaultValue={String(numberValue(settings.source_points_per_unit, 1))} required /></Label><span className="pb-2 text-sm font-bold text-muted">equivalem a</span><Label>Pontos para recompensas<Input name="reward_points_per_unit" type="number" min="1" defaultValue={String(numberValue(settings.reward_points_per_unit, 1))} required /></Label><PendingSubmitButton pendingLabel="Salvando…">Salvar</PendingSubmitButton></form>
    </details>
  </div>;
}

function RewardForm({ reward = {} }: { reward?: JsonRecord }) {
  const fulfillment = objectValue(reward.fulfillment_configuration);
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="reward" /><input type="hidden" name="return_to" value="/admin/recompensas" /><input type="hidden" name="boolean_fields" value="requires_address,requires_code,requires_scheduling,requires_tracking" /><input type="hidden" name="id" value={stringValue(reward.id)} /><input type="hidden" name="code" value={stringValue(reward.code)} />
    <Label>Nome<Input name="name" defaultValue={stringValue(reward.name)} required /></Label><Label>Custo em pontos<Input name="cost_points" type="number" min="1" defaultValue={String(numberValue(reward.cost_points, 1))} required /></Label>
    <Label>Tipo<Select name="reward_type" defaultValue={stringValue(reward.reward_type) || "digital"}><option value="digital">Digital</option><option value="physical">Física</option><option value="experience">Experiência</option><option value="service">Serviço</option></Select></Label><Label>Estado<Select name="status" defaultValue={stringValue(reward.status) || "draft"}><option value="draft">Salvar rascunho</option><option value="published">Publicar</option><option value="inactive">Ocultar</option></Select></Label>
    <Label className="sm:col-span-2">Descrição<Textarea name="description" rows={2} defaultValue={stringValue(reward.description)} required /></Label>
    <Label className="sm:col-span-2">Regulamento<Textarea name="regulation" rows={5} defaultValue={stringValue(reward.regulation)} required /></Label>
    <fieldset className="sm:col-span-2 grid gap-3 rounded-xl border border-border p-4"><legend className="px-2 text-sm font-bold text-secondary">Como será entregue?</legend><Label>Instruções<Textarea name="fulfillment_instructions" rows={2} defaultValue={stringValue(fulfillment.instructions)} placeholder="Explique como a equipe fará a entrega." /></Label><div className="grid gap-2 sm:grid-cols-2"><Check name="requires_address" label="Pedir endereço" checked={fulfillment.requires_address === true} /><Check name="requires_code" label="Usar código ou voucher" checked={fulfillment.requires_code === true} /><Check name="requires_scheduling" label="Exigir agendamento" checked={fulfillment.requires_scheduling === true} /><Check name="requires_tracking" label="Registrar rastreamento" checked={fulfillment.requires_tracking === true} /></div></fieldset>
    <details className="sm:col-span-2 rounded-xl border border-border bg-surface-muted/40"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Estoque e período</summary><div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2"><Label>Estoque<Input name="stock_quantity" type="number" min="0" defaultValue={reward.stock_quantity === null ? "" : String(numberValue(reward.stock_quantity))} placeholder="Sem limite" /></Label><Label>Limite por participante<Input name="max_per_user" type="number" min="1" defaultValue={reward.max_per_user === null ? "" : String(numberValue(reward.max_per_user))} placeholder="Sem limite" /></Label><Label>Início<Input name="starts_at" type="datetime-local" defaultValue={stringValue(reward.starts_at).slice(0,16)} /></Label><Label>Fim<Input name="ends_at" type="datetime-local" defaultValue={stringValue(reward.ends_at).slice(0,16)} /></Label><Label className="sm:col-span-2">ID de imagem opcional<Input name="image_file_object_id" defaultValue={stringValue(reward.image_file_object_id)} /></Label></div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar recompensa</PendingSubmitButton>
  </form>;
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center gap-2 rounded-lg bg-surface-muted p-2 text-sm"><input type="hidden" name={name} value="false" /><input type="checkbox" name={name} value="true" defaultChecked={checked} className="accent-primary" />{label}</label>; }
