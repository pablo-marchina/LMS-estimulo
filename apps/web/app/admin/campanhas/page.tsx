import { Link2, MousePointerClick, Route } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
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

function value(item: JsonRecord, key: string) { const current = item[key]; return typeof current === "string" ? current : ""; }
function count(item: JsonRecord, key: string) { return Number(item[key] ?? 0) || 0; }
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback, null, 2); }

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();

  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Divulgação" title="Campanhas e UTM" description="Crie um link, escolha o destino e acompanhe os acessos." />
    {query.sucesso ? <StatusPanel title="Campanha salva" tone="success">O link já pode ser compartilhado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Link2 className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Criar link de campanha</h2><p className="text-sm text-muted">Os campos principais estão visíveis. Abra “Opções avançadas” somente quando precisar.</p></div></div>
      <TrackingLinkForm />
    </Card>

    <section className="grid gap-3">
      <div><p className="brand-kicker">Links criados</p><h2 className="display-font mt-1 text-2xl text-secondary">Campanhas</h2></div>
      {workspace.tracking_links.length === 0 ? <Card><p className="text-sm text-muted">Nenhum link configurado.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.tracking_links.map((link) => <Card key={value(link, "id")} className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-ink">{value(link, "name")}</h3><p className="text-sm font-semibold text-primary">/r/{value(link, "slug")}</p><p className="mt-1 text-xs text-muted">Destino: {value(link, "destination_path")}</p></div><StatusPill tone={value(link, "status") === "active" ? "success" : "neutral"}>{value(link, "status") === "active" ? "Ativo" : "Arquivado"}</StatusPill></div>
        <div className="grid grid-cols-2 gap-2"><Metric icon={<MousePointerClick size={15} />} label="Visitas" value={count(link, "visit_count")} /><Metric icon={<Route size={15} />} label="Associadas" value={count(link, "associated_count")} /></div>
        <details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar link</summary><div className="border-t border-border p-4"><TrackingLinkForm link={link} /></div></details>
        <form action={saveExtensionAction}><input type="hidden" name="resource_type" value="tracking_link_archive" /><input type="hidden" name="return_to" value="/admin/campanhas" /><input type="hidden" name="id" value={value(link, "id")} /><Button variant="secondary" size="sm" type="submit">Arquivar</Button></form>
      </Card>)}</div>}
    </section>

    <details className="rounded-2xl border border-border bg-white shadow-sm"><summary className="cursor-pointer p-4 font-bold text-secondary">Ver acessos recentes</summary><div className="grid gap-2 border-t border-border p-4">{workspace.tracking_recent_visits.map((visit) => <article key={value(visit, "id")} className="rounded-xl bg-surface-muted p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-ink">{value(visit, "tracking_link_name") || "Link"}</strong><p className="text-xs text-muted">{value(visit, "occurred_at") ? new Date(value(visit, "occurred_at")).toLocaleString("pt-BR") : "—"}</p></div><StatusPill tone={value(visit, "user_account_id") ? "success" : "neutral"}>{value(visit, "user_account_id") ? "Usuário associado" : "Acesso anônimo"}</StatusPill></div><p className="mt-2 text-xs text-muted">{[value(visit, "device_type"), value(visit, "browser"), value(visit, "operating_system")].filter(Boolean).join(" · ") || "Dispositivo não identificado"}</p></article>)}{workspace.tracking_recent_visits.length === 0 ? <p className="text-sm text-muted">Nenhuma visita capturada ainda.</p> : null}</div></details>
  </div></AppShell>;
}

function TrackingLinkForm({ link = {} }: { link?: JsonRecord }) {
  const skip = link.skip_steps && typeof link.skip_steps === "object" ? link.skip_steps as JsonRecord : {};
  return <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="tracking_link" /><input type="hidden" name="return_to" value="/admin/campanhas" /><input type="hidden" name="json_fields" value="custom_parameters,skip_steps" /><input type="hidden" name="id" value={value(link, "id")} /><input type="hidden" name="status" value={value(link, "status") || "active"} />
    <Label>Nome da campanha<Input name="name" defaultValue={value(link, "name")} placeholder="Ex.: Parceria Faculdade" required /></Label>
    <Label>Endereço do link<Input name="slug" defaultValue={value(link, "slug")} placeholder="parceria-faculdade" pattern="[a-z0-9][a-z0-9_-]{2,79}" required /><span className="text-[11px] font-normal text-muted">O link será /r/endereço</span></Label>
    <Label className="sm:col-span-2">Tela de destino<Input name="destination_path" defaultValue={value(link, "destination_path") || "/empreendedor"} pattern="/.*" required /></Label>
    <Label>Público<Select name="audience" defaultValue={value(link, "audience") || "both"}><option value="both">Usuários novos e existentes</option><option value="new">Somente novos</option><option value="existing">Somente existentes</option></Select></Label>
    <Label>Campanha UTM<Input name="utm_campaign" defaultValue={value(link, "utm_campaign")} placeholder="nome_da_campanha" /></Label>

    <details className="sm:col-span-2 rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Identificação da origem</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2"><Label>Origem (utm_source)<Input name="utm_source" defaultValue={value(link, "utm_source")} placeholder="instagram" /></Label><Label>Meio (utm_medium)<Input name="utm_medium" defaultValue={value(link, "utm_medium")} placeholder="social" /></Label><Label>Conteúdo (utm_content)<Input name="utm_content" defaultValue={value(link, "utm_content")} /></Label><Label>Termo (utm_term)<Input name="utm_term" defaultValue={value(link, "utm_term")} /></Label><Label>Parceiro<Input name="partner" defaultValue={value(link, "partner")} /></Label><Label>Canal<Input name="channel" defaultValue={value(link, "channel")} /></Label></div></details>

    <details className="sm:col-span-2 rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Opções avançadas</summary><div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2"><Label>Limite de usos<Input name="max_uses" type="number" min="1" defaultValue={value(link, "max_uses")} placeholder="Sem limite" /></Label><Label>Início<Input name="starts_at" type="datetime-local" defaultValue={value(link, "starts_at").slice(0, 16)} /></Label><Label>Encerramento<Input name="ends_at" type="datetime-local" defaultValue={value(link, "ends_at").slice(0, 16)} /></Label><Label className="sm:col-span-2">Observações internas<Textarea name="notes" rows={2} defaultValue={value(link, "notes")} /></Label><fieldset className="grid gap-2 rounded-xl bg-surface-muted p-3 sm:col-span-2"><legend className="text-sm font-bold text-secondary">Etapas que podem ser puladas</legend><div className="grid gap-2 sm:grid-cols-2">{[["profile","Complementação de perfil"],["onboarding","Onboarding"],["diagnostic","Diagnóstico principal"],["home","Página inicial"]].map(([key,label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`skip_${key}`} defaultChecked={skip[key] === true} className="size-4 accent-primary" />{label}</label>)}</div></fieldset><Label className="sm:col-span-2">Parâmetros extras em JSON<Textarea name="custom_parameters" rows={3} defaultValue={pretty(link.custom_parameters, {})} /></Label></div></details>

    <input type="hidden" name="skip_steps" value={pretty(skip, {})} />
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar link</PendingSubmitButton>
  </form>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl bg-surface-muted p-3"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div><p className="mt-1 text-xl font-black text-secondary">{value}</p></div>; }
