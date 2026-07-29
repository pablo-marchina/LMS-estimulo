import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const memberships = workspace?.memberships.filter((membership) => !search || membership.email.toLocaleLowerCase("pt-BR").includes(search)) ?? [];

  return <AppShell area="admin" email={auth.email}><div className="grid gap-6">
    <PageHeader eyebrow="Equipe" title="Usuários e acessos" description="Consulte as contas da organização e altere somente quem pode administrar a plataforma." />
    {query.status === "concedido" ? <StatusPanel title="Acesso administrativo concedido" tone="success">O usuário já pode alterar as configurações permitidas.</StatusPanel> : null}
    {query.status === "removido" ? <StatusPanel title="Acesso administrativo removido" tone="success">O usuário continua com acesso de consulta.</StatusPanel> : null}
    {!canManageRoles ? <StatusPanel title="Somente consulta" tone="info">Você pode ver os usuários, mas não alterar seus papéis.</StatusPanel> : null}
    <Card><form method="get" className="flex flex-wrap items-end gap-3"><Label className="min-w-64 flex-1">Buscar usuário<Input name="q" defaultValue={query.q ?? ""} placeholder="nome@estimulo.org" /></Label><Button type="submit" variant="secondary">Buscar</Button></form></Card>
    {!workspace ? <StatusPanel title="Usuários indisponíveis" tone="warning">Não foi possível carregar os acessos neste momento.</StatusPanel> : memberships.length === 0 ? <StatusPanel title="Nenhum usuário encontrado" tone="info">Revise a busca e tente novamente.</StatusPanel> : <TableScroll><Table><thead><tr><Th>Usuário</Th><Th>Acesso</Th><Th>Vínculo</Th>{canManageRoles ? <Th className="text-right">Alterar acesso</Th> : null}</tr></thead><tbody>{memberships.map((membership) => {
      const generalAdmin = membership.roles.find((role) => role.active && role.role_code === "e14_operator") ?? null;
      return <tr key={membership.membership_id}>
        <Td><div className="flex items-center gap-3"><Avatar name={membership.email} /><div><p className="font-semibold text-ink">{membership.email}</p><p className="text-xs text-muted">Conta Estímulo</p></div></div></Td>
        <Td><StatusPill tone={generalAdmin ? "success" : "neutral"}>{generalAdmin ? "Administrador geral" : "Consulta"}</StatusPill></Td>
        <Td><p className="text-sm text-ink">{membership.membership_status === "active" ? "Ativo" : membership.membership_status}</p><p className="text-xs text-muted">Desde {dateFormatter.format(new Date(membership.valid_from))}</p></Td>
        {canManageRoles ? <Td><div className="flex justify-end"><details className="min-w-56 rounded-xl border border-border bg-white text-left"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-secondary">{generalAdmin ? "Remover administração" : "Conceder administração"}</summary><div className="border-t border-border p-3">{generalAdmin ? <form action={revokeOrganizationRoleAction} className="grid gap-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={generalAdmin.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><p className="text-xs text-muted">A pessoa continuará podendo consultar o painel.</p><Label className="text-xs">Confirme digitando REMOVER<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" variant="secondary" size="sm">Remover acesso</Button></form> : administratorRole ? <form action={grantOrganizationRoleAction} className="grid gap-2"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={administratorRole.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><p className="text-xs text-muted">Permite alterar jornadas, conteúdo e operação conforme as permissões do papel.</p><Label className="text-xs">Confirme digitando CONCEDER<Input name="confirmation" autoComplete="off" required /></Label><Button type="submit" size="sm">Conceder acesso</Button></form> : <span className="text-sm text-muted">Papel indisponível</span>}</div></details></div></Td> : null}
      </tr>;
    })}</tbody></Table></TableScroll>}
  </div></AppShell>;
}
