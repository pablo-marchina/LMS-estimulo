import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { CheckCircle2, Copy, Download, MessageCircle, Sparkles, Star, UploadCloud } from "lucide-react";
import { acknowledgeActivityAction, createActivityCommentAction, rateActivityUtilityAction } from "@/app/actions/journey";
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

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }

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
  const accepted = experience.state.s.accepted_sections;
  const sectionTotal = activity.sections.length;
  const sectionsComplete = sectionTotal === 0 || accepted >= sectionTotal;
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

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Atividade da jornada" title={activity.title} description={activity.description ?? "Explore o conteúdo, aplique ao seu contexto e faça a verificação rápida ao final."} />
      <JourneyProgressNav state={experience.state} current="activity" activityTitle={activity.title} estimatedMinutes={activity.estimated_minutes} />
      <ActivityContentProgress completedSections={accepted} sectionTotal={sectionTotal} assets={activity.assets.map((asset) => ({ id: asset.id, completed: asset.progress.completed }))} />

      {activity.assets.length ? (
        <section className="grid gap-4" aria-labelledby="midias-titulo">
          <div><p className="brand-kicker">Assista, ouça ou explore</p><h2 id="midias-titulo" className="display-font mt-1 text-2xl text-secondary">Conteúdos desta atividade</h2><p className="mt-2 text-sm text-muted">Seu progresso é salvo enquanto você consome os materiais. Conteúdos obrigatórios precisam chegar a 90% ou ser marcados como vistos.</p></div>
          {activity.assets.map((asset) => <ContentAssetViewer key={asset.id} asset={asset} progressEndpoint={`/api/activity-assets/progress?step=${encodeURIComponent(stepInstanceId)}`} downloadHref={asset.file_object_id ? `/api/activity-assets/${asset.id}/download?step=${encodeURIComponent(stepInstanceId)}` : null} />)}
        </section>
      ) : null}

      {activity.sections.length ? (
        <form action={acknowledgeActivityAction} className="grid gap-4" id="conteudo">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <div><p className="brand-kicker">Leitura guiada</p><h2 className="display-font mt-1 text-2xl text-secondary">Ideias essenciais</h2></div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activity.sections.map((section, index) => {
              const alreadyAccepted = index < accepted;
              return <Card key={section.code} className={`brand-float-card ${alreadyAccepted ? "border-success/30 bg-success-soft/45" : ""}`}>
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Parte {index + 1}</p>{alreadyAccepted ? <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><CheckCircle2 size={14} /> Confirmada</span> : null}</div>
                <h3 className="mt-2 text-lg font-black text-secondary">{text(section.heading) ?? text(section.title) ?? section.code}</h3>
                {text(section.body) ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/90">{text(section.body)}</p> : null}
                {!alreadyAccepted ? <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl bg-primary-soft/60 p-3 text-sm text-ink"><input type="checkbox" name={`section_${section.code}`} className="mt-0.5 size-4 accent-primary" /><span>Li, compreendi e consigo relacionar esta parte à atividade.</span></label> : null}
              </Card>;
            })}
          </div>
          {accepted < sectionTotal ? <Button type="submit" className="w-fit">Registrar partes selecionadas</Button> : null}
        </form>
      ) : null}

      {activity.prompts.length ? (
        <section className="grid gap-4" aria-labelledby="prompts-titulo">
          <div><p className="brand-kicker">Coloque em prática</p><h2 id="prompts-titulo" className="display-font mt-1 text-2xl text-secondary">Prompts para adaptar ao seu negócio</h2><p className="mt-2 text-sm text-muted">Substitua os campos entre colchetes, não inclua dados sensíveis e revise a resposta antes de usar.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">{activity.prompts.map((prompt, index) => <Card key={`${prompt.title}-${index}`} className="brand-accent-card"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-magenta/15 text-primary"><Sparkles size={18} /></span><div><h3 className="font-black text-secondary">{prompt.title}</h3><p className="mt-2 whitespace-pre-line rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink">{prompt.text}</p><span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><Copy size={13} /> Selecione e copie para personalizar</span></div></div></Card>)}</div>
        </section>
      ) : null}

      <Card id="utilidade" aria-labelledby="utilidade-titulo" className="brand-rating-card grid gap-4 border-accent-gold/50 bg-warning-soft/60">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-gold text-secondary"><Star size={21} fill="currentColor" /></span><div><h2 id="utilidade-titulo" className="text-lg font-black text-secondary">Como foi esta aula?</h2><p className="mt-1 text-sm text-muted">Sua nota de 1 a 5 estrelas ajuda a equipe a melhorar conteúdo, exemplos e ritmo. Ela não interfere em pontos, conclusão ou crédito.</p></div></div>
        {query.utilidade === "registrada" ? <StatusPanel title="Avaliação registrada" tone="success">Obrigado. Você pode atualizar sua nota quando quiser.</StatusPanel> : null}
        <form action={rateActivityUtilityAction} className="grid gap-3">
          <input type="hidden" name="journey_instance_id" value={journey} /><input type="hidden" name="step_instance_id" value={stepInstanceId} /><input type="hidden" name="idempotency_key" value={randomUUID()} />
          <fieldset><legend className="mb-2 text-sm font-medium text-ink">Escolha sua nota</legend><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((rating) => <label key={rating} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-accent-gold/50 bg-white px-3.5 py-2 text-sm font-bold transition hover:-translate-y-0.5 has-checked:border-primary has-checked:bg-primary has-checked:text-white"><input type="radio" name="rating" value={rating} defaultChecked={utilityRating.rating === rating} required className="sr-only" /><Star size={15} fill="currentColor" />{rating}</label>)}</div></fieldset>
          <Button variant="secondary" type="submit" className="w-fit">{utilityRating.rating ? "Atualizar nota" : "Enviar nota"}</Button>
          {utilityRating.rating ? <p className="text-xs text-muted">Nota atual: {utilityRating.rating}/5 · revisão {utilityRating.revision}.</p> : null}
        </form>
      </Card>

      {query.avaliacao === "reprovada" || experience.state.q?.status === "failed" ? <StatusPanel title="Revise e tente novamente" tone="warning">A tentativa anterior não atingiu o critério da atividade. Releia os pontos principais e faça uma nova tentativa.</StatusPanel> : null}
      <QuickCheckPanel journeyInstanceId={journey} stepInstanceId={stepInstanceId} idempotencyKey={randomUUID()} questions={assessment?.questions ?? []} passingScore={assessment?.passing_score ?? null} maxAttempts={maxAttempts} attemptsUsed={attemptsUsed} attemptAvailable={attemptAvailable} passed={Boolean(experience.state.q?.passed)} requiredAssets={requiredAssets} sectionsComplete={sectionsComplete} />

      {practice ? (
        <section className="grid gap-4" id="pratica" aria-labelledby="pratica-titulo">
          <div><p className="brand-kicker">Entrega prática</p><h2 id="pratica-titulo" className="display-font mt-1 text-2xl text-secondary">Mostre como você aplicou</h2><p className="mt-2 text-sm text-muted">Envie PDF, imagem, TXT ou DOCX de até 6 MB. O arquivo permanece privado e passa por validações de formato, tamanho, hash e autorização.</p></div>
          {query.pratica === "enviada" ? <StatusPanel title="Arquivo recebido" tone="success">A evidência foi registrada e está disponível para a revisão aplicável.</StatusPanel> : null}
          {query.pratica === "erro" ? <StatusPanel title="Envio não concluído" tone="warning">{practiceError}</StatusPanel> : null}
          {canUpload ? <Card className="grid gap-4"><form action="/api/practice-uploads" method="post" encType="multipart/form-data" className="grid gap-4"><input type="hidden" name="journey_instance_id" value={journey} /><input type="hidden" name="step_instance_id" value={stepInstanceId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label htmlFor="practice-file" className="grid gap-1.5 text-sm font-medium text-ink">Arquivo da prática<input id="practice-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-primary" /></label><label className="flex items-start gap-2.5 text-sm text-ink"><input type="checkbox" name="allow_public_use" className="mt-0.5 size-4 accent-primary" /><span>Autorizo o Estímulo a avaliar este material para possíveis estudos de caso e evidências de impacto. Esta autorização é opcional.</span></label>{practice.terms_version ? <p className="text-xs text-muted">Termos aplicáveis: {practice.terms_version}.</p> : null}<Button type="submit" className="w-fit" icon={<UploadCloud size={16} />}>Enviar evidência</Button></form></Card> : <StatusPanel title="Limite de envios atingido" tone="info">Esta atividade não aceita novos arquivos no momento.</StatusPanel>}
          {submissions.length === 0 ? <EmptyState title="Nenhuma evidência enviada" tone="info">Seu histórico de envios aparecerá aqui.</EmptyState> : <div className="grid gap-3">{submissions.map((submission) => <Card key={submission.id}><div className="mb-2 flex flex-wrap items-center gap-2"><strong className="text-ink">Envio {submission.submission_number}</strong><StatusPill tone={submission.status === "accepted" ? "success" : submission.status === "rejected" ? "danger" : "neutral"}>{practiceStatus[submission.status] ?? submission.status}</StatusPill><time dateTime={submission.submitted_at} className="ml-auto text-xs text-muted">{dateFormatter.format(new Date(submission.submitted_at))}</time></div><p className="text-sm text-ink">{submission.original_filename ?? "Arquivo em preparação"}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span>{submission.content_type ?? "Formato em validação"}</span>{fileSize(submission.size_bytes) ? <span>{fileSize(submission.size_bytes)}</span> : null}<span>{submission.allow_public_use ? "Uso autorizado" : "Uso público não autorizado"}</span></div>{submission.review_feedback ? <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning"><strong>Retorno da revisão:</strong> {submission.review_feedback}</p> : null}{submission.can_download ? <Link href={`/api/practice-submissions/${submission.id}/download`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Download size={14} /> Baixar arquivo</Link> : null}</Card>)}</div>}
        </section>
      ) : null}

      <section className="grid gap-4" id="comentarios" aria-labelledby="comentarios-titulo">
        <div><p className="brand-kicker">Troque experiências</p><h2 id="comentarios-titulo" className="display-font mt-1 text-2xl text-secondary">Comentários da aula</h2><p className="mt-2 text-sm text-muted">Compartilhe uma aplicação, dúvida ou aprendizado. Não publique dados pessoais, senhas ou informações financeiras.</p></div>
        {query.comentario === "criado" ? <StatusPanel title="Comentário publicado" tone="success">Sua participação já está visível nesta aula.</StatusPanel> : null}
        <Card className="grid gap-3"><form action={createActivityCommentAction} className="grid gap-3"><input type="hidden" name="journey_instance_id" value={journey} /><input type="hidden" name="step_instance_id" value={stepInstanceId} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><label htmlFor="activity-comment" className="text-sm font-medium text-ink">Escreva seu comentário</label><Textarea id="activity-comment" name="body" minLength={1} maxLength={2000} rows={4} required placeholder="Conte o que você testou, o que mudou e o que ainda quer entender." /><div className="flex items-center justify-between gap-4"><span className="text-xs text-muted">Máximo de 2.000 caracteres.</span><Button type="submit" size="sm" icon={<MessageCircle size={15} />}>Publicar comentário</Button></div></form></Card>
        {commentResult.comments.length === 0 ? <EmptyState title="Nenhum comentário ainda" tone="info">Seja a primeira pessoa a participar desta aula.</EmptyState> : <div className="grid gap-3" aria-live="polite">{commentResult.comments.map((comment) => <Card key={comment.id}><div className="mb-2 flex flex-wrap items-center gap-2"><strong className="text-ink">{comment.author_name}</strong>{comment.is_own ? <StatusPill tone="info">Você</StatusPill> : null}<time dateTime={comment.created_at} className="ml-auto text-xs text-muted">{dateFormatter.format(new Date(comment.created_at))}</time></div><p className="whitespace-pre-line text-sm leading-6 text-ink">{comment.body}</p></Card>)}</div>}
      </section>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"><ButtonLink href={`/empreendedor/jornada/${journey}`} variant="secondary">Voltar à jornada</ButtonLink>{experience.state.q?.passed ? <ButtonLink href={`/empreendedor/resultado?journey=${journey}`}>Ver progresso da jornada</ButtonLink> : assessment?.questions.length ? <ButtonLink href="#verificacao">Ir para verificação rápida</ButtonLink> : <ButtonLink href="#conteudo" variant="secondary">Voltar ao conteúdo</ButtonLink>}</div>
    </div>
  );
}