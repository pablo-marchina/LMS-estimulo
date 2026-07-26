import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { roleManagementRuntime } from "@/lib/admin/role-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { grantOrganizationRoleAction, revokeOrganizationRoleAction } from "./actions";

export const dynamic = "force-dynamic";
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function UserAdministrationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning">Seu usuário não está vinculado à Estímulo.</StatusPanel></AppShell>;

  const canManageRoles = organization.permissions.includes("iam.memberships.manage");
  const workspace = await roleManagementRuntime.list(auth.identity.user_account_id, organization.organization_id).catch(() => null);
  const administratorRole = workspace?.roles.find((role) => role.code === "e14_operator" && role.status === "active") ?? null;

  return <AppShell area="admin" email={auth.email}><div className="grid gap-7">
    <PageHeader eyebrow="Administração" title="Usuários e acessos" description="Todas as contas Estímulo podem consultar a administração. Somente quem recebe o papel Administrador geral pode alterar dados." />
    {query.status === "concedido" ? <StatusPanel title="Administrador geral concedido" tone="success">O usuário já pode realizar alterações na plataforma.</StatusPanel> : null}
    {query.status === "removido" ? <StatusPanel title="Administrador geral removido" tone="success">O usuário continua com acesso de visualização.</StatusPanel> : null}
    {!canManageRoles ? <StatusPanel title="Acesso somente para visualização" tone="info">Você pode consultar usuários e acessos, mas somente um Administrador geral pode conceder ou remover o papel.</StatusPanel> : null}
    {!workspace ? <StatusPanel title="Usuários indisponíveis" tone="warning">Não foi possível carregar os acessos neste momento.</StatusPanel> : <TableScroll><Table><thead><tr><Th>Usuário</Th><Th>Acesso atual</Th><Th>Vínculo</Th>{canManageRoles ? <Th className="text-right">Administração</Th> : null}</tr></thead><tbody>{workspace.memberships.map((membership) => {
      const generalAdmin = membership.roles.find((role) => role.active && role.role_code === "e14_operator") ?? null;
      return <tr key={membership.membership_id}>
        <Td><div className="flex items-center gap-3"><Avatar name={membership.email} /><div><p className="font-semibold text-ink">{membership.email}</p><p className="text-xs text-muted">Conta vinculada à Estímulo</p></div></div></Td>
        <Td><StatusPill tone={generalAdmin ? "success" : "neutral"}>{generalAdmin ? "Administrador geral" : "Somente visualização"}</StatusPill></Td>
        <Td><p className="text-sm text-ink">{membership.membership_status === "active" ? "Ativo" : membership.membership_status}</p><p className="text-xs text-muted">Desde {dateFormatter.format(new Date(membership.valid_from))}</p></Td>
        {canManageRoles ? <Td><div className="flex justify-end">{generalAdmin ? <form action={revokeOrganizationRoleAction} className="grid min-w-48 gap-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={generalAdmin.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Label className="text-xs">Digite REMOVER<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm">Remover administrador</Button></form> : administratorRole ? <form action={grantOrganizationRoleAction} className="grid min-w-48 gap-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={administratorRole.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Label className="text-xs">Digite CONCEDER<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" size="sm">Tornar administrador</Button></form> : <span className="text-sm text-muted">Papel indisponível</span>}</div></Td> : null}
      </tr>;
    })}</tbody></Table></TableScroll>}
  </div></AppShell>;
}
