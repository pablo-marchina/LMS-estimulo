import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { Download, MessageCircle, Star, UploadCloud } from "lucide-react";
import { createActivityCommentAction, rateActivityUtilityAction } from "@/app/actions/journey";
import { ActivityContentProgress } from "@/components/activity-content-progress";
import { ContentAssetViewer } from "@/components/content-asset-viewer";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { QuickCheckPanel } from "@/components/quick-check-panel";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";
import { utilityRatingRuntime } from "@/lib/utility-rating/runtime";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const practiceStatus: Record<string, string> = { upload_pending: "Aguardando envio", awaiting_review: "Aguardando revisão", available: "Disponível", accepted: "Aceita", rejected: "Revisão solicitada", failed: "Falha no envio" };
const practiceErrors: Record<string, string> = {
  PRACTICE_FILE_REQUIRED: "Selecione um arquivo para enviar.",
  PRACTICE_CONTENT_TYPE_NOT_ALLOWED: "Esse tipo de arquivo não é permitido.",
  PRACTICE_FILE_EXTENSION_NOT_ALLOWED: "A extensão do arquivo não corresponde ao formato permitido.",
  PRACTICE_FILE_SIZE_INVALID: "O arquivo deve ter até 6 MB.",
  PRACTICE_SUBMISSION_LIMIT_REACHED: "O limite de envios desta atividade foi atingido.",
  PRACTICE_STORAGE_UPLOAD_FAILED: "Não foi possível armazenar o arquivo.",
  PRACTICE_UPLOAD_FAILED: "Não foi possível concluir o envio. Tente novamente.",
};

function fileSize(value: number | null): string | null {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ActivityPage({ params, searchParams }: {
  params: Promise<{ stepInstanceId: string }>;
  searchParams: Promise<{ journey?: string; comentario?: string; pratica?: string; codigo?: string; avaliacao?: string; utilidade?: string }>;
}) {
  const [{ stepInstanceId }, query] = await Promise.all([params, searchParams]);
  const journey = query.journey;
  if (!journey) notFound();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const [experience, commentResult, practiceResult, utilityRating] = await Promise.all([
    journeyRuntime.getParticipantExperience(auth.identity.user_account_id, journey),
    journeyRuntime.listActivityComments(auth.identity.user_account_id, stepInstanceId),
    practiceRuntime.listParticipant(auth.identity.user_account_id, stepInstanceId).catch(() => null),
    utilityRatingRuntime.get(auth.identity.user_account_id, stepInstanceId),
  ]);
  if (experience.state.s?.step_instance_id !== stepInstanceId || !experience.activity) notFound();

  const activity = experience.activity;
  const requiredAssets = activity.assets.filter((asset) => asset.is_required).map((asset) => ({ id: asset.id, completed: asset.progress.completed }));
  const assessment = experience.assessment;
  const maxAttempts = assessment?.max_attempts ?? null;
  const attemptsUsed = experience.state.q?.attempt_number ?? 0;
  const attemptInProgress = experience.state.q?.status === "in_progress";
  const attemptAvailable = maxAttempts === null || attemptInProgress || attemptsUsed < maxAttempts;
  const practice = practiceResult?.practice ?? null;
  const submissions = practiceResult?.submissions ?? [];
  const countedSubmissions = submissions.filter((item) => item.status !== "failed").length;
  const canUpload = practice !== null && (practice.max_submissions === null || countedSubmissions < practice.max_submissions);
  const practiceError = query.codigo ? practiceErrors[query.codigo] ?? practiceErrors.PRACTICE_UPLOAD_FAILED : null;

  return <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-5 sm:px-5 lg:px-7 lg:py-6">
    <PageHeader eyebrow="Atividade da jornada" title={activity.title} description={activity.description ?? "Assista ao conteúdo, verifique o aprendizado e aplique ao seu negócio."} className="mb-0 p-4 sm:p-5" />
    <JourneyProgressNav state={experience.state} current="activity" activityTitle={activity.title} estimatedMinutes={activity.estimated_minutes} />

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="grid min-w-0 gap-4">
        {activity.assets.length ? <section className="grid gap-3" id="conteudo" aria-labelledby="midias-titulo"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="brand-kicker">Conteúdo principal</p><h2 id="midias-titulo" className="display-font mt-1 text-xl text-secondary sm:text-2xl">Assista ou explore</h2></div><p className="max-w-xl text-xs leading-5 text-muted">O progresso é salvo durante o consumo. Materiais obrigatórios precisam chegar a 90% ou ser marcados como concluídos.</p></div><div className="grid gap-3">{activity.assets.map((asset) => <ContentAssetViewer key={asset.id} asset={asset} progressEndpoint={`/api/activity-assets/progress?step=${encodeURIComponent(stepInstanceId)}`} downloadHref={asset.file_object_id ? `/api/activity-assets/${asset.id}/download?step=${encodeURIComponent(stepInstanceId)}` : null} />)}</div></section> : <StatusPanel title="Aula sem mídia" tone="info">Use a verificação e a entrega prática disponíveis nesta atividade.</StatusPanel>}

        {query.avaliacao === "reprovada" || experience.state.q?.status === "failed" ? <StatusPanel title="Revise e tente novamente" tone="warning">A tentativa anterior não atingiu o critério. Reveja o conteúdo e faça uma nova tentativa.</StatusPanel> : null}
        <QuickCheckPanel journeyInstanceId={journey} stepInstanceId={stepInstanceId} idempotencyKey={randomUUID()} questions={assessment?.questions ?? []} passingScore={assessment?.passing_score ?? null} maxAttempts={maxAttempts} attemptsUsed={attemptsUsed} attemptAvailable={attemptAvailable} passed={Boolean(experience.state.q?.passed)} requiredAssets={requiredAssets} sectionsComplete />

        {practice ? <section className="grid gap-3" id="pratica" aria-labelledby="pratica-titulo"><div><p className="brand-kicker">Entrega prática</p><h2 id="pratica-titulo" className="display-font mt-1 text-xl text-secondary">Mostre como você aplicou</h2><p className="mt-1 text-xs leading-5 text-muted">Envie PDF, imagem, TXT ou DOCX de até 6 MB. O arquivo permanece privado e nunca é executado.</p></div>{query.pratica === "enviada" ? <StatusPanel title="Arquivo recebido" tone="success">A evidência foi registrada para revisão.</StatusPanel> : null}{query.pratica === "erro" ? <StatusPanel title="Envio não concluído" tone="warning">{practiceError}</StatusPanel> : null}{canUpload ? <Card className="grid gap-3 p-4"><form action="/api/practice-uploads" method="post" encType="multipart/form-data" className="grid gap-3"><input type="hidden" name="journey_instance_id" value={journey} /><input type="hidden" name="step_instance_id" value={stepInstanceId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label htmlFor="practice-file" className="grid gap-1.5 text-sm font-medium text-ink">Arquivo da prática<input id="practice-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-primary" /></label><label className="flex items-start gap-2 text-xs text-ink"><input type="checkbox" name="allow_public_use" className="mt-0.5 size-4 accent-primary" /><span>Autorizo o Estímulo a avaliar este material para possíveis estudos de caso. A autorização é opcional.</span></label>{practice.terms_version ? <p className="text-xs text-muted">Termos aplicáveis: {practice.terms_version}.</p> : null}<Button type="submit" size="sm" className="w-fit" icon={<UploadCloud size={15} />}>Enviar evidência</Button></form></Card> : <StatusPanel title="Limite de envios atingido" tone="info">Esta atividade não aceita novos arquivos no momento.</StatusPanel>}{submissions.length ? <div className="grid gap-2 sm:grid-cols-2">{submissions.map((submission) => <Card key={submission.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">Envio {submission.submission_number}</strong><StatusPill tone={submission.status === "accepted" ? "success" : submission.status === "rejected" ? "danger" : "neutral"}>{practiceStatus[submission.status] ?? submission.status}</StatusPill></div><p className="mt-2 truncate text-sm text-ink">{submission.original_filename ?? "Arquivo em preparação"}</p><div className="mt-1 flex flex-wrap gap-2 text-xs text-muted"><span>{submission.content_type ?? "Formato em validação"}</span>{fileSize(submission.size_bytes) ? <span>{fileSize(submission.size_bytes)}</span> : null}</div>{submission.review_feedback ? <p className="mt-2 rounded-lg bg-warning-soft p-2 text-xs text-warning"><strong>Retorno:</strong> {submission.review_feedback}</p> : null}{submission.can_download ? <Link href={`/api/practice-submissions/${submission.id}/download`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Download size={13} /> Baixar arquivo</Link> : null}</Card>)}</div> : <EmptyState title="Nenhuma evidência enviada" tone="info">Seu histórico aparecerá aqui.</EmptyState>}</section> : null}
      </main>

      <aside className="grid content-start gap-4 xl:sticky xl:top-20">
        <ActivityContentProgress completedSections={0} sectionTotal={0} assets={activity.assets.map((asset) => ({ id: asset.id, completed: asset.progress.completed }))} />
        <Card id="utilidade" aria-labelledby="utilidade-titulo" className="grid gap-3 border-accent-gold/50 bg-warning-soft/60 p-4">
          <div className="flex items-start gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-gold text-secondary"><Star size={18} fill="currentColor" /></span><div><h2 id="utilidade-titulo" className="font-black text-secondary">Como foi esta aula?</h2><p className="mt-1 text-xs leading-5 text-muted">A nota ajuda a melhorar o conteúdo e não interfere na conclusão.</p></div></div>
          {query.utilidade === "registrada" ? <StatusPanel title="Avaliação registrada" tone="success">Obrigado.</StatusPanel> : null}
          <form action={rateActivityUtilityAction} className="grid gap-3"><input type="hidden" name="journey_instance_id" value={journey} /><input type="hidden" name="step_instance_id" value={stepInstanceId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><fieldset><legend className="sr-only">Escolha sua nota</legend><div className="flex flex-wrap gap-1.5">{[1,2,3,4,5].map((rating) => <label key={rating} className="flex cursor-pointer items-center gap-1 rounded-full border border-accent-gold/50 bg-white px-2.5 py-1.5 text-xs font-bold has-checked:border-primary has-checked:bg-primary has-checked:text-white"><input type="radio" name="rating" value={rating} defaultChecked={utilityRating.rating === rating} required className="sr-only" /><Star size={13} fill="currentColor" />{rating}</label>)}</div></fieldset><Button variant="secondary" size="sm" type="submit" className="w-fit">{utilityRating.rating ? "Atualizar nota" : "Enviar nota"}</Button></form>
        </Card>
      </aside>
    </div>

    <section className="grid gap-3" id="comentarios" aria-labelledby="comentarios-titulo"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="brand-kicker">Troque experiências</p><h2 id="comentarios-titulo" className="display-font mt-1 text-xl text-secondary">Comentários da aula</h2></div><p className="max-w-xl text-xs leading-5 text-muted">Compartilhe uma aplicação, dúvida ou aprendizado sem publicar dados pessoais ou financeiros.</p></div>{query.comentario === "criado" ? <StatusPanel title="Comentário publicado" tone="success">Sua participação já está visível.</StatusPanel> : null}<div className="grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)]"><Card className="p-4"><form action={createActivityCommentAction} className="grid gap-3"><input type="hidden" name="journey_instance_id" value={journey} /><input type="hidden" name="step_instance_id" value={stepInstanceId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label htmlFor="activity-comment" className="text-sm font-medium text-ink">Novo comentário</label><Textarea id="activity-comment" name="body" minLength={1} maxLength={2000} rows={3} required placeholder="Conte o que você testou ou quer entender." /><div className="flex items-center justify-between gap-3"><span className="text-[11px] text-muted">Até 2.000 caracteres.</span><Button type="submit" size="sm" icon={<MessageCircle size={14} />}>Publicar</Button></div></form></Card>{commentResult.comments.length === 0 ? <EmptyState title="Nenhum comentário ainda" tone="info">Seja a primeira pessoa a participar.</EmptyState> : <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1" aria-live="polite">{commentResult.comments.map((comment) => <Card key={comment.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{comment.author_name}</strong>{comment.is_own ? <StatusPill tone="info">Você</StatusPill> : null}<time dateTime={comment.created_at} className="ml-auto text-[11px] text-muted">{dateFormatter.format(new Date(comment.created_at))}</time></div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{comment.body}</p></Card>)}</div>}</div></section>

    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><ButtonLink href={`/empreendedor/jornada/${journey}`} variant="secondary">Voltar à jornada</ButtonLink>{experience.state.q?.passed ? <ButtonLink href={`/empreendedor/resultado?journey=${journey}`}>Ver progresso da jornada</ButtonLink> : assessment?.questions.length ? <ButtonLink href="#verificacao">Ir para verificação rápida</ButtonLink> : <ButtonLink href="#conteudo" variant="secondary">Voltar ao conteúdo</ButtonLink>}</div>
  </div>;
}
