import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { Award, Check, ChevronRight, Clock3, PlayCircle, Route, Sparkles } from "lucide-react";
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
  text_activity: "Leitura guiada",
  video_activity: "Vídeo",
  external_content: "Conteúdo externo",
  assessment_activity: "Verificação",
  practice_activity: "Prática",
  content: "Conteúdo",
  assessment: "Avaliação",
  practice: "Prática",
};

const trackTones = [
  "border-brand-cyan/45 bg-info-soft/65",
  "border-brand-magenta/35 bg-primary-soft/55",
  "border-brand-green/45 bg-success-soft/65",
  "border-accent-gold/60 bg-warning-soft/65",
];

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

  const overallPercent = Math.round(outline.progress * 100);
  const tags = Array.isArray(outline.presentation?.tags) ? outline.presentation.tags : [];

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow={typeof outline.presentation?.eyebrow === "string" ? outline.presentation.eyebrow : "Sua jornada"}
        title={outline.journey_title}
        description={outline.journey_description ?? "Escolha uma trilha e abra qualquer atividade no momento em que ela fizer sentido para você."}
      />

      <section className="brand-journey-overview relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-primary p-6 text-white shadow-lg sm:p-8" aria-label="Resumo da jornada">
        <div className="absolute -right-9 -top-10 size-36 rounded-full border-[24px] border-brand-cyan/25" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="expressive" className="!bg-white/15 !text-white">{statusLabel(outline.journey_status)}</StatusPill>
              {tags.map((tag) => <span key={tag} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{tag}</span>)}
            </div>
            <h2 className="display-font mt-5 text-3xl">Aprenda na ordem que funciona para você</h2>
            <p className="mt-3 max-w-3xl leading-7 text-white/80">Todas as aulas estão disponíveis. As trilhas obrigatórias contam para a formação principal; as opcionais ampliam sua prática sem impedir o acesso aos demais conteúdos.</p>
          </div>
          <div className="min-w-56 rounded-2xl bg-white p-5 text-secondary shadow-md">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Progresso geral</p>
            <p className="display-font mt-2 text-4xl">{overallPercent}%</p>
            <p className="mt-1 text-xs text-muted">{outline.completed_required_steps} de {outline.total_required_steps} atividades obrigatórias</p>
          </div>
        </div>
        <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-brand-green transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }} /></div>
      </section>

      <Card className="brand-recognition-strip !border-accent-gold/60 !bg-warning-soft" aria-label="Reconhecimento da jornada">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-gold text-secondary"><Award size={21} /></span><div><p className="font-black text-secondary">O que esta jornada pode liberar</p><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Selos e certificados são concedidos conforme os marcos configurados pela equipe Estímulo. Você pode acompanhar os critérios antes de concluir cada caminho.</p></div></div>
          <ButtonLink href="/empreendedor/conquistas" variant="secondary" size="sm">Ver reconhecimentos</ButtonLink>
        </div>
      </Card>

      {outline.modules.length ? (
        <section className="grid gap-5" aria-labelledby="trilhas-titulo">
          <div><p className="brand-kicker">Seu mapa de aprendizagem</p><h2 id="trilhas-titulo" className="display-font mt-1 text-3xl text-secondary">Trilhas e atividades</h2><p className="mt-2 text-sm text-muted">Abra qualquer aula, alterne entre trilhas e retome exatamente onde parou.</p></div>

          {outline.modules.map((module, moduleIndex) => {
            const modulePercent = module.activity_count ? Math.round((module.completed_count / module.activity_count) * 100) : 0;
            const required = module.metadata.is_required !== false;
            return (
              <details className={`group overflow-hidden rounded-[1.5rem] border shadow-sm ${trackTones[moduleIndex % trackTones.length]}`} key={module.module_key} open={moduleIndex < 2}>
                <summary className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 bg-white/75 p-5 marker:content-none transition hover:bg-white [&::-webkit-details-marker]:hidden sm:p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary text-sm font-black text-white shadow-sm">{String(moduleIndex + 1).padStart(2, "0")}</span>
                  <span className="grid gap-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-lg text-secondary">{module.module_title}</strong><StatusPill tone={required ? "info" : "neutral"}>{required ? "Formação principal" : "Trilha opcional"}</StatusPill></span><small className="text-muted">{module.completed_count}/{module.activity_count} concluídas · todas disponíveis</small></span>
                  <span className="hidden w-32 sm:block"><Progress value={modulePercent} tone="success" /></span>
                </summary>
                <div className="border-t border-white/70 p-5 sm:p-6">
                  <p className="max-w-4xl text-sm leading-6 text-muted">{module.module_description}</p>
                  <ol className="mt-5 grid gap-3 lg:grid-cols-2">
                    {module.activities.map((activity) => (
                      <li key={activity.step_instance_id} className="brand-float-card flex min-h-48 flex-col rounded-2xl border border-white bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${activity.step_status === "completed" ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>{activity.step_status === "completed" ? <Check size={17} /> : <PlayCircle size={18} />}</span><StatusPill tone={activity.step_status === "completed" ? "success" : "info"}>{activity.step_status === "completed" ? "Concluída" : "Disponível"}</StatusPill></div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted"><span>{activityTypeLabels[activity.activity_type] ?? activity.activity_type.replaceAll("_", " ")}</span><span>•</span><span>{activity.is_required ? "Obrigatória" : "Opcional"}</span>{activity.estimated_minutes ? <><span>•</span><span className="inline-flex items-center gap-1"><Clock3 size={12} /> {activity.estimated_minutes} min</span></> : null}</div>
                        <h3 className="mt-2 font-black text-secondary">{activity.activity_title}</h3>
                        {activity.activity_description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{activity.activity_description}</p> : null}
                        <form action={openJourneyActivityAction} className="mt-auto pt-5">
                          <input type="hidden" name="journey_instance_id" value={outline.journey_instance_id} />
                          <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
                          <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
                          <input type="hidden" name="step_status" value={activity.step_status} />
                          <input type="hidden" name="idempotency_key" value={randomUUID()} />
                          <Button variant={activity.step_status === "completed" ? "secondary" : "primary"} size="sm" type="submit" icon={<ChevronRight size={15} />}>{activity.step_status === "completed" ? "Rever atividade" : activity.can_start ? "Começar atividade" : "Continuar atividade"}</Button>
                        </form>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            );
          })}
        </section>
      ) : <EmptyState icon={<Route size={24} />} title="Atividades em preparação" tone="info">A equipe ainda está organizando os conteúdos desta jornada.</EmptyState>}

      <div className="flex flex-wrap gap-3"><ButtonLink href="/empreendedor/jornadas" variant="secondary">Explorar outras jornadas</ButtonLink><ButtonLink href="/empreendedor" variant="ghost" icon={<Sparkles size={15} />}>Voltar ao início</ButtonLink></div>
    </div>
  );
}