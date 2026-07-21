import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
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
};

export default async function JourneyOutlinePage({
  params,
}: {
  params: Promise<{ journeyInstanceId: string }>;
}) {
  const { journeyInstanceId } = await params;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  let outline;
  try {
    outline = await getParticipantJourneyOutline(auth.identity.user_account_id, journeyInstanceId);
  } catch {
    notFound();
  }

  return <>
    <header className="page-heading">
      <p className="eyebrow">Sua trilha</p>
      <h1>{outline.journey_title}</h1>
      <p>{outline.journey_description ?? "Acompanhe os blocos e escolha qualquer atividade liberada para o seu caminho."}</p>
    </header>

    <section className="journey-outline-summary card stack" aria-label="Resumo da jornada">
      <div className="card-meta">
        <span className="status-pill">{statusLabel(outline.journey_status)}</span>
        <span>Versão {outline.journey_version_number}</span>
      </div>
      <ProgressMeter value={outline.progress} label="Progresso da jornada" />
      <p className="metadata">{outline.completed_required_steps} de {outline.total_required_steps} atividades obrigatórias concluídas.</p>
    </section>

    {outline.modules.length ? <section className="journey-outline stack stack--large" aria-labelledby="blocos-titulo">
      <div>
        <p className="eyebrow">Conteúdo da jornada</p>
        <h2 id="blocos-titulo">Blocos e atividades</h2>
        <p className="support-note">Atividades marcadas como disponíveis podem ser iniciadas em qualquer ordem. Itens bloqueados dependem das regras publicadas da jornada.</p>
      </div>

      {outline.modules.map((module, moduleIndex) => {
        const hasOpenActivity = module.activities.some((activity) => activity.can_open);
        return <details className="journey-module" key={module.module_key} open={hasOpenActivity || moduleIndex === 0}>
          <summary>
            <span className="journey-module-index">{String(moduleIndex + 1).padStart(2, "0")}</span>
            <span className="journey-module-title"><strong>{module.module_title}</strong><small>{module.completed_count}/{module.activity_count} concluídas{module.estimated_minutes ? ` · ${module.estimated_minutes} min` : ""}</small></span>
            <span className="journey-module-progress" aria-label={`${module.completed_count} de ${module.activity_count} atividades concluídas`}><span style={{ width: `${module.activity_count ? Math.round(module.completed_count / module.activity_count * 100) : 0}%` }} /></span>
          </summary>
          <div className="journey-module-body">
            <p>{module.module_description}</p>
            {module.path_name ? <p className="metadata">Caminho: {module.path_name}</p> : null}
            <ol className="journey-activity-list">
              {module.activities.map((activity) => <li className={`journey-activity journey-activity--${activity.step_status}`} key={activity.step_instance_id}>
                <span className="journey-activity-state" aria-hidden="true">{activity.step_status === "completed" ? "✓" : activity.can_open ? "→" : "•"}</span>
                <div className="journey-activity-copy">
                  <div className="card-meta"><span>{activityTypeLabels[activity.activity_type] ?? activity.activity_type.replaceAll("_", " ")}</span>{activity.is_required ? <span>Obrigatória</span> : <span>Opcional</span>}</div>
                  <h3>{activity.activity_title}</h3>
                  {activity.activity_description ? <p>{activity.activity_description}</p> : null}
                  <p className="metadata">{statusLabel(activity.step_status)}{activity.estimated_minutes ? ` · ${activity.estimated_minutes} min` : ""}</p>
                </div>
                <div className="journey-activity-action">
                  {activity.can_open ? <form action={openJourneyActivityAction}>
                    <input type="hidden" name="journey_instance_id" value={outline.journey_instance_id} />
                    <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
                    <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
                    <input type="hidden" name="step_status" value={activity.step_status} />
                    <input type="hidden" name="idempotency_key" value={randomUUID()} />
                    <button className="button button--secondary" type="submit">{activity.can_start ? "Começar" : "Continuar"}</button>
                  </form> : activity.step_status === "completed" ? <span className="status-pill">Concluída</span> : <span className="metadata">Bloqueada</span>}
                </div>
              </li>)}
            </ol>
          </div>
        </details>;
      })}
    </section> : <StatusPanel title="Atividades em preparação" tone="info"><p>O caminho da jornada ainda não possui atividades atribuídas.</p></StatusPanel>}

    <div className="page-actions"><Link className="button button--secondary" href="/empreendedor">Voltar ao painel</Link></div>
  </>;
}
