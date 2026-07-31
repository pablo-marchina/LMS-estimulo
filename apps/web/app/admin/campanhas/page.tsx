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
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback, null, 2); }

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();

  return <div className="grid gap-6">
    <PageHeader eyebrow="Aquisição e atribuição" title="Campanhas e links rastreáveis" description="Crie links com UTM, parâmetros personalizados e destino pós-login para usuários novos ou existentes." />
    {query.sucesso ? <StatusPanel title="Campanha salva" tone="success">O link rastreável já pode ser utilizado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Código: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-5">
      <div className="flex items-start gap-3"><Link2 className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Novo link rastreável</h2><p className="text-sm text-muted">O endereço público será <code>/r/slug</code>. O login não ignora permissões de acesso ao destino.</p></div></div>
      <TrackingLinkForm />
    </Card>

    <section className="grid gap-4">
      <div><p className="brand-kicker">Links ativos</p><h2 className="display-font mt-1 text-2xl text-secondary">Visitas e atribuição</h2></div>
      {workspace.tracking_links.length === 0 ? <Card><p className="text-sm text-muted">Nenhum link configurado.</p></Card> : <div className="grid gap-4 lg:grid-cols-2">
        {workspace.tracking_links.map((link) => <Card key={value(link, "id")} className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-ink">{value(link, "name")}</h3><p className="text-sm text-primary">/r/{value(link, "slug")}</p></div><StatusPill tone={value(link, "status") === "active" ? "success" : "neutral"}>{value(link, "status")}</StatusPill></div>
          <div className="grid grid-cols-2 gap-3"><Metric icon={<MousePointerClick size={16} />} label="Visitas" value={count(link, "visit_count")} /><Metric icon={<Route size={16} />} label="Associadas" value={count(link, "associated_count")} /></div>
          <dl className="grid gap-2 text-sm"><div><dt className="font-semibold text-muted">Destino</dt><dd className="break-all text-ink">{value(link, "destination_path")}</dd></div><div><dt className="font-semibold text-muted">Campanha</dt><dd className="text-ink">{value(link, "utm_campaign") || "—"}</dd></div><div><dt className="font-semibold text-muted">Público</dt><dd className="text-ink">{value(link, "audience")}</dd></div></dl>
          <details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-semibold text-secondary">Editar configuração</summary><div className="border-t border-border p-4"><TrackingLinkForm link={link} /></div></details>
          <form action={saveExtensionAction}><input type="hidden" name="resource_type" value="tracking_link_archive" /><input type="hidden" name="return_to" value="/admin/campanhas" /><input type="hidden" name="id" value={value(link, "id")} /><Button variant="secondary" size="sm" type="submit">Arquivar link</Button></form>
        </Card>)}
      </div>}
    </section>

    <Card className="overflow-x-auto">
      <h2 className="font-black text-secondary">Acessos mais recentes</h2>
      <table className="mt-4 w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-muted"><th className="p-2">Data</th><th className="p-2">Link</th><th className="p-2">UTM</th><th className="p-2">Dispositivo</th><th className="p-2">Usuário associado</th></tr></thead><tbody>{workspace.tracking_recent_visits.map((visit) => <tr key={value(visit, "id")} className="border-b border-border/70"><td className="p-2">{value(visit, "occurred_at") ? new Date(value(visit, "occurred_at")).toLocaleString("pt-BR") : "—"}</td><td className="p-2">{value(visit, "tracking_link_name")}</td><td className="p-2"><code className="text-xs">{pretty(visit.parameters, {})}</code></td><td className="p-2">{[value(visit, "device_type"), value(visit, "browser"), value(visit, "operating_system")].filter(Boolean).join(" · ") || "—"}</td><td className="p-2">{value(visit, "user_account_id") || "Ainda anônimo"}</td></tr>)}</tbody></table>
      {workspace.tracking_recent_visits.length === 0 ? <p className="mt-3 text-sm text-muted">Nenhuma visita capturada ainda.</p> : null}
    </Card>
  </div>;
}

function TrackingLinkForm({ link = {} }: { link?: JsonRecord }) {
  const skip = link.skip_steps && typeof link.skip_steps === "object" ? link.skip_steps as JsonRecord : {};
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="tracking_link" /><input type="hidden" name="return_to" value="/admin/campanhas" /><input type="hidden" name="json_fields" value="custom_parameters,skip_steps" />
    <input type="hidden" name="id" value={value(link, "id")} /><input type="hidden" name="status" value={value(link, "status") || "active"} />
    <Label>Nome interno<Input name="name" defaultValue={value(link, "name")} required /></Label><Label>Slug público<Input name="slug" defaultValue={value(link, "slug")} pattern="[a-z0-9][a-z0-9_-]{2,79}" required /></Label>
    <Label className="sm:col-span-2">Destino após login<Input name="destination_path" defaultValue={value(link, "destination_path") || "/empreendedor"} pattern="/.*" required /><span className="text-[11px] font-normal text-muted">Ex.: /empreendedor/biblioteca ou uma página B2B autorizada.</span></Label>
    <Label>Público<Select name="audience" defaultValue={value(link, "audience") || "both"}><option value="both">Novos e existentes</option><option value="new">Somente novos</option><option value="existing">Somente existentes</option></Select></Label>
    <Label>Limite de usos<Input name="max_uses" type="number" min="1" defaultValue={value(link, "max_uses")} placeholder="Sem limite" /></Label>
    <Label>UTM source<Input name="utm_source" defaultValue={value(link, "utm_source")} /></Label><Label>UTM medium<Input name="utm_medium" defaultValue={value(link, "utm_medium")} /></Label><Label>UTM campaign<Input name="utm_campaign" defaultValue={value(link, "utm_campaign")} /></Label><Label>UTM content<Input name="utm_content" defaultValue={value(link, "utm_content")} /></Label><Label>UTM term<Input name="utm_term" defaultValue={value(link, "utm_term")} /></Label><Label>Parceiro<Input name="partner" defaultValue={value(link, "partner")} /></Label><Label>Canal<Input name="channel" defaultValue={value(link, "channel")} /></Label>
    <Label>Início<Input name="starts_at" type="datetime-local" defaultValue={value(link, "starts_at").slice(0, 16)} /></Label><Label>Encerramento<Input name="ends_at" type="datetime-local" defaultValue={value(link, "ends_at").slice(0, 16)} /></Label>
    <Label className="sm:col-span-2">Parâmetros personalizados em JSON<Textarea name="custom_parameters" rows={4} defaultValue={pretty(link.custom_parameters, {})} /></Label>
    <fieldset className="grid gap-2 rounded-xl border border-border p-4 sm:col-span-2"><legend className="px-2 text-sm font-bold text-secondary">Etapas que podem ser puladas</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[["profile","Complementação de perfil"],["onboarding","Onboarding"],["diagnostic","Diagnóstico principal"],["home","Página inicial"]].map(([key,label]) => <label key={key} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name={`skip_${key}`} defaultChecked={skip[key] === true} className="size-4 accent-primary" />{label}</label>)}</div><input type="hidden" name="skip_steps" value={JSON.stringify({ profile: skip.profile === true, onboarding: skip.onboarding === true, diagnostic: skip.diagnostic === true, home: skip.home === true })} /><p className="text-xs text-muted">O formulário web atualiza este objeto antes do envio; permissões de rota continuam obrigatórias.</p></fieldset>
    <Label className="sm:col-span-2">Observações internas<Textarea name="notes" rows={3} defaultValue={value(link, "notes")} /></Label>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar link</PendingSubmitButton>
  </form>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl bg-surface-muted p-3"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div><p className="mt-2 text-2xl font-black text-secondary">{value}</p></div>; }
