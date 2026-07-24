import { randomUUID } from "node:crypto";
import { createEnrollmentAction, moderateActivityCommentAction, publishVerticalAction, reviewPracticeSubmissionAction } from "@/app/actions/journey";
import { AppShell } from "@/components/app-shell";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { statusLabel } from "@/lib/journey-runtime/navigation";
import { practiceRuntime } from "@/lib/practice/runtime";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const practiceStatus: Record<string, string> = {
  upload_pending: "Aguardando envio",
  awaiting_review: "Aguardando revisão",
  available: "Disponível",
  accepted: "Aceita",
  rejected: "Revisão solicitada",
  failed: "Falha no envio",
};

function practiceTone(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "accepted") return "success";
  if (status === "rejected") return "danger";
  if (status === "awaiting_review") return "warning";
  return "neutral";
}

function fileSize(value: number | null): string | null {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function readableLabel(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/ Id\b/g, "")
    .replace(/ Uuid\b/g, "");
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR").format(value);
  if (typeof value === "string") {
    const date = Date.parse(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(date)) return dateFormatter.format(new Date(date));
    if (/^[0-9a-f-]{36}$/i.test(value)) return "Registro interno confirmado";
    return value;
  }
  if (Array.isArray(value)) return `${value.length} item(ns) registrados`;
  if (typeof value === "object") return `${Object.keys(value as Record<string, unknown>).length} campo(s) registrados`;
  return String(value);
}

export default async function AdminOperationPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string; instance?: string; sucesso?: string; comentario?: string; pratica?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return <main className="mx-auto max-w-3xl px-4 py-10"><StatusPanel title="Acesso indisponível" tone="warning"><p>Entre e vincule uma identidade interna.</p></StatusPanel></main>;
  const organization = auth.identity.organizations.find((item) => item.organization_id === query.organization) ?? auth.identity.organizations[0];
  if (!organization) return <AppShell area="admin" email={auth.email}><StatusPanel title="Área indisponível" tone="warning"><p>Nenhuma organização ativa foi encontrada.</p></StatusPanel></AppShell>;

  const canManageComments = organization.permissions.includes("engagement.manage");
  const canReviewPractice = organization.permissions.includes("assessment.review");
  const [listing, workspaceResult, commentResult, practiceResult] = await Promise.all([
    journeyRuntime.listOperatorInstances(auth.identity.user_account_id, organization.organization_id),
    Promise.allSettled([journeyRuntime.getOperatorWorkspace(auth.identity.user_account_id, organization.organization_id)]),
    canManageComments
      ? Promise.allSettled([journeyRuntime.listOperatorActivityComments(auth.identity.user_account_id, organization.organization_id, 100)])
      : Promise.resolve([]),
    canReviewPractice
      ? Promise.allSettled([practiceRuntime.listOperator(auth.identity.user_account_id, organization.organization_id, 100)])
      : Promise.resolve([]),
  ]);
  const workspace = workspaceResult[0]?.status === "fulfilled" ? workspaceResult[0].value : null;
  const commentData = commentResult[0]?.status === "fulfilled" ? commentResult[0].value : null;
  const practiceData = practiceResult[0]?.status === "fulfilled" ? practiceResult[0].value : null;
  const comments = commentData?.comments ?? [];
  const practices = practiceData?.submissions ?? [];
  const result = query.instance ? await journeyRuntime.getOperatorResult(auth.identity.user_account_id, organization.organization_id, query.instance) : null;

  return (
    <AppShell area="admin" email={auth.email}>
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Operação"
          title="Jornadas e evidências"
          description="Publicação, matrícula, comentários, práticas e acompanhamento usam dados versionados e eventos reais."
          actions={
            <form className="flex flex-wrap items-end gap-3" method="get">
              <label className="grid gap-1.5 text-sm font-medium text-ink">Organização
                <Select name="organization" defaultValue={organization.organization_id}>
                  {auth.identity.organizations.map((item) => <option value={item.organization_id} key={item.organization_id}>{item.display_name}</option>)}
                </Select>
              </label>
              <Button variant="secondary" type="submit">Selecionar</Button>
            </form>
          }
        />

        {query.sucesso ? <StatusPanel title="Operação concluída" tone="success"><p>A alteração foi confirmada pelo backend transacional.</p></StatusPanel> : null}
        {query.comentario === "moderado" ? <StatusPanel title="Comentário moderado" tone="success"><p>O estado e o histórico de moderação foram registrados.</p></StatusPanel> : null}
        {query.pratica === "revisada" ? <StatusPanel title="Prática revisada" tone="success"><p>A decisão e o feedback foram registrados no histórico da submissão.</p></StatusPanel> : null}

        {workspace ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold text-ink">Publicar versão imutável</h2>
              {workspace.journey_versions.filter((item) => item.status === "draft").length === 0 ? <p className="mt-2 text-sm text-muted">Nenhuma versão em rascunho está pronta.</p> : (
                <form action={publishVerticalAction} className="mt-4 grid gap-4">
                  <input type="hidden" name="organization_id" value={organization.organization_id} />
                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Versão
                    <Select name="journey_selection" required>
                      {workspace.journey_versions.filter((item) => item.status === "draft").map((item) => <option key={item.journey_version_id} value={`${item.journey_version_id}:${item.content_hash}`}>{item.title} · versão {item.version_number}</option>)}
                    </Select>
                  </label>
                  <Button type="submit" className="w-fit">Publicar</Button>
                </form>
              )}
            </Card>
            <Card>
              <h2 className="text-lg font-semibold text-ink">Criar matrícula</h2>
              {workspace.participants.length === 0 || workspace.journey_versions.filter((item) => item.status === "published").length === 0 ? <p className="mt-2 text-sm text-muted">É necessário ter participante e versão publicada.</p> : (
                <form action={createEnrollmentAction} className="mt-4 grid gap-4">
                  <input type="hidden" name="organization_id" value={organization.organization_id} />
                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Participante
                    <Select name="entrepreneur_id" required>{workspace.participants.map((item) => <option key={item.entrepreneur_id} value={item.entrepreneur_id}>{item.display_name} · {item.email}</option>)}</Select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">Jornada
                    <Select name="journey_version_id" required>{workspace.journey_versions.filter((item) => item.status === "published").map((item) => <option key={item.journey_version_id} value={item.journey_version_id}>{item.title} · versão {item.version_number}</option>)}</Select>
                  </label>
                  <Button type="submit" className="w-fit">Matricular</Button>
                </form>
              )}
            </Card>
          </div>
        ) : <StatusPanel title="Consulta disponível" tone="info"><p>As ações de publicação e matrícula não estão disponíveis para este vínculo.</p></StatusPanel>}

        {canReviewPractice ? (
          <section className="grid gap-4" id="praticas" aria-labelledby="revisao-praticas-titulo">
            <div><h2 id="revisao-praticas-titulo" className="text-xl font-semibold text-ink">Revisão de práticas</h2><p className="text-sm text-muted">Arquivos privados validados podem ser baixados e avaliados.</p></div>
            {practices.length === 0 ? <EmptyState title="Nenhuma prática" tone="info">Ainda não há evidências enviadas nesta organização.</EmptyState> : (
              <div className="grid gap-4">{practices.map((practice) => (
                <Card key={practice.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2"><strong className="text-ink">{practice.participant_name}</strong><StatusPill tone={practiceTone(practice.status)}>{practiceStatus[practice.status] ?? practice.status}</StatusPill><time dateTime={practice.submitted_at} className="ml-auto text-xs text-muted">{dateFormatter.format(new Date(practice.submitted_at))}</time></div>
                  <p className="text-sm text-muted">{practice.activity_title} · envio {practice.submission_number}</p>
                  <p className="mt-1 text-sm text-ink">{practice.original_filename ?? "Arquivo em preparação"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span>{practice.content_type ?? "Formato em validação"}</span>{fileSize(practice.size_bytes) ? <span>{fileSize(practice.size_bytes)}</span> : null}<span>{practice.allow_public_use ? "Uso autorizado" : "Uso público não autorizado"}</span></div>
                  {practice.review_feedback ? <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning"><strong>Feedback atual:</strong> {practice.review_feedback}</p> : null}
                  {practice.can_download ? <ButtonLink href={`/api/practice-submissions/${practice.id}/download`} variant="secondary" size="sm" className="mt-3 w-fit">Baixar evidência</ButtonLink> : null}
                  {practice.status === "awaiting_review" ? (
                    <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                      <form action={reviewPracticeSubmissionAction} className="grid gap-3"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="submission_id" value={practice.id} /><input type="hidden" name="status" value="accepted" /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label className="grid gap-1.5 text-sm font-medium text-ink">Feedback opcional<Textarea name="feedback" rows={2} maxLength={2000} /></label><Button type="submit" className="w-fit">Aceitar prática</Button></form>
                      <form action={reviewPracticeSubmissionAction} className="grid gap-3"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="submission_id" value={practice.id} /><input type="hidden" name="status" value="rejected" /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label className="grid gap-1.5 text-sm font-medium text-ink">Motivo da revisão<Textarea name="feedback" rows={2} minLength={1} maxLength={2000} required /></label><Button variant="secondary" type="submit" className="w-fit">Solicitar ajuste</Button></form>
                    </div>
                  ) : null}
                </Card>
              ))}</div>
            )}
          </section>
        ) : null}

        {canManageComments ? (
          <section className="grid gap-4" id="comentarios" aria-labelledby="moderacao-comentarios-titulo">
            <div><h2 id="moderacao-comentarios-titulo" className="text-xl font-semibold text-ink">Moderação de comentários</h2><p className="text-sm text-muted">Comentários podem ser ocultados ou restaurados sem apagar o histórico.</p></div>
            {comments.length === 0 ? <EmptyState title="Nenhum comentário" tone="info">Ainda não há comentários para moderar.</EmptyState> : (
              <div className="grid gap-4">{comments.map((comment) => (
                <Card key={comment.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2"><strong className="text-ink">{comment.author_name}</strong><StatusPill tone={comment.status === "visible" ? "success" : "neutral"}>{comment.status === "visible" ? "Visível" : "Oculto"}</StatusPill><time dateTime={comment.created_at} className="ml-auto text-xs text-muted">{dateFormatter.format(new Date(comment.created_at))}</time></div>
                  <p className="text-sm text-muted">{comment.activity_title}</p><p className="mt-1 text-sm text-ink">{comment.body}</p>
                  {comment.moderation_reason ? <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning"><strong>Motivo atual:</strong> {comment.moderation_reason}</p> : null}
                  {comment.status === "visible" ? (
                    <form action={moderateActivityCommentAction} className="mt-4 grid gap-3 border-t border-border pt-4"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="comment_id" value={comment.id} /><input type="hidden" name="status" value="hidden" /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label className="grid gap-1.5 text-sm font-medium text-ink">Justificativa<Textarea name="reason" rows={2} minLength={1} maxLength={500} required /></label><Button variant="secondary" type="submit" className="w-fit">Ocultar comentário</Button></form>
                  ) : (
                    <form action={moderateActivityCommentAction} className="mt-4 border-t border-border pt-4"><input type="hidden" name="organization_id" value={organization.organization_id} /><input type="hidden" name="comment_id" value={comment.id} /><input type="hidden" name="status" value="visible" /><input type="hidden" name="reason" value="" /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button variant="secondary" type="submit" className="w-fit">Restaurar comentário</Button></form>
                  )}
                </Card>
              ))}</div>
            )}
          </section>
        ) : null}

        <section className="grid gap-4">
          <h2 className="text-xl font-semibold text-ink">Instâncias recentes</h2>
          {listing.instances.length === 0 ? <EmptyState title="Nenhuma instância" tone="info">A organização ainda não possui jornadas executadas.</EmptyState> : (
            <div className="grid gap-4">{listing.instances.map((instance) => (
              <Card key={instance.journey_instance_id}><div className="mb-3 flex flex-wrap items-center gap-2"><StatusPill tone="info">{statusLabel(instance.journey_status)}</StatusPill><span className="text-sm text-muted">{instance.journey_code}</span></div><ProgressMeter value={instance.progress} label="Progresso" /><ButtonLink href={`/admin/operacao?organization=${organization.organization_id}&instance=${instance.journey_instance_id}`} variant="secondary" size="sm" className="mt-4 w-fit">Abrir evidências</ButtonLink></Card>
            ))}</div>
          )}
        </section>

        {result ? (
          <Card className="grid gap-4">
            <div><h2 className="text-lg font-semibold text-ink">Evidência selecionada</h2><p className="text-sm text-muted">Resumo legível do registro operacional, sem expor o conteúdo técnico bruto.</p></div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(result).map(([key, value]) => <div key={key} className="rounded-lg border border-border p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{readableLabel(key)}</dt><dd className="mt-1 text-sm text-ink">{readableValue(value)}</dd></div>)}
            </dl>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
