import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Circle, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAuthContext } from "@/lib/auth/context";
import type { ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";
import { statusLabel } from "@/lib/journey-runtime/navigation";
import { openJourneyActivityAction } from "./actions";

export const dynamic = "force-dynamic";

const activityTypeLabels: Record<string, string> = {
  text_activity: "Conteúdo",
  video_activity: "Vídeo",
  external_content: "Conteúdo externo",
  assessment_activity: "Avaliação",
  practice_activity: "Prática",
  content: "Conteúdo",
  assessment: "Avaliação",
  practice: "Prática"
};

export default async function JourneyOutlinePage({
  params,
}: {
  params: Promise<{ journeyInstanceId: string }>;
}) {
  const { journeyInstanceId } = await params;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  let outline: ParticipantJourneyOutline;
  try {
    outline = await getParticipantJourneyOutline(auth.identity.user_account_id, journeyInstanceId);
  } catch {
    notFound();
  }

  const overallPercent = Math.round(outline.progress * 100);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Sua jornada"
        title={outline.journey_title}
        description={outline.journey_description ?? "Acompanhe as trilhas e escolha qualquer atividade liberada para o seu caminho."}
      />

      <section className="grid gap-4 rounded-xl border border-border bg-surface p-6" aria-label="Resumo da jornada">
        <div className="flex items-center justify-between text-sm">
          <StatusPill tone={outline.journey_status === "completed" ? "success" : "info"}>{statusLabel(outline.journey_status)}</StatusPill>
          <span className="text-muted">Versão {outline.journey_version_number}</span>
        </div>
        <Progress value={overallPercent} label="Progresso da jornada" />
        <p className="text-sm text-muted">{outline.completed_required_steps} de {outline.total_required_steps} atividades obrigatórias concluídas.</p>
      </section>

      <Card className="border-primary/30 bg-primary-soft/40" aria-label="Progresso para desbloquear credenciais">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Concluir 100% da jornada libera selo e certificado</p>
            <p className="mt-1 text-xs text-muted">Seu progresso fica salvo a cada atividade concluída.</p>
          </div>
          <strong className="text-lg text-primary">{overallPercent}%</strong>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }} />
        </div>
      </Card>

      {outline.modules.length ? (
        <section className="grid gap-4" aria-labelledby="blocos-titulo">
          <div>
            <h2 id="blocos-titulo" className="text-xl font-semibold text-ink">Trilhas e atividades</h2>
            <p className="text-sm text-muted">Atividades marcadas como disponíveis podem ser iniciadas. Itens bloqueados dependem das regras publicadas da jornada.</p>
          </div>

          {outline.modules.map((module, moduleIndex) => {
            const hasOpenActivity = module.activities.some((activity) => activity.can_open);
            const modulePercent = module.activity_count ? Math.round((module.completed_count / module.activity_count) * 100) : 0;
            return (
              <details className="group rounded-xl border border-border bg-surface" key={module.module_key} open={hasOpenActivity || moduleIndex === 0}>
                <summary className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary text-sm font-bold text-white">
                    {String(moduleIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="grid gap-1">
                    <strong className="text-ink">{module.module_title}</strong>
                    <small className="text-muted">
                      {module.completed_count}/{module.activity_count} concluídas{module.estimated_minutes ? ` · ${module.estimated_minutes} min` : ""}
                    </small>
                  </span>
                  <span className="hidden w-32 sm:block">
                    <Progress value={modulePercent} tone="success" />
                  </span>
                </summary>
                <div className="border-t border-border p-5">
                  <p className="text-sm text-muted">{module.module_description}</p>
                  {module.path_name ? <p className="mt-1 text-sm text-muted">Trilha: {module.path_name}</p> : null}
                  <ol className="mt-4 grid gap-3">
                    {module.activities.map((activity) => (
                      <li
                        key={activity.step_instance_id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-border bg-surface-muted/60 p-4"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-primary" aria-hidden="true">
                          {activity.step_status === "completed" ? <Check size={16} /> : activity.can_open ? <ChevronRight size={16} /> : <Lock size={14} />}
                        </span>
                        <div>
                          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted">
                            <span>{activityTypeLabels[activity.activity_type] ?? activity.activity_type.replaceAll("_", " ")}</span>
                            <span>{activity.is_required ? "Obrigatória" : "Opcional"}</span>
                          </div>
                          <h3 className="mt-1 font-semibold text-ink">{activity.activity_title}</h3>
                          {activity.activity_description ? <p className="mt-1 text-sm text-muted">{activity.activity_description}</p> : null}
                          <p className="mt-1 text-xs text-muted">
                            {statusLabel(activity.step_status)}{activity.estimated_minutes ? ` · ${activity.estimated_minutes} min` : ""}
                          </p>
                        </div>
                        <div>
                          {activity.can_open ? (
                            <form action={openJourneyActivityAction}>
                              <input type="hidden" name="journey_instance_id" value={outline.journey_instance_id} />
                              <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
                              <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
                              <input type="hidden" name="step_status" value={activity.step_status} />
                              <input type="hidden" name="idempotency_key" value={randomUUID()} />
                              <Button variant="secondary" size="sm" type="submit">
                                {activity.can_start ? "Começar atividade" : "Continuar atividade"}
                              </Button>
                            </form>
                          ) : activity.step_status === "completed" ? (
                            <StatusPill tone="success">Concluída</StatusPill>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <Circle size={4} className="fill-current" /> Bloqueada
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            );
          })}
        </section>
      ) : (
        <EmptyState title="Atividades em preparação" tone="info">
          O caminho da jornada ainda não possui atividades atribuídas.
        </EmptyState>
      )}

      <div>
        <ButtonLink href="/empreendedor" variant="secondary">
          Voltar ao painel
        </ButtonLink>
      </div>
    </div>
  );
}
