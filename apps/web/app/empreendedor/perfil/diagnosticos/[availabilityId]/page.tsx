import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { startOptionalDiagnosticAction } from "@/app/empreendedor/perfil/diagnosticos/[availabilityId]/actions";
import { OptionalDiagnosticForm, type OptionalDiagnosticSavedResponse } from "@/components/optional-diagnostic-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isParticipantInterfacePreviewRequest, requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

export default async function OptionalDiagnosticPage({ params, searchParams }: { params: Promise<{ availabilityId: string }>; searchParams: Promise<{ sessao?: string; erro?: string }> }) {
  const { availabilityId } = await params;
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const workspace = await extensionsRuntime.participantWorkspace(auth.identity.user_account_id);
  const diagnostic = workspace.optional_diagnostics.find((item) => text((item.availability as JsonRecord | undefined)?.id) === availabilityId);
  if (!diagnostic) notFound();
  const availability = diagnostic.availability as JsonRecord;
  const sessions = records(diagnostic.sessions);
  const session = sessions.find((item) => text(item.id) === query.sessao) ?? sessions.find((item) => item.status === "in_progress");
  const completed = sessions.find((item) => item.status === "completed");
  const questions = records(diagnostic.questions);
  const questionData = questions.map((question) => ({
    id: text(question.id),
    prompt: text(question.prompt),
    helpText: text(question.help_text),
    required: question.is_required !== false,
    options: records(question.options).map((option) => ({ id: text(option.id), label: text(option.label) })),
  }));
  const preview = await isParticipantInterfacePreviewRequest();
  const sessionId = session ? text(session.id) : "";
  const savedResponses = sessionId && !preview
    ? await invokeServerRpc<OptionalDiagnosticSavedResponse[]>("get_optional_diagnostic_responses", {
        p_actor_user_account_id: auth.identity.user_account_id,
        p_session_id: sessionId,
      }).catch(() => [])
    : [];

  return <div className="mx-auto grid max-w-4xl gap-7 px-5 py-8 lg:px-9 lg:py-10">
    <Link href="/empreendedor/perfil" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} />Voltar ao perfil</Link>
    <PageHeader eyebrow="Diagnóstico opcional" title={text(availability.display_title)} description={text(availability.display_description)} />
    <StatusPanel title="Sem impacto no seu perfil principal" tone="info">Este diagnóstico não altera seu arquétipo nem o acesso às jornadas.</StatusPanel>
    {preview ? <StatusPanel title="Pré-visualização somente leitura" tone="info">As respostas não podem ser alteradas enquanto você visualiza a experiência de um participante.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível continuar" tone="warning">Código: {query.erro}</StatusPanel> : null}

    {completed && !session ? <Card><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="font-black text-secondary">Resultado mais recente</h2><p className="text-sm text-muted">Tentativa {number(completed.attempt_number)} concluída.</p></div></div>{availability.show_result !== false ? <Result result={completed.result_payload} /> : <p className="mt-4 text-sm text-muted">O resultado não está configurado para exibição.</p>}{!preview ? <form action={startOptionalDiagnosticAction} className="mt-5"><input type="hidden" name="availability_id" value={availabilityId} /><PendingSubmitButton pendingLabel="Preparando…">Refazer diagnóstico</PendingSubmitButton></form> : null}</Card> : null}

    {!session && !completed ? <Card className="grid gap-4"><div><h2 className="font-black text-secondary">Pronto para começar?</h2><p className="text-sm text-muted">O diagnóstico possui {questions.length} pergunta(s). Você poderá continuar a tentativa em andamento sem perder respostas já salvas.</p></div>{!preview ? <form action={startOptionalDiagnosticAction}><input type="hidden" name="availability_id" value={availabilityId} /><PendingSubmitButton pendingLabel="Iniciando…">Iniciar diagnóstico</PendingSubmitButton></form> : null}</Card> : null}

    {session ? <OptionalDiagnosticForm availabilityId={availabilityId} sessionId={sessionId} questions={questionData} savedResponses={savedResponses} /> : null}
  </div>;
}

function Result({ result }: { result: unknown }) {
  const payload = result && typeof result === "object" && !Array.isArray(result) ? result as JsonRecord : {};
  const dimensions = records(payload.dimensions);
  return <div className="mt-5 grid gap-3 sm:grid-cols-2">{dimensions.map((dimension) => <div key={text(dimension.code)} className="rounded-xl bg-surface-muted p-4"><p className="text-sm font-semibold text-muted">{text(dimension.name)}</p><p className="mt-1 text-2xl font-black text-secondary">{number(dimension.score).toFixed(1)}</p></div>)}</div>;
}
