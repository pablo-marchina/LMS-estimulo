import Link from "next/link";
import { randomUUID } from "node:crypto";
import { createEnrollmentAction, publishVerticalAction } from "@/app/actions/e14";
import { AppShell } from "@/components/app-shell";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { e14 } from "@/lib/e14/rpc";
import { statusLabel } from "@/lib/e14/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ organization?: string; instance?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return <main className="page-container"><StatusPanel title="Acesso administrativo indisponível" tone="warning"><p>É necessário autenticar e vincular uma identidade interna.</p></StatusPanel></main>;
  const organization = auth.identity.organizations.find((item) => item.organization_id === query.organization) ?? auth.identity.organizations[0];
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Sem permissão operacional" tone="warning"><p>Sua identidade não possui vínculo ativo com uma organização.</p></StatusPanel></AppShell>;

  const [listing, workspace] = await Promise.all([
    e14.listOperatorInstances(auth.identity.user_account_id, organization.organization_id),
    e14.getOperatorWorkspace(auth.identity.user_account_id, organization.organization_id)
  ]);
  const result = query.instance ? await e14.getOperatorResult(auth.identity.user_account_id, organization.organization_id, query.instance) : null;

  return (
    <AppShell area="admin" email={auth.email}>
      <header className="page-heading"><p className="eyebrow">Operação</p><h1>Jornadas e evidências</h1><p>Publicação, matrícula e acompanhamento usam dados versionados e eventos reais.</p></header>
      {query.sucesso ? <StatusPanel title="Operação concluída" tone="success"><p>A alteração foi confirmada pelo backend transacional.</p></StatusPanel> : null}
      <form className="inline-form" method="get"><label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}</select></label><button className="button button--secondary" type="submit">Selecionar</button></form>

      <div className="admin-columns">
        <section className="card"><h2>Publicar versão imutável</h2>{workspace.journey_versions.filter((item) => item.status === "draft").length === 0 ? <p>Nenhuma versão em rascunho está pronta para publicação.</p> : <form action={publishVerticalAction} className="stack"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label>Versão da jornada<select name="journey_selection" required>{workspace.journey_versions.filter((item) => item.status === "draft").map((item) => <option key={item.journey_version_id} value={`${item.journey_version_id}:${item.content_hash}`}>{item.title} · versão {item.version_number} · {item.content_hash.slice(0, 12)}…</option>)}</select></label><button className="button button--primary" type="submit">Publicar</button></form>}</section>
        <section className="card"><h2>Criar matrícula</h2>{workspace.participants.length === 0 || workspace.journey_versions.filter((item) => item.status === "published").length === 0 ? <p>É necessário ter participante técnico autorizado e uma versão publicada.</p> : <form action={createEnrollmentAction} className="stack"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label>Participante<select name="entrepreneur_id" required>{workspace.participants.map((item) => <option key={item.entrepreneur_id} value={item.entrepreneur_id}>{item.display_name} · {item.email}</option>)}</select></label><label>Jornada publicada<select name="journey_version_id" required>{workspace.journey_versions.filter((item) => item.status === "published").map((item) => <option key={item.journey_version_id} value={item.journey_version_id}>{item.title} · versão {item.version_number}</option>)}</select></label><button className="button button--primary" type="submit">Matricular</button></form>}</section>
      </div>

      <section className="stack"><h2>Instâncias recentes</h2>{listing.instances.length === 0 ? <StatusPanel title="Nenhuma instância" tone="info"><p>A organização ainda não possui jornadas executadas.</p></StatusPanel> : listing.instances.map((instance) => <article className="card" key={instance.journey_instance_id}><div className="card-meta"><span className="status-pill">{statusLabel(instance.journey_status)}</span><span>{instance.journey_code}</span></div><ProgressMeter value={instance.progress} label="Progresso" /><Link className="button button--secondary" href={`/admin?organization=${organization.organization_id}&instance=${instance.journey_instance_id}`}>Abrir evidências</Link></article>)}</section>
      {result ? <section className="card"><h2>Evidência da instância selecionada</h2><pre className="evidence-view">{JSON.stringify(result, null, 2)}</pre></section> : null}
    </AppShell>
  );
}
