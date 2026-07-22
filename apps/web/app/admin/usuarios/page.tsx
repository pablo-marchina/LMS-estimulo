import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { TableScroll, Table, Th, Td } from "@/components/ui/table";
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
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-6 py-16">
        <StatusPanel title="Acesso indisponível" tone="warning"><p>Entre com uma identidade confirmada.</p></StatusPanel>
      </div>
    );
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

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Administração"
          title="Usuários e papéis"
          description="Concessões e revogações são explícitas, auditadas e independentes do domínio do e-mail."
        />

        {query.status === "concedido" ? <StatusPanel title="Papel concedido" tone="success"><p>A concessão foi registrada pelo backend transacional.</p></StatusPanel> : null}
        {query.status === "removido" ? <StatusPanel title="Papel removido" tone="success"><p>A revogação e sua justificativa foram registradas.</p></StatusPanel> : null}

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label className="min-w-56">
            Organização
            <Select name="organization" defaultValue={organization.organization_id}>
              {auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Button type="submit" variant="secondary">Selecionar</Button>
        </form>

        <section className="grid gap-4" aria-labelledby="membros-titulo">
          <div>
            <h2 id="membros-titulo" className="text-xl font-semibold text-ink">Membros da organização</h2>
            <p className="text-sm text-muted">O primeiro gestor é criado somente por bootstrap operacional auditado. Depois disso, gestores autorizados administram os papéis abaixo.</p>
          </div>

          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <Th>Membro</Th>
                  <Th>Papéis ativos</Th>
                  <Th>Conceder papel</Th>
                </tr>
              </thead>
              <tbody>
                {workspace.memberships.map((membership) => {
                  const activeRoles = membership.roles.filter((role) => role.active);
                  const availableRoles = workspace.roles.filter(
                    (role) => role.status === "active" && !activeRoles.some((active) => active.role_id === role.role_id),
                  );
                  return (
                    <tr key={membership.membership_id}>
                      <Td className="align-top">
                        <div className="flex items-start gap-3">
                          <Avatar name={membership.email} />
                          <div>
                            <p className="font-semibold text-ink">{membership.email}</p>
                            <p className="text-xs text-muted">Vínculo {membership.membership_status} · desde {dateFormatter.format(new Date(membership.valid_from))}</p>
                          </div>
                        </div>
                      </Td>

                      <Td className="align-top">
                        {activeRoles.length === 0 ? (
                          <p className="text-sm text-muted">Nenhum papel administrativo ativo.</p>
                        ) : (
                          <div className="grid gap-3">
                            {activeRoles.map((role) => (
                              <div key={`${membership.membership_id}:${role.role_id}:${role.valid_from}`} className="rounded-lg border border-border p-3">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <StatusPill tone="info">{role.role_name}</StatusPill>
                                  <span className="text-xs text-muted">
                                    {role.role_code}{role.valid_until ? ` · expira ${dateFormatter.format(new Date(role.valid_until))}` : " · sem expiração"}
                                  </span>
                                </div>
                                <form action={revokeOrganizationRoleAction} className="grid gap-2">
                                  <input type="hidden" name="organization_id" value={organization.organization_id} />
                                  <input type="hidden" name="membership_id" value={membership.membership_id} />
                                  <input type="hidden" name="role_id" value={role.role_id} />
                                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                                  <Label className="text-xs">Justificativa<Textarea name="reason" minLength={3} maxLength={500} rows={2} required /></Label>
                                  <Label className="text-xs">Digite REMOVER<Input name="confirmation" autoComplete="off" required /></Label>
                                  <Button variant="secondary" size="sm" type="submit" className="w-fit">Revogar papel</Button>
                                </form>
                              </div>
                            ))}
                          </div>
                        )}
                      </Td>

                      <Td className="align-top">
                        {availableRoles.length > 0 ? (
                          <form action={grantOrganizationRoleAction} className="grid gap-2">
                            <input type="hidden" name="organization_id" value={organization.organization_id} />
                            <input type="hidden" name="membership_id" value={membership.membership_id} />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            <Label className="text-xs">
                              Papel
                              <Select name="role_id" required>
                                {availableRoles.map((role) => <option value={role.role_id} key={role.role_id}>{role.name} · {role.permissions.join(", ") || "sem permissões adicionais"}</option>)}
                              </Select>
                            </Label>
                            <Label className="text-xs">Expiração opcional · horário de Brasília (UTC−03:00)<Input type="datetime-local" name="valid_until" /></Label>
                            <Label className="text-xs">Digite CONCEDER<Input name="confirmation" autoComplete="off" required /></Label>
                            <Button size="sm" type="submit" className="w-fit">Conceder papel</Button>
                          </form>
                        ) : <p className="text-sm text-muted">Todos os papéis ativos já estão atribuídos a este membro.</p>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>
        </section>
      </div>
    </AppShell>
  );
}
