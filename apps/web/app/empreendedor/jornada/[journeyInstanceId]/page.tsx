import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { ChevronDown, Route } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth/context";
import { interfaceTemplate, interfaceText, interfaceVisible } from "@/lib/interface-content/contracts";
import { getPublishedInterfaceContent } from "@/lib/interface-content/runtime";
import type { ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";
import { openJourneyActivityAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function JourneyOutlinePage({ params }: { params: Promise<{ journeyInstanceId: string }> }) {
  const { journeyInstanceId } = await params;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  let outline: ParticipantJourneyOutline;
  try {
    outline = await getParticipantJourneyOutline(auth.identity.user_account_id, journeyInstanceId);
  } catch {
    notFound();
  }
  const interfaceContent = await getPublishedInterfaceContent().catch(() => ({}));
  const overallPercent = Math.round(outline.progress * 100);
  const firstIncompleteModuleIndex = outline.modules.findIndex((module) => module.completed_count < module.activity_count);
  const initiallyOpenModuleIndex = firstIncompleteModuleIndex >= 0 ? firstIncompleteModuleIndex : 0;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="grid gap-4">
        {interfaceVisible(interfaceContent, "participant.journey.back") ? <ButtonLink href="/empreendedor" variant="ghost" size="sm" className="w-fit">{interfaceText(interfaceContent, "participant.journey.back", "Voltar ao início")}</ButtonLink> : null}

        <div>
          {interfaceVisible(interfaceContent, "participant.journey.eyebrow") ? <p className="text-sm font-semibold text-primary">{interfaceText(interfaceContent, "participant.journey.eyebrow", "Sua jornada")}</p> : null}
          <h1 className="display-font mt-1 text-3xl text-secondary sm:text-4xl">{outline.journey_title}</h1>
          {outline.journey_description ? <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">{outline.journey_description}</p> : null}
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5" aria-label={interfaceText(interfaceContent, "participant.journey.progress_title", "Seu progresso")}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-semibold text-secondary">{interfaceText(interfaceContent, "participant.journey.progress_title", "Seu progresso")}</h2>
              <p className="mt-1 text-sm text-muted">{interfaceTemplate(interfaceContent, "participant.journey.progress_summary", "{completed} de {total} atividades concluídas", { completed: outline.completed_required_steps, total: outline.total_required_steps })}</p>
            </div>
            <strong className="text-2xl text-secondary">{overallPercent}%</strong>
          </div>
          <Progress value={overallPercent} tone="success" className="mt-4" />
        </section>
      </header>

      {outline.modules.length ? (
        <section className="grid gap-4" aria-labelledby="trilhas-titulo">
          <div>
            <h2 id="trilhas-titulo" className="display-font text-2xl text-secondary sm:text-3xl">{interfaceText(interfaceContent, "participant.journey.tracks_title", "Escolha uma trilha")}</h2>
            {interfaceVisible(interfaceContent, "participant.journey.tracks_help") ? <p className="mt-1 text-sm text-muted">{interfaceText(interfaceContent, "participant.journey.tracks_help", "Abra uma trilha para ver as atividades.")}</p> : null}
          </div>

          <div className="grid gap-3">
            {outline.modules.map((module, moduleIndex) => {
              const required = module.metadata.is_required !== false;
              return (
                <details className="group overflow-hidden rounded-2xl border border-border bg-surface" key={module.module_key} open={moduleIndex === initiallyOpenModuleIndex}>
                  <summary className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 p-5 marker:content-none hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                    <span className="grid gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-lg text-secondary">{module.module_title}</strong>
                        {!required && interfaceVisible(interfaceContent, "participant.journey.optional") ? <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-muted">{interfaceText(interfaceContent, "participant.journey.optional", "Opcional")}</span> : null}
                      </span>
                      <small className="text-sm text-muted">{interfaceTemplate(interfaceContent, "participant.journey.progress_summary", "{completed} de {total} atividades concluídas", { completed: module.completed_count, total: module.activity_count })}</small>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary"><span className="hidden sm:inline">{interfaceText(interfaceContent, "participant.journey.view_activities", "Ver atividades")}</span><ChevronDown size={20} className="transition-transform duration-150 group-open:rotate-180" aria-hidden="true" /></span>
                  </summary>

                  <ol className="divide-y divide-border border-t border-border">
                    {module.activities.map((activity) => {
                      const completed = activity.step_status === "completed";
                      const actionLabel = completed
                        ? interfaceText(interfaceContent, "participant.journey.action_review", "Rever atividade")
                        : activity.can_start
                          ? interfaceText(interfaceContent, "participant.journey.action_start", "Começar atividade")
                          : interfaceText(interfaceContent, "participant.journey.action_continue", "Continuar atividade");
                      return (
                        <li key={activity.step_instance_id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
                          <div className="min-w-0"><h3 className="font-semibold text-secondary">{activity.activity_title}</h3><p className="mt-1 text-sm text-muted">{completed ? interfaceText(interfaceContent, "participant.journey.completed", "Concluída") : interfaceText(interfaceContent, "participant.journey.available", "Disponível")}</p></div>
                          <form action={openJourneyActivityAction}>
                            <input type="hidden" name="journey_instance_id" value={outline.journey_instance_id} />
                            <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
                            <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
                            <input type="hidden" name="step_status" value={activity.step_status} />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            <Button variant={completed ? "secondary" : "primary"} size="sm" type="submit" className="w-full sm:w-auto">{actionLabel}</Button>
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
        <EmptyState icon={<Route size={24} />} title={interfaceText(interfaceContent, "participant.journey.empty_title", "Atividades em preparação")} tone="info">{interfaceText(interfaceContent, "participant.journey.empty_body", "A equipe ainda está organizando os conteúdos desta jornada.")}</EmptyState>
      )}
    </div>
  );
}
