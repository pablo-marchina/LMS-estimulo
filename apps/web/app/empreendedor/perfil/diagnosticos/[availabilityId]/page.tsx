import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { completeOptionalDiagnosticAction, startOptionalDiagnosticAction } from "@/app/empreendedor/perfil/diagnosticos/[availabilityId]/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

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

  return <div className="mx-auto grid max-w-4xl gap-7 px-5 py-8 lg:px-9 lg:py-10">
    <Link href="/empreendedor/perfil" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} />Voltar ao perfil</Link>
    <PageHeader eyebrow="Diagnóstico opcional" title={text(availability.display_title)} description={text(availability.display_description)} />
    <StatusPanel title="Sem impacto no seu perfil principal" tone="info">Este diagnóstico não altera seu arquétipo nem o acesso às jornadas.</StatusPanel>
    {query.erro ? <StatusPanel title="Não foi possível continuar" tone="warning">Código: {query.erro}</StatusPanel> : null}

    {completed && !session ? <Card><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="font-black text-secondary">Resultado mais recente</h2><p className="text-sm text-muted">Tentativa {number(completed.attempt_number)} concluída.</p></div></div>{availability.show_result !== false ? <Result result={completed.result_payload} /> : <p className="mt-4 text-sm text-muted">O resultado não está configurado para exibição.</p>}<form action={startOptionalDiagnosticAction} className="mt-5"><input type="hidden" name="availability_id" value={availabilityId} /><PendingSubmitButton pendingLabel="Preparando…">Refazer diagnóstico</PendingSubmitButton></form></Card> : null}

    {!session && !completed ? <Card className="grid gap-4"><div><h2 className="font-black text-secondary">Pronto para começar?</h2><p className="text-sm text-muted">O diagnóstico possui {questions.length} pergunta(s). Você poderá continuar a tentativa em andamento.</p></div><form action={startOptionalDiagnosticAction}><input type="hidden" name="availability_id" value={availabilityId} /><PendingSubmitButton pendingLabel="Iniciando…">Iniciar diagnóstico</PendingSubmitButton></form></Card> : null}

    {session ? <form action={completeOptionalDiagnosticAction} className="grid gap-5"><input type="hidden" name="availability_id" value={availabilityId} /><input type="hidden" name="session_id" value={text(session.id)} /><input type="hidden" name="question_ids" value={questions.map((question) => text(question.id)).join(",")} />{questions.map((question, index) => <Question key={text(question.id)} question={question} index={index} />)}<PendingSubmitButton pendingLabel="Calculando resultado…" className="w-fit">Concluir diagnóstico</PendingSubmitButton></form> : null}
  </div>;
}

function Question({ question, index }: { question: JsonRecord; index: number }) {
  const options = records(question.options);
  const required = question.is_required !== false;
  return <Card><div className="flex items-start gap-3"><StatusPill tone="neutral">{index + 1}</StatusPill><div className="flex-1"><h2 className="font-bold text-ink">{text(question.prompt)}</h2>{text(question.help_text) ? <p className="mt-1 text-sm text-muted">{text(question.help_text)}</p> : null}<div className="mt-4 grid gap-2">{options.length ? options.map((option) => <label key={text(option.id)} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40"><input type="radio" name={`question_${text(question.id)}`} value={text(option.id)} required={required} className="mt-0.5 size-4 accent-primary" /><span className="text-sm text-ink">{text(option.label)}</span></label>) : <Label>Resposta<Input name={`text_${text(question.id)}`} required={required} /></Label>}</div></div></div></Card>;
}

function Result({ result }: { result: unknown }) {
  const payload = result && typeof result === "object" && !Array.isArray(result) ? result as JsonRecord : {};
  const dimensions = records(payload.dimensions);
  return <div className="mt-5 grid gap-3 sm:grid-cols-2">{dimensions.map((dimension) => <div key={text(dimension.code)} className="rounded-xl bg-surface-muted p-4"><p className="text-sm font-semibold text-muted">{text(dimension.name)}</p><p className="mt-1 text-2xl font-black text-secondary">{number(dimension.score).toFixed(1)}</p></div>)}</div>;
}
