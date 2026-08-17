import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronDown, Clock3, FileText, Headphones, PlayCircle, Route, Sparkles, Wrench } from "lucide-react";
import { ActivityWorkspaceFrame } from "@/components/activity-workspace-frame";
import { ParticipantActivityWorkspace, type ParticipantActivityQuery } from "@/components/participant-activity-workspace";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { interfaceTemplate, interfaceText, interfaceVisible } from "@/lib/interface-content/contracts";
import { getPublishedInterfaceContent } from "@/lib/interface-content/runtime";
import type { JourneyPresentation } from "@/lib/journey-runtime/contracts";
import type { JourneyOutlineActivity, ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { participantContentCopy } from "@/lib/journey-runtime/content-language";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";
import { openJourneyActivityAction } from "./actions";

export const dynamic = "force-dynamic";

type JourneyQuery = ParticipantActivityQuery & {
  conteudo?: string;
};

const heroToneClasses: Record<string, string> = {
  blue: "bg-primary",
  green: "bg-success",
  cyan: "bg-info",
  magenta: "bg-secondary",
  orange: "bg-warning",
};

const activityLabels: Record<string, string> = {
  video: "Vídeo",
  audio: "Áudio",
  podcast: "Podcast",
  article: "Leitura",
  document: "Documento",
  file: "Material",
  practical: "Atividade prática",
  practice: "Atividade prática",
  assessment: "Avaliação",
  quick_check: "Avaliação rápida",
};

function participantEyebrow(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim();
  const forbidden = ["jornada", "em", "destaque"].join(" ");
  return normalized.toLocaleLowerCase("pt-BR") === forbidden ? "Sua jornada" : normalized;
}

function activityIcon(activityType: string) {
  const props = { size: 19, "aria-hidden": true } as const;
  if (activityType === "video") return <PlayCircle {...props} />;
  if (activityType === "audio" || activityType === "podcast") return <Headphones {...props} />;
  if (["article", "document", "file"].includes(activityType)) return <FileText {...props} />;
  if (["practical", "practice"].includes(activityType)) return <Wrench {...props} />;
  if (["assessment", "quick_check"].includes(activityType)) return <CheckCircle2 {...props} />;
  return <BookOpen {...props} />;
}

function coverHref(outline: ParticipantJourneyOutline) {
  const presentation = outline.presentation ?? {};
  if (!presentation.featured_background_file_object_id && !presentation.card_background_file_object_id) return null;
  const variant = presentation.featured_background_file_object_id ? "featured" : "card";
  return `/api/journey-covers/${outline.journey_version_id}/${variant}`;
}

function Hero({ outline }: { outline: ParticipantJourneyOutline }) {
  const presentation: JourneyPresentation = outline.presentation ?? {};
  const tags = Array.isArray(presentation.tags) ? presentation.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())) : [];
  const tone = typeof presentation.tone === "string" ? presentation.tone : "blue";
  const cover = coverHref(outline);
  const eyebrow = participantEyebrow(presentation.eyebrow);
  const overallPercent = Math.round(outline.progress * 100);

  return (
    <header className={`relative min-h-[21rem] overflow-hidden rounded-[2rem] p-6 text-white shadow-lg sm:p-9 ${heroToneClasses[tone] ?? heroToneClasses.blue}`}>
      {cover ? (
        <>
          <img src={cover} alt={typeof presentation.featured_background_alt === "string" ? presentation.featured_background_alt : ""} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/10 max-sm:bg-black/45" aria-hidden="true" />
        </>
      ) : <div className="brand-dots-bg absolute inset-0 opacity-70" aria-hidden="true" />}
      <div className="relative z-10 grid min-h-[17rem] gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div className="max-w-3xl">
          {eyebrow ? <p className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-white backdrop-blur-sm"><Sparkles size={14} aria-hidden="true" /> {eyebrow}</p> : null}
          <h1 className={`display-font text-3xl text-white sm:text-5xl ${eyebrow ? "mt-5" : ""}`}>{outline.journey_title}</h1>
          {outline.journey_description ? <p className="mt-4 max-w-2xl text-sm leading-7 text-white/95 sm:text-base">{outline.journey_description}</p> : null}
          {tags.length ? <div className="mt-6 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">{tag}</span>)}</div> : null}
        </div>
        <section className="rounded-2xl border border-white/25 bg-black/25 p-5 backdrop-blur-sm" aria-label="Seu progresso nesta jornada">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-white/80">Seu progresso</p><p className="mt-1 text-sm text-white/95">{outline.completed_required_steps} de {outline.total_required_steps} conteúdos</p></div><strong className="text-3xl text-white">{overallPercent}%</strong></div>
          <Progress value={overallPercent} tone="success" className="mt-4 bg-white/25" />
        </section>
      </div>
    </header>
  );
}

function ActivityMetadata({ activity }: { activity: JourneyOutlineActivity }) {
  const label = activityLabels[activity.activity_type] ?? "Conteúdo";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">{activityIcon(activity.activity_type)} {label}</span>
      {activity.estimated_minutes ? <span className="inline-flex items-center gap-1.5"><Clock3 size={15} aria-hidden="true" /> {activity.estimated_minutes} min</span> : null}
      {!activity.is_required ? <StatusPill tone="neutral">Opcional</StatusPill> : null}
    </div>
  );
}

export default async function JourneyOutlinePage({
  params,
  searchParams,
}: {
  params: Promise<{ journeyInstanceId: string }>;
  searchParams: Promise<JourneyQuery>;
}) {
  const [{ journeyInstanceId }, query] = await Promise.all([params, searchParams]);
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  let outline: ParticipantJourneyOutline;
  try {
    outline = await getParticipantJourneyOutline(auth.identity.user_account_id, journeyInstanceId);
  } catch {
    notFound();
  }

  const selectedActivity = query.conteudo
    ? outline.modules.flatMap((module) => module.activities).find((activity) => activity.step_instance_id === query.conteudo && (activity.step_status === "completed" || activity.can_open || activity.can_start)) ?? null
    : null;

  const interfaceContent = await getPublishedInterfaceContent().catch(() => ({}));
  const firstIncompleteModuleIndex = outline.modules.findIndex((module) => module.completed_count < module.activity_count);
  const initiallyOpenModuleIndex = firstIncompleteModuleIndex >= 0 ? firstIncompleteModuleIndex : 0;

  return (
    <div className="mx-auto grid min-w-0 max-w-6xl gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {interfaceVisible(interfaceContent, "participant.journey.back") ? <ButtonLink href="/empreendedor/jornadas" variant="ghost" size="sm" className="w-fit">{interfaceText(interfaceContent, "participant.journey.back", "Voltar às jornadas")}</ButtonLink> : null}
      <Hero outline={outline} />

      {outline.modules.length ? (
        <section className="grid min-w-0 gap-5" aria-labelledby="trilhas-titulo">
          <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <p className="brand-kicker">Seu caminho de aprendizagem</p>
              <h2 id="trilhas-titulo" className="display-font mt-1 text-2xl text-secondary sm:text-3xl">{interfaceText(interfaceContent, "participant.journey.contents_title", participantContentCopy.journeyTitle)}</h2>
              {interfaceVisible(interfaceContent, "participant.journey.tracks_help") ? <p className="mt-1 text-sm text-muted">{interfaceText(interfaceContent, "participant.journey.contents_help", participantContentCopy.journeyHelp)}</p> : null}
            </div>
            <p className="text-sm font-semibold text-secondary">{outline.modules.length} {outline.modules.length === 1 ? "etapa" : "etapas"}</p>
          </div>

          <div className="grid min-w-0 gap-4">
            {outline.modules.map((module, moduleIndex) => {
              const required = module.metadata.is_required !== false;
              const moduleComplete = module.activity_count > 0 && module.completed_count === module.activity_count;
              return (
                <details className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" key={module.module_key} open={moduleIndex === initiallyOpenModuleIndex}>
                  <summary className="grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5 marker:content-none hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                    <span className={`grid size-11 place-items-center rounded-xl ${moduleComplete ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>{moduleComplete ? <CheckCircle2 size={21} aria-hidden="true" /> : <Route size={21} aria-hidden="true" />}</span>
                    <span className="grid min-w-0 gap-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-2"><strong className="min-w-0 break-words text-lg text-secondary">{module.module_title}</strong>{moduleComplete ? <StatusPill tone="success">{participantContentCopy.completed}</StatusPill> : null}{!required && interfaceVisible(interfaceContent, "participant.journey.optional") ? <StatusPill tone="neutral">{interfaceText(interfaceContent, "participant.journey.optional", "Opcional")}</StatusPill> : null}</span>
                      {module.module_description ? <span className="line-clamp-2 text-sm text-muted">{module.module_description}</span> : null}
                      <small className="text-sm font-medium text-muted">{interfaceTemplate(interfaceContent, "participant.journey.contents_progress_summary", participantContentCopy.progressSummary, { completed: module.completed_count, total: module.activity_count })}</small>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary"><span className="hidden sm:inline">{interfaceText(interfaceContent, "participant.journey.view_contents", participantContentCopy.viewContents)}</span><ChevronDown size={20} className="transition-transform duration-150 group-open:rotate-180" aria-hidden="true" /></span>
                  </summary>

                  <ol className="min-w-0 divide-y divide-border border-t border-border">
                    {module.activities.map((activity, activityIndex) => {
                      const completed = activity.step_status === "completed";
                      const canOpen = completed || activity.can_open || activity.can_start;
                      const actionLabel = completed
                        ? interfaceText(interfaceContent, "participant.journey.action_review_content", participantContentCopy.review)
                        : activity.can_start
                          ? interfaceText(interfaceContent, "participant.journey.action_start_content", participantContentCopy.start)
                          : canOpen
                            ? interfaceText(interfaceContent, "participant.journey.action_continue_content", participantContentCopy.continue)
                            : interfaceText(interfaceContent, "participant.journey.action_locked", participantContentCopy.locked);
                      return (
                        <li key={activity.step_instance_id} className="grid min-w-0 gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                          <span className={`grid size-9 place-items-center rounded-full text-sm font-black ${completed ? "bg-success-soft text-success" : "bg-surface-muted text-secondary"}`}>{completed ? <CheckCircle2 size={18} aria-hidden="true" /> : activityIndex + 1}</span>
                          <div className="min-w-0"><h3 className="break-words font-semibold text-secondary">{activity.activity_title}</h3>{activity.activity_description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{activity.activity_description}</p> : null}<ActivityMetadata activity={activity} /></div>
                          <form action={openJourneyActivityAction} className={typeof activity.metadata.continue_thumbnail_file_object_id === "string" ? "min-w-0 w-full sm:w-56" : "min-w-0"}>
                            <input type="hidden" name="journey_instance_id" value={outline.journey_instance_id} />
                            <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
                            <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
                            <input type="hidden" name="step_status" value={activity.step_status} />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            {typeof activity.metadata.continue_thumbnail_file_object_id === "string" ? (
                              <button type="submit" disabled={!canOpen} className="group relative block aspect-video w-full max-w-full overflow-hidden rounded-xl border border-border bg-surface-muted text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50">
                                <img src={`/api/activity-thumbnails/${activity.step_instance_id}`} alt={typeof activity.metadata.continue_thumbnail_alt === "string" ? activity.metadata.continue_thumbnail_alt : activity.activity_title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-sm font-bold text-white">{actionLabel}</span>
                              </button>
                            ) : (
                              <PendingSubmitButton pendingLabel="Abrindo…" variant={completed ? "secondary" : "primary"} size="sm" type="submit" disabled={!canOpen} className="w-full max-w-full sm:w-auto">{actionLabel}</PendingSubmitButton>
                            )}
                          </form>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState icon={<Route size={24} />} title={interfaceText(interfaceContent, "participant.journey.empty_title", "Conteúdos em preparação")} tone="info">{interfaceText(interfaceContent, "participant.journey.empty_body", "A equipe ainda está organizando os conteúdos desta jornada.")}</EmptyState>
      )}

      {selectedActivity ? (
        <section id="aula" className="min-w-0 scroll-mt-24" aria-label={`Aula aberta: ${selectedActivity.activity_title}`} data-inline-lesson>
          <ActivityWorkspaceFrame>
            <ParticipantActivityWorkspace
              actorUserAccountId={auth.identity.user_account_id}
              journeyInstanceId={journeyInstanceId}
              stepInstanceId={selectedActivity.step_instance_id}
              query={{
                comentario: query.comentario,
                pratica: query.pratica,
                codigo: query.codigo,
                avaliacao: query.avaliacao,
                utilidade: query.utilidade,
                conclusao: query.conclusao,
              }}
              embedded
            />
          </ActivityWorkspaceFrame>
        </section>
      ) : null}
    </div>
  );
}
