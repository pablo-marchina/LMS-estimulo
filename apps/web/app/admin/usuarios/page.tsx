import { randomUUID } from "node:crypto";
import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { TableScroll, Table, Th, Td } from "@/components/ui/table";
import { getAuthContext } from "@/lib/auth/context";
import { identityResolutionRuntime, type IdentityContactCandidate, type IdentityResolutionCase } from "@/lib/admin/identity-resolution";
import { roleManagementRuntime } from "@/lib/admin/role-management";
import { grantOrganizationRoleAction, resolveIdentityCaseAction, revokeOrganizationRoleAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const identityStatusLabels: Record<IdentityResolutionCase["status"], string> = {
  pending: "Precisa de decisão",
  awaiting_integration: "Aguardando HubSpot",
  queued: "Criação enfileirada",
  resolved: "Resolvida",
  dismissed: "Arquivada",
};

const identityReasonLabels: Record<IdentityResolutionCase["reason_code"], string> = {
  no_match: "Nenhum contato compatível foi encontrado",
  multiple_matches: "Mais de um contato pode ser a mesma pessoa",
  conflict_blocked: "Os dados encontrados entram em conflito",
  manual_review: "Revisão manual solicitada",
};

function candidateId(candidate: IdentityContactCandidate): string {
  return String(candidate.external_object_id ?? candidate.id ?? "").trim();
}

function candidateTitle(candidate: IdentityContactCandidate): string {
  return String(candidate.name ?? candidate.email ?? candidate.company ?? "Contato encontrado");
}

export default async function UserAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string; status?: string; identidadeStatus?: string; identidades?: string }>;
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

  const canManageRoles = organization.permissions.includes("iam.memberships.manage");
  const canManageIdentities = organization.permissions.some((permission) => permission === "iam.accounts.manage" || permission === "integration.manage");
  if (!canManageRoles && !canManageIdentities) {
    return <AppShell area="admin" email={auth.email}><StatusPanel title="Gestão de usuários restrita" tone="warning"><p>Seu papel não permite administrar papéis nem resolver identidades.</p></StatusPanel></AppShell>;
  }

  const requestedIdentityStatus = ["pending", "awaiting_integration", "queued", "resolved", "dismissed"].includes(query.identidadeStatus ?? "")
    ? query.identidadeStatus as IdentityResolutionCase["status"]
    : null;

  const [roleResult, identityResult] = await Promise.all([
    canManageRoles
      ? roleManagementRuntime.list(auth.identity.user_account_id, organization.organization_id).catch(() => null)
      : Promise.resolve(null),
    canManageIdentities
      ? identityResolutionRuntime.list(auth.identity.user_account_id, organization.organization_id, requestedIdentityStatus).catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Administração"
          title="Usuários e identidades"
          description="Gerencie acessos internos e resolva vínculos de participantes sem precisar entender a lógica técnica de integração."
        />

        {query.status === "concedido" ? <StatusPanel title="Papel concedido" tone="success"><p>A concessão foi registrada e auditada.</p></StatusPanel> : null}
        {query.status === "removido" ? <StatusPanel title="Papel removido" tone="success"><p>A revogação e sua justificativa foram registradas.</p></StatusPanel> : null}
        {query.identidades ? (
          <StatusPanel title="Decisão de identidade registrada" tone="success">
            <p>Quando o HubSpot ainda não estiver conectado, a decisão permanece guardada e será executada depois, sem perder o caso.</p>
          </StatusPanel>
        ) : null}

        <form method="get" className="flex flex-wrap items-end gap-3">
          <Label className="min-w-56">
            Organização
            <Select name="organization" defaultValue={organization.organization_id}>
              {auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}
            </Select>
          </Label>
          <Button type="submit" variant="secondary">Selecionar</Button>
        </form>

        {canManageIdentities ? (
          <section className="grid gap-5" aria-labelledby="identidades-pendentes-titulo">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="identidades-pendentes-titulo" className="text-xl font-semibold text-ink">Identidades pendentes de resolução</h2>
                <p className="text-sm text-muted">Casos ambíguos ficam parados com segurança até uma pessoa escolher o vínculo correto.</p>
              </div>
              <form method="get" className="flex items-end gap-2">
                <input type="hidden" name="organization" value={organization.organization_id} />
                <Label className="min-w-52">Mostrar
                  <Select name="identidadeStatus" defaultValue={requestedIdentityStatus ?? ""}>
                    <option value="">Todos os casos</option>
                    <option value="pending">Precisam de decisão</option>
                    <option value="awaiting_integration">Aguardando HubSpot</option>
                    <option value="queued">Criação enfileirada</option>
                    <option value="resolved">Resolvidos</option>
                    <option value="dismissed">Arquivados</option>
                  </Select>
                </Label>
                <Button type="submit" variant="secondary">Filtrar</Button>
              </form>
            </div>

            {identityResult ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Precisam de decisão</span><strong className="mt-1 block text-3xl text-ink">{identityResult.counts.pending}</strong></Card>
                <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Aguardando integração</span><strong className="mt-1 block text-3xl text-ink">{identityResult.counts.awaiting_integration}</strong></Card>
                <Card><span className="text-xs font-semibold uppercase tracking-wide text-muted">Na fila de criação</span><strong className="mt-1 block text-3xl text-ink">{identityResult.counts.queued}</strong></Card>
              </div>
            ) : null}

            {!identityResult ? (
              <StatusPanel title="Fila temporariamente indisponível" tone="warning"><p>Os papéis continuam disponíveis abaixo, mas não foi possível consultar as identidades agora.</p></StatusPanel>
            ) : identityResult.cases.length === 0 ? (
              <EmptyState title="Nenhuma identidade neste filtro" tone="success">Não há decisões pendentes para esta organização.</EmptyState>
            ) : (
              <div className="grid gap-4">
                {identityResult.cases.map((identityCase) => {
                  const displayName = identityCase.preferred_name ?? identityCase.legal_name ?? identityCase.email;
                  const isOpen = !["resolved", "dismissed"].includes(identityCase.status);
                  return (
                    <Card key={identityCase.id} className="grid gap-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <Avatar name={displayName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink">{displayName}</h3>
                            <StatusPill tone={identityCase.status === "pending" ? "warning" : identityCase.status === "resolved" ? "success" : "neutral"}>
                              {identityStatusLabels[identityCase.status]}
                            </StatusPill>
                          </div>
                          <p className="mt-1 text-sm text-muted">{identityCase.email}{identityCase.phone_e164 ? ` · ${identityCase.phone_e164}` : ""}</p>
                          <p className="mt-2 text-sm text-ink">{identityReasonLabels[identityCase.reason_code]}</p>
                          <p className="mt-1 text-xs text-muted">Aberto em {dateFormatter.format(new Date(identityCase.created_at))}</p>
                        </div>
                      </div>

                      {identityCase.candidate_contacts.length ? (
                        <div className="grid gap-3">
                          <h4 className="text-sm font-semibold text-ink">Contatos que podem corresponder</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {identityCase.candidate_contacts.map((candidate, index) => {
                              const externalId = candidateId(candidate);
                              return (
                                <div key={externalId || index} className="rounded-lg border border-border bg-surface-muted/40 p-4">
                                  <strong className="text-sm text-ink">{candidateTitle(candidate)}</strong>
                                  {candidate.email ? <p className="mt-1 text-xs text-muted">{String(candidate.email)}</p> : null}
                                  {candidate.phone ? <p className="text-xs text-muted">{String(candidate.phone)}</p> : null}
                                  {candidate.company ? <p className="text-xs text-muted">{String(candidate.company)}</p> : null}
                                  {isOpen && externalId ? (
                                    <form action={resolveIdentityCaseAction} className="mt-3 grid gap-2">
                                      <input type="hidden" name="organization_id" value={organization.organization_id} />
                                      <input type="hidden" name="case_id" value={identityCase.id} />
                                      <input type="hidden" name="resolution_action" value="link_existing" />
                                      <input type="hidden" name="external_object_id" value={externalId} />
                                      <input type="hidden" name="idempotency_key" value={randomUUID()} />
                                      <Label className="text-xs">Observação opcional<Textarea name="note" rows={2} maxLength={1000} /></Label>
                                      <Button type="submit" size="sm" className="w-fit">Vincular a este contato</Button>
                                    </form>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {isOpen ? (
                        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                          <form action={resolveIdentityCaseAction} className="grid gap-2 rounded-lg bg-primary-soft p-4">
                            <input type="hidden" name="organization_id" value={organization.organization_id} />
                            <input type="hidden" name="case_id" value={identityCase.id} />
                            <input type="hidden" name="resolution_action" value="create_new" />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            <strong className="text-sm text-ink">Nenhum contato é a pessoa certa</strong>
                            <p className="text-xs text-muted">A criação será enfileirada; se o HubSpot estiver desconectado, a decisão fica aguardando integração.</p>
                            <Label className="text-xs">Observação opcional<Textarea name="note" rows={2} maxLength={1000} /></Label>
                            <Button type="submit" size="sm" className="w-fit">Criar novo contato</Button>
                          </form>
                          <form action={resolveIdentityCaseAction} className="grid gap-2 rounded-lg border border-border p-4">
                            <input type="hidden" name="organization_id" value={organization.organization_id} />
                            <input type="hidden" name="case_id" value={identityCase.id} />
                            <input type="hidden" name="resolution_action" value="dismiss" />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            <strong className="text-sm text-ink">Caso não deve ser resolvido agora</strong>
                            <Label className="text-xs">Motivo<Textarea name="note" rows={2} minLength={3} maxLength={1000} required /></Label>
                            <Button type="submit" variant="secondary" size="sm" className="w-fit">Arquivar caso</Button>
                          </form>
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {canManageRoles && roleResult ? (
          <section className="grid gap-4" aria-labelledby="membros-titulo">
            <div>
              <h2 id="membros-titulo" className="text-xl font-semibold text-ink">Membros e papéis administrativos</h2>
              <p className="text-sm text-muted">Concessões e revogações são explícitas, têm confirmação e ficam registradas.</p>
            </div>

            <TableScroll>
              <Table>
                <thead><tr><Th>Membro</Th><Th>Papéis ativos</Th><Th>Conceder papel</Th></tr></thead>
                <tbody>
                  {roleResult.memberships.map((membership) => {
                    const activeRoles = membership.roles.filter((role) => role.active);
                    const availableRoles = roleResult.roles.filter(
                      (role) => role.status === "active" && !activeRoles.some((active) => active.role_id === role.role_id),
                    );
                    return (
                      <tr key={membership.membership_id}>
                        <Td className="align-top">
                          <div className="flex items-start gap-3">
                            <Avatar name={membership.email} />
                            <div><p className="font-semibold text-ink">{membership.email}</p><p className="text-xs text-muted">Vínculo {membership.membership_status} · desde {dateFormatter.format(new Date(membership.valid_from))}</p></div>
                          </div>
                        </Td>
                        <Td className="align-top">
                          {activeRoles.length === 0 ? <p className="text-sm text-muted">Nenhum papel administrativo ativo.</p> : (
                            <div className="grid gap-3">
                              {activeRoles.map((role) => (
                                <div key={`${membership.membership_id}:${role.role_id}:${role.valid_from}`} className="rounded-lg border border-border p-3">
                                  <div className="mb-2 flex flex-wrap items-center gap-2"><StatusPill tone="info">{role.role_name}</StatusPill><span className="text-xs text-muted">{role.valid_until ? `Expira ${dateFormatter.format(new Date(role.valid_until))}` : "Sem expiração"}</span></div>
                                  <form action={revokeOrganizationRoleAction} className="grid gap-2">
                                    <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="role_id" value={role.role_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} />
                                    <Label className="text-xs">Justificativa<Textarea name="reason" minLength={3} maxLength={500} rows={2} required /></Label><Label className="text-xs">Digite REMOVER<Input name="confirmation" autoComplete="off" required /></Label><Button variant="secondary" size="sm" type="submit" className="w-fit">Revogar papel</Button>
                                  </form>
                                </div>
                              ))}
                            </div>
                          )}
                        </Td>
                        <Td className="align-top">
                          {availableRoles.length > 0 ? (
                            <form action={grantOrganizationRoleAction} className="grid gap-2">
                              <input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="membership_id" value={membership.membership_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} />
                              <Label className="text-xs">Papel<Select name="role_id" required>{availableRoles.map((role) => <option value={role.role_id} key={role.role_id}>{role.name}</option>)}</Select></Label>
                              <Label className="text-xs">Expiração opcional · horário de Brasília<Input type="datetime-local" name="valid_until" /></Label><Label className="text-xs">Digite CONCEDER<Input name="confirmation" autoComplete="off" required /></Label><Button size="sm" type="submit" className="w-fit">Conceder papel</Button>
                            </form>
                          ) : <p className="text-sm text-muted">Todos os papéis ativos já estão atribuídos.</p>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableScroll>
          </section>
        ) : canManageRoles ? <StatusPanel title="Papéis temporariamente indisponíveis" tone="warning"><p>A fila de identidades continua disponível acima.</p></StatusPanel> : null}
      </div>
    </AppShell>
  );
}
