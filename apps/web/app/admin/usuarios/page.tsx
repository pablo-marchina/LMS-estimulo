import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { roleManagementRuntime } from "@/lib/admin/role-management";
import { grantOrganizationRoleAction, revokeOrganizationRoleAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function UserAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string; status?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return <main className="page-container"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com uma identidade confirmada.</p></StatusPanel></main>;
  }

  const organization = auth.identity.organizations.find(
    (candidate) => candidate.organization_id === query.organization,
  ) ?? auth.identity.organizations[0];
  if (!organization) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;
  }
  if (!organization.permissions.includes("iam.memberships.manage")) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Gestão de usuários restrita" tone="warning"><p>Este vínculo não possui permissão explícita para conceder ou revogar papéis.</p></StatusPanel></AppShell>;
  }

  const workspace = await roleManagementRuntime.list(
    auth.identity.user_account_id,
    organization.organization_id,
  );

  return <AppShell area="admin" email={auth.email}>
    <header className="page-heading">
      <p className="eyebrow">Administração</p>
      <h1>Usuários e papéis</h1>
      <p>Concessões e revogações são explícitas, auditadas e independentes do domínio do e-mail.</p>
    </header>

    {query.status === "concedido" ? <StatusPanel title="Papel concedido" tone="success"><p>A concessão foi registrada pelo backend transacional.</p></StatusPanel> : null}
    {query.status === "removido" ? <StatusPanel title="Papel removido" tone="success"><p>A revogação e sua justificativa foram registradas.</p></StatusPanel> : null}

    <form className="inline-form" method="get">
      <label>Organização<select name="organization" defaultValue={organization.organization_id}>{auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}</select></label>
      <button className="button button--secondary" type="submit">Selecionar</button>
    </form>

    <section className="stack stack--large" aria-labelledby="membros-titulo">
      <div>
        <h2 id="membros-titulo">Membros da organização</h2>
        <p className="support-note">O primeiro gestor é criado somente por bootstrap operacional auditado. Depois disso, gestores autorizados administram os papéis abaixo.</p>
      </div>

      {workspace.memberships.map((membership) => {
        const activeRoles = membership.roles.filter((role) => role.active);
        const availableRoles = workspace.roles.filter(
          (role) => role.status === "active" && !activeRoles.some((active) => active.role_id === role.role_id),
        );
        return <article className="card stack" key={membership.membership_id}>
          <div>
            <strong>{membership.email}</strong>
            <p className="metadata">Vínculo {membership.membership_status} · desde {dateFormatter.format(new Date(membership.valid_from))}</p>
          </div>

          <div className="stack">
            <h3>Papéis ativos</h3>
            {activeRoles.length === 0 ? <p>Nenhum papel administrativo ativo.</p> : activeRoles.map((role) => <div className="card-meta" key={`${membership.membership_id}:${role.role_id}:${role.valid_from}`}>
              <div><strong>{role.role_name}</strong><p className="metadata">{role.role_code}{role.valid_until ? ` · expira ${dateFormatter.format(new Date(role.valid_until))}` : " · sem expiração"}</p></div>
              <form action={revokeOrganizationRoleAction} className="stack moderation-form">
                <input type="hidden" name="organization_id" value={organization.organization_id} />
                <input type="hidden" name="membership_id" value={membership.membership_id} />
                <input type="hidden" name="role_id" value={role.role_id} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <label>Justificativa<textarea name="reason" minLength={3} maxLength={500} rows={2} required /></label>
                <label>Digite REMOVER<input name="confirmation" autoComplete="off" required /></label>
                <button className="button button--secondary" type="submit">Revogar papel</button>
              </form>
            </div>)}
          </div>

          {availableRoles.length > 0 ? <form action={grantOrganizationRoleAction} className="stack">
            <input type="hidden" name="organization_id" value={organization.organization_id} />
            <input type="hidden" name="membership_id" value={membership.membership_id} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <label>Papel<select name="role_id" required>{availableRoles.map((role) => <option value={role.role_id} key={role.role_id}>{role.name} · {role.permissions.join(", ") || "sem permissões adicionais"}</option>)}</select></label>
            <label>Expiração opcional · horário de Brasília (UTC−03:00)<span className="input-shell"><input type="datetime-local" name="valid_until" /></span></label>
            <label>Digite CONCEDER<input name="confirmation" autoComplete="off" required /></label>
            <button className="button button--primary" type="submit">Conceder papel</button>
          </form> : <p className="support-note">Todos os papéis ativos já estão atribuídos a este membro.</p>}
        </article>;
      })}
    </section>
  </AppShell>;
}
