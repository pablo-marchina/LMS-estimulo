import { FileCheck2, FileUp, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { StatusPanel } from "@/components/status-panel";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const statusLabels: Record<string,string> = {
  draft:"Rascunho", submitted:"Enviada", processing:"Em correção por IA", ai_graded:"Corrigida pela IA",
  awaiting_human_review:"Aguardando revisão humana", corrected:"Corrigida", approved:"Aprovada", rejected:"Reprovada",
  returned:"Devolvida para ajuste", cancelled:"Cancelada", upload_pending:"Envio pendente", available:"Disponível", awaiting_review:"Aguardando revisão",
};

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function statusTone(status: string): "success" | "warning" | "info" | "neutral" { if (status === "approved" || status === "available") return "success"; if (["rejected","returned","cancelled","upload_pending"].includes(status)) return "warning"; if (["processing","awaiting_human_review","awaiting_review","submitted"].includes(status)) return "info"; return "neutral"; }

export default async function ParticipantSubmissionsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const [workspace, journeyResult] = await Promise.all([
    extensionsRuntime.participantWorkspace(auth.identity.user_account_id),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
  ]);

  const journeysWithActivity = journeyResult.journeys.filter((journey) => journey.s?.step_instance_id);
  const legacyGroups = (await Promise.all(journeysWithActivity.map(async (journey) => ({ journey, result: await practiceRuntime.listParticipant(auth.identity.user_account_id, journey.s!.step_instance_id).catch(() => null) })))).filter((group) => group.result?.submissions.length);

  return <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow="Avaliação" title="Minhas entregas" description="Envie respostas, arquivos e links para atividades ou conteúdos da biblioteca e acompanhe a correção por IA e humana." />
    {query.sucesso ? <StatusPanel title="Entrega recebida" tone="success">A tentativa foi registrada e encaminhada ao modo de correção configurado.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível enviar" tone="warning">Código: {query.erro}</StatusPanel> : null}

    {workspace.deliveries.length === 0 ? <EmptyState title="Nenhuma entrega disponível" tone="info">As atividades com entrega aparecerão aqui quando forem publicadas para você.</EmptyState> : <section className="grid gap-4">
      <div><p className="brand-kicker">Disponíveis agora</p><h2 className="display-font mt-1 text-2xl text-secondary">Atividades e conteúdos</h2></div>
      <div className="grid gap-5 lg:grid-cols-2">{workspace.deliveries.map((delivery) => <DeliveryCard key={text(delivery.id)} delivery={delivery} />)}</div>
    </section>}

    {legacyGroups.length ? <section className="grid gap-4"><div><p className="brand-kicker">Histórico compatível</p><h2 className="display-font mt-1 text-2xl text-secondary">Entregas do fluxo anterior</h2></div>{legacyGroups.map(({ journey, result }) => <Card key={journey.journey_instance_id}><h3 className="font-black text-secondary">{journey.journey_title ?? journey.journey_code}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result!.submissions.map((submission) => <article key={submission.id} className="rounded-xl border border-border p-3"><StatusPill tone={statusTone(submission.status)}>{statusLabels[submission.status] ?? submission.status}</StatusPill><p className="mt-2 truncate font-semibold text-ink">{submission.original_filename ?? "Arquivo enviado"}</p><p className="text-xs text-muted">{dateFormatter.format(new Date(submission.submitted_at))}</p>{submission.review_feedback ? <p className="mt-2 text-sm text-muted">{submission.review_feedback}</p> : null}</article>)}</div></Card>)}</section> : null}

    <div className="no-print flex items-center justify-between gap-3 border-t border-border pt-6"><ButtonLink href="/empreendedor" variant="secondary">Voltar ao painel</ButtonLink></div>
  </div>;
}

function DeliveryCard({ delivery }: { delivery: JsonRecord }) {
  const submissions = records(delivery.submissions);
  const latest = submissions[0];
  const allowed = Array.isArray(delivery.allowed_submission_types) ? delivery.allowed_submission_types.map(String) : ["text"];
  const attempts = delivery.max_attempts === null ? "Ilimitadas" : `${number(delivery.max_attempts)} tentativa(s)`;
  return <Card className="grid gap-4">
    <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FileUp size={20} /></span><div><h3 className="font-black text-ink">{text(delivery.title)}</h3><p className="text-sm text-muted">{text(delivery.target_title)} · {text(delivery.target_type) === "library" ? "Biblioteca" : "Jornada"}</p></div></div>{latest ? <StatusPill tone={statusTone(text(latest.status))}>{statusLabels[text(latest.status)] ?? text(latest.status)}</StatusPill> : null}</div>
    <p className="whitespace-pre-wrap text-sm text-muted">{text(delivery.instructions)}</p>
    <div className="grid grid-cols-2 gap-3 text-xs"><span className="rounded-lg bg-surface-muted p-2">{attempts}</span><span className="rounded-lg bg-surface-muted p-2">Correção: {text(delivery.grading_mode)}</span></div>
    {latest ? <LatestReview submission={latest} /> : null}
    <details className="rounded-xl border border-border" open={!latest}><summary className="cursor-pointer p-4 font-bold text-secondary">{latest ? "Enviar nova tentativa" : "Fazer entrega"}</summary><form action="/api/delivery-uploads" method="post" encType="multipart/form-data" className="grid gap-4 border-t border-border p-4"><input type="hidden" name="delivery_configuration_id" value={text(delivery.id)} />
      {allowed.includes("text") ? <Label>Resposta em texto<Textarea name="text_content" rows={8} placeholder="Escreva sua resposta..." /></Label> : null}
      {allowed.includes("external_link") ? <Label>Link externo<Input name="external_link" type="url" placeholder="https://..." /></Label> : null}
      {allowed.some((format) => !["text","external_link"].includes(format)) ? <Label>Arquivos<Input name="files" type="file" multiple /><span className="text-[11px] font-normal text-muted">Formatos aceitos: {allowed.filter((format) => !["text","external_link"].includes(format)).join(", ")}. Até {Math.round(number(delivery.max_file_size_bytes) / 1024 / 1024)} MB por arquivo.</span></Label> : null}
      <button type="submit" className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"><FileCheck2 size={17} />Enviar entrega</button>
    </form></details>
    {submissions.length ? <details className="rounded-xl bg-surface-muted"><summary className="cursor-pointer p-3 text-sm font-semibold text-secondary">Histórico de {submissions.length} tentativa(s)</summary><div className="grid gap-2 border-t border-border p-3">{submissions.map((submission) => <div key={text(submission.id)} className="rounded-lg bg-white p-3 text-sm"><div className="flex justify-between gap-3"><span>Tentativa {number(submission.attempt_number)}</span><StatusPill tone={statusTone(text(submission.status))}>{statusLabels[text(submission.status)] ?? text(submission.status)}</StatusPill></div>{submission.final_score !== null ? <p className="mt-2 font-bold text-secondary">Nota: {number(submission.final_score).toFixed(1)}</p> : null}{text(submission.final_feedback) ? <p className="mt-1 text-muted">{text(submission.final_feedback)}</p> : null}</div>)}</div></details> : null}
  </Card>;
}

function LatestReview({ submission }: { submission: JsonRecord }) {
  const reviews = records(submission.reviews);
  const ai = reviews.find((review) => review.review_type === "ai");
  return <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4"><div className="flex items-center gap-2 text-sm font-bold text-secondary"><Sparkles size={16} className="text-primary" />Retorno da correção</div>{submission.final_score !== null ? <p className="mt-2 text-2xl font-black text-secondary">{number(submission.final_score).toFixed(1)} / 100</p> : null}<p className="mt-2 text-sm text-muted">{text(submission.final_feedback) || text(ai?.feedback) || "Aguardando análise."}</p>{ai?.confidence !== undefined ? <p className="mt-2 text-xs text-muted">Confiança da IA: {number(ai.confidence).toFixed(2)}. Resultados de baixa confiança são enviados à revisão humana.</p> : null}</div>;
}
