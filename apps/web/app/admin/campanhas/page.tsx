import { Link2, MousePointerClick, Route } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
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

function value(item: JsonRecord, key: string) { const current = item[key]; return typeof current === "string" ? current : ""; }
function count(item: JsonRecord, key: string) { return Number(item[key] ?? 0) || 0; }
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback); }

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();

  return <div className="grid gap-5">
    <PageHeader eyebrow="Aquisição" title="Campanhas e UTM" description="Crie um link, escolha o destino e acompanhe os acessos." />
    {query.sucesso ? <StatusPanel title="Campanha salva" tone="success">O link já pode ser usado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Link2 className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Criar link rastreável</h2><p className="text-sm text-muted">O usuário fará login e seguirá para o destino escolhido.</p></div></div>
      <TrackingLinkForm />
    </Card>

    <section className="grid gap-3"><h2 className="text-lg font-black text-secondary">Links criados</h2>{workspace.tracking_links.length === 0 ? <Card><p className="text-sm text-muted">Nenhum link configurado.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.tracking_links.map((link) => <Card key={value(link, "id")} className="grid gap-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-ink">{value(link, "name")}</h3><p className="text-sm text-primary">/r/{value(link, "slug")}</p></div><StatusPill tone={value(link, "status") === "active" ? "success" : "neutral"}>{value(link, "status") === "active" ? "Ativo" : "Arquivado"}</StatusPill></div><div className="grid grid-cols-2 gap-2"><Metric icon={<MousePointerClick size={15} />} label="Visitas" value={count(link, "visit_count")} /><Metric icon={<Route size={15} />} label="Identificadas" value={count(link, "associated_count")} /></div><p className="text-sm text-muted"><strong className="text-ink">Destino:</strong> {value(link, "destination_path")}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Editar link</summary><div className="border-t border-border p-4"><TrackingLinkForm link={link} /></div></details><form action={saveExtensionAction}><input type="hidden" name="resource_type" value="tracking_link_archive" /><input type="hidden" name="return_to" value="/admin/campanhas" /><input type="hidden" name="id" value={value(link, "id")} /><Button variant="ghost" size="sm" type="submit">Arquivar</Button></form></Card>)}</div>}</section>

    <Card className="grid gap-3">
      <h2 className="font-black text-secondary">Acessos recentes</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{workspace.tracking_recent_visits.map((visit) => <article key={value(visit, "id")} className="rounded-xl border border-border bg-white p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm text-ink">{value(visit, "tracking_link_name")}</strong><StatusPill tone={value(visit, "user_account_id") ? "success" : "neutral"}>{value(visit, "user_account_id") ? "Identificado" : "Anônimo"}</StatusPill></div><p className="mt-2 text-xs text-muted">{value(visit, "occurred_at") ? new Date(value(visit, "occurred_at")).toLocaleString("pt-BR") : "—"}</p><p className="mt-1 text-xs text-muted">{[value(visit, "device_type"), value(visit, "browser"), value(visit, "operating_system")].filter(Boolean).join(" · ") || "Dispositivo não identificado"}</p></article>)}{workspace.tracking_recent_visits.length === 0 ? <p className="text-sm text-muted">Nenhuma visita capturada ainda.</p> : null}</div>
    </Card>
  </div>;
}

function TrackingLinkForm({ link = {} }: { link?: JsonRecord }) {
  const skip = link.skip_steps && typeof link.skip_steps === "object" ? link.skip_steps as JsonRecord : {};
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="tracking_link" /><input type="hidden" name="return_to" value="/admin/campanhas" /><input type="hidden" name="json_fields" value="custom_parameters" /><input type="hidden" name="custom_parameters" value={pretty(link.custom_parameters, {})} /><input type="hidden" name="id" value={value(link, "id")} /><input type="hidden" name="status" value={value(link, "status") || "active"} />
    <Label>Nome da campanha<Input name="name" defaultValue={value(link, "name")} placeholder="Parceria Julho" required /></Label>
    <Label>Quem pode usar?<Select name="audience" defaultValue={value(link, "audience") || "both"}><option value="both">Usuários novos e existentes</option><option value="new">Somente novos</option><option value="existing">Somente existentes</option></Select></Label>
    <Label className="sm:col-span-2">Destino após o login<Input name="destination_path" defaultValue={value(link, "destination_path") || "/empreendedor"} pattern="/.*" placeholder="/empreendedor/biblioteca" required /></Label>
    <Label>Origem (UTM source)<Input name="utm_source" defaultValue={value(link, "utm_source")} placeholder="instagram" /></Label><Label>Meio (UTM medium)<Input name="utm_medium" defaultValue={value(link, "utm_medium")} placeholder="social" /></Label><Label className="sm:col-span-2">Nome da campanha (UTM campaign)<Input name="utm_campaign" defaultValue={value(link, "utm_campaign")} placeholder="lancamento_julho" /></Label>
    <details className="sm:col-span-2 rounded-xl border border-border bg-surface-muted/40"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Opções avançadas</summary><div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2"><Label>Endereço curto personalizado<Input name="slug" defaultValue={value(link, "slug")} pattern="[a-z0-9][a-z0-9_-]{2,79}" placeholder="Gerado automaticamente" /></Label><Label>Limite de usos<Input name="max_uses" type="number" min="1" defaultValue={value(link, "max_uses")} placeholder="Sem limite" /></Label><Label>UTM content<Input name="utm_content" defaultValue={value(link, "utm_content")} /></Label><Label>UTM term<Input name="utm_term" defaultValue={value(link, "utm_term")} /></Label><Label>Parceiro<Input name="partner" defaultValue={value(link, "partner")} /></Label><Label>Canal<Input name="channel" defaultValue={value(link, "channel")} /></Label><Label>Início<Input name="starts_at" type="datetime-local" defaultValue={value(link, "starts_at").slice(0, 16)} /></Label><Label>Encerramento<Input name="ends_at" type="datetime-local" defaultValue={value(link, "ends_at").slice(0, 16)} /></Label><fieldset className="sm:col-span-2 grid gap-2"><legend className="text-sm font-bold text-secondary">Pular etapas</legend><div className="grid gap-2 sm:grid-cols-2">{[["profile","Complementação de perfil"],["onboarding","Onboarding"],["diagnostic","Diagnóstico principal"],["home","Página inicial"]].map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm"><input type="checkbox" name={`skip_${key}`} defaultChecked={skip[key] === true} className="accent-primary" />{label}</label>)}</div></fieldset><Label className="sm:col-span-2">Observações internas<Textarea name="notes" rows={2} defaultValue={value(link, "notes")} /></Label></div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar link</PendingSubmitButton>
  </form>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl bg-surface-muted p-3"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-[11px] font-bold uppercase tracking-wide">{label}</span></div><p className="mt-1 text-xl font-black text-secondary">{value}</p></div>; }
