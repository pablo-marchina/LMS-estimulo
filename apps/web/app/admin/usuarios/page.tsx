import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { roleManagementRuntime, type ManagedMembership } from "@/lib/admin/role-management";
import { administrativeOrganization, usesCorporateGoogleIdentity } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { grantOrganizationRoleAction, revokeOrganizationRoleAction, sendUserPasswordRecoveryAction } from "./actions";

export const dynamic = "force-dynamic";
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function membershipMatches(membership: ManagedMembership, search: string) {
  if (!search) return true;
  const terms = search.split(/\s+/u).filter(Boolean);
  const identityLabel = usesCorporateGoogleIdentity(membership.email) ? "google corporativa" : "senha participante";
  const searchable = [
    membership.email,
    membership.user_account_id,
    membership.membership_id ?? "sem vinculo desvinculado",
    membership.account_status,
    membership.membership_status,
    identityLabel,
    ...membership.roles.flatMap((role) => [role.role_code, role.role_name, role.active ? "ativo" : "inativo"]),
  ].join(" ").toLocaleLowerCase("pt-BR");
  return terms.every((term) => searchable.includes(term));
}

export default async function UserAdministrationPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const canManageRoles = organization.permissions.includes("iam.memberships.manage");
  const workspace = await roleManagementRuntime.list(auth.identity.user_account_id, organization.organization_id).catch(() => null);
  const administratorRole = workspace?.roles.find((role) => role.code === "e14_operator" && role.status === "active") ?? null;
  const search = (query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const allMemberships = workspace?.memberships ?? [];
  const memberships = allMemberships.filter((membership) => membershipMatches(membership, search));
  const linkedCount = allMemberships.filter((membership) => Boolean(membership.membership_id)).length;
  const activeCount = allMemberships.filter((membership) => membership.membership_status === "active").length;
  const unlinkedCount = allMemberships.filter((membership) => !membership.membership_id).length;
  const administratorCount = allMemberships.filter((membership) => membership.roles.some((role) => role.active && role.role_code === "e14_operator")).length;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-6">
        <PageHeader eyebrow="Equipe" title="Usuários e acessos" description="Consulte todas as contas ativas da plataforma, inclusive contas ainda sem vínculo organizacional, além de papéis e validade." />
        {query.status === "concedido" ? <StatusPanel title="Acesso administrativo concedido" tone="success">O usuário já pode alterar as configurações permitidas.</StatusPanel> : null}
        {query.status === "removido" ? <StatusPanel title="Acesso administrativo removido" tone="success">O usuário continua com acesso de consulta.</StatusPanel> : null}
        {query.status === "recuperacao_enviada" ? <StatusPanel title="Recuperação enviada" tone="success">O usuário recebeu um link para definir uma nova senha. Nenhuma senha temporária foi criada ou exposta.</StatusPanel> : null}
        {query.status === "recuperacao_falhou" ? <StatusPanel title="Não foi possível enviar" tone="warning">Tente novamente mais tarde. Nenhuma credencial foi alterada.</StatusPanel> : null}
        {query.status === "acesso_google" ? <StatusPanel title="Conta com acesso Google" tone="info">Contas corporativas não usam senha de participante. Oriente a pessoa a entrar pela área administrativa com a conta Google correta.</StatusPanel> : null}
        {!canManageRoles ? <StatusPanel title="Somente consulta" tone="info">Você pode ver os usuários, mas não alterar seus papéis nem iniciar recuperação de acesso.</StatusPanel> : null}
        {unlinkedCount > 0 ? <StatusPanel title={`${unlinkedCount} ${unlinkedCount === 1 ? "conta está" : "contas estão"} sem vínculo organizacional`} tone="warning">Essas contas agora aparecem no diretório em vez de serem omitidas. Papéis administrativos permanecem bloqueados até que o vínculo seja criado pelo fluxo de cadastro ou reconciliação.</StatusPanel> : null}

        {workspace ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo de usuários">
            <MetricTile index={0} label="Contas encontradas" value={allMemberships.length} />
            <MetricTile index={1} label="Contas vinculadas" value={linkedCount} />
            <MetricTile index={2} label="Vínculos ativos" value={activeCount} />
            <MetricTile index={3} label="Administradores" value={administratorCount} />
          </section>
        ) : null}

        <Card>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <Label className="min-w-64 flex-1">Buscar usuário<Input name="q" defaultValue={query.q ?? ""} placeholder="E-mail, papel, status ou ID; também aceita sem vínculo" autoComplete="off" /></Label>
            <Button type="submit" variant="secondary">Buscar</Button>
            {search ? <ButtonLink href="/admin/usuarios" variant="ghost">Limpar</ButtonLink> : null}
          </form>
          {search ? <p className="mt-3 text-xs text-muted">{memberships.length} {memberships.length === 1 ? "resultado" : "resultados"} para “{query.q}”.</p> : null}
        </Card>

        {!workspace ? <StatusPanel title="Usuários indisponíveis" tone="warning">Não foi possível carregar os acessos neste momento.</StatusPanel> : memberships.length === 0 ? <StatusPanel title="Nenhum usuário encontrado" tone="info">Revise a busca ou limpe os filtros para consultar todas as contas.</StatusPanel> : (
          <TableScroll>
            <Table>
              <thead><tr><Th>Usuário</Th><Th>Identidade</Th><Th>Papéis e acesso</Th><Th>Vínculo</Th>{canManageRoles ? <Th className="text-right">Ações</Th> : null}</tr></thead>
              <tbody>{memberships.map((membership) => {
                const generalAdmin = membership.roles.find((role) => role.active && role.role_code === "e14_operator") ?? null;
                const usesGoogle = usesCorporateGoogleIdentity(membership.email);
                const activeRoles = membership.roles.filter((role) => role.active);
                const linked = Boolean(membership.membership_id);
                return (
                  <tr key={membership.user_account_id}>
                    <Td><div className="flex items-center gap-3"><Avatar name={membership.email} /><div><p className="font-semibold text-ink">{membership.email}</p><p className="text-xs text-muted" title={membership.user_account_id}>Conta {shortId(membership.user_account_id)}</p></div></div></Td>
                    <Td><StatusPill tone={usesGoogle ? "info" : "neutral"}>{usesGoogle ? "Google corporativo" : "E-mail e senha"}</StatusPill><p className="mt-2 text-xs text-muted">{usesGoogle ? "Entrada pela área administrativa" : "Recuperação por link seguro"}</p><p className="mt-1 text-xs text-muted">Conta {membership.account_status === "active" ? "ativa" : membership.account_status}</p></Td>
                    <Td><div className="flex flex-wrap gap-1.5">{activeRoles.length ? activeRoles.map((role) => <StatusPill key={`${membership.user_account_id}-${role.role_id}`} tone={role.role_code === "e14_operator" ? "success" : "neutral"}>{role.role_name}</StatusPill>) : <StatusPill tone={linked ? "neutral" : "warning"}>{linked ? "Consulta" : "Sem vínculo"}</StatusPill>}</div><p className="mt-2 text-xs text-muted">{activeRoles.length} {activeRoles.length === 1 ? "papel ativo" : "papéis ativos"}</p></Td>
                    <Td>{linked ? <><p className="text-sm font-medium text-ink">{membership.membership_status === "active" ? "Ativo" : membership.membership_status}</p>{membership.valid_from ? <p className="text-xs text-muted">Desde {dateFormatter.format(new Date(membership.valid_from))}</p> : null}{membership.valid_until ? <p className="text-xs text-muted">Até {dateFormatter.format(new Date(membership.valid_until))}</p> : <p className="text-xs text-muted">Sem data final</p>}<p className="mt-1 text-xs text-muted" title={membership.membership_id ?? undefined}>Vínculo {membership.membership_id ? shortId(membership.membership_id) : "—"}</p></> : <><StatusPill tone="warning">Sem vínculo</StatusPill><p className="mt-2 max-w-52 text-xs leading-5 text-muted">A conta existe, mas ainda não pertence formalmente à organização selecionada.</p></>}</Td>
                    {canManageRoles ? (
                      <Td>
                        <div className="flex flex-wrap justify-end gap-2">
                          {linked && membership.membership_id ? (
                            <details className="min-w-56 rounded-xl border border-border bg-white text-left">
                              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">{generalAdmin ? "Remover administração" : "Conceder administração"}</summary>
                              <div className="border-t border-border p-3">{generalAdmin ? <form action={revokeOrganizationRoleAction} className="grid gap-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={generalAdmin.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><p className="text-xs text-muted">A pessoa continuará podendo consultar o painel.</p><Label className="text-xs">Confirme digitando REMOVER<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm">Remover acesso</Button></form> : administratorRole ? <form action={grantOrganizationRoleAction} className="grid gap-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={administratorRole.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><p className="text-xs text-muted">Permite alterar jornadas, conteúdo e operação conforme as permissões do papel.</p><Label className="text-xs">Confirme digitando CONCEDER<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" size="sm">Conceder acesso</Button></form> : <span className="text-sm text-muted">Papel indisponível</span>}</div>
                            </details>
                          ) : <span className="max-w-48 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">Papéis bloqueados até existir vínculo</span>}

                          {usesGoogle ? <ButtonLink href="/entrar/administracao" variant="secondary" size="sm">Abrir acesso Google</ButtonLink> : <form action={sendUserPasswordRecoveryAction}><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="email" value={membership.email} /><Button type="submit" variant="secondary" size="sm">Enviar recuperação</Button></form>}
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                );
              })}</tbody>
            </Table>
          </TableScroll>
        )}
      </div>
    </AppShell>
  );
}
