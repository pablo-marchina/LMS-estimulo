import "server-only";

const IDS = {
  actor: "11111111-1111-4111-8111-111111111111",
  entrepreneur: "22222222-2222-4222-8222-222222222222",
  organization: "33333333-3333-4333-8333-333333333333",
  journeyVersion: "44444444-4444-4444-8444-444444444444",
  journey: "55555555-5555-4555-8555-555555555555",
  step: "88888888-8888-4888-8888-888888888888",
  activityVersion: "99999999-9999-4999-8999-999999999999",
} as const;

export type SyntheticSupplementalResult =
  | { handled: false }
  | { handled: true; value: unknown };

export function syntheticSupplementalRpc(name: string, args: Record<string, unknown>): SyntheticSupplementalResult {
  const actor = String(args.p_actor_user_account_id ?? "");
  if (actor && actor !== IDS.actor) throw new Error("FORBIDDEN");

  if (name === "get_participant_engagement_hub") {
    return {
      handled: true,
      value: {
        entrepreneur_id: IDS.entrepreneur,
        preferred_name: "Participante E2E",
        email: "e2e@estimulo.org",
        announcements: [{
          id: "15000000-0000-4000-8000-000000000001",
          title: "Bem-vindo à experiência Estímulo",
          body: "Continue sua jornada e acompanhe as próximas conquistas.",
          cta_label: "Continuar",
          cta_url: "/empreendedor",
          priority: 10,
          starts_at: null,
          ends_at: null,
        }],
        ranking: [{ position: 1, participant: "Você", points: 0, is_current: true }],
        own_rank: { position: 1, points: 0 },
        point_history: [],
        rewards: [{
          type: "badge",
          version_id: "16000000-0000-4000-8000-000000000001",
          title: "Primeira conquista",
          description: "Conclua a atividade da jornada.",
          earned: false,
        }],
        archetype: null,
      },
    };
  }

  if (name === "get_participant_journey_outline") {
    if (String(args.p_journey_instance_id ?? "") !== IDS.journey) throw new Error("JOURNEY_NOT_FOUND");
    return {
      handled: true,
      value: {
        journey_instance_id: IDS.journey,
        journey_status: "in_progress",
        journey_aggregate_version: 1,
        journey_version_id: IDS.journeyVersion,
        journey_title: "Jornada sintética E2E",
        journey_description: "Fluxo técnico de aprendizagem.",
        journey_version_number: 1,
        progress: 0,
        completed_required_steps: 0,
        total_required_steps: 1,
        modules: [{
          module_key: "synthetic-module",
          module_id: null,
          module_title: "Fundamentos",
          module_description: "Atividades da prova sintética.",
          module_position: 1,
          estimated_minutes: 15,
          metadata: {},
          path_name: "Caminho direto",
          activity_count: 1,
          completed_count: 0,
          activities: [{
            step_instance_id: IDS.step,
            step_status: "available",
            step_aggregate_version: 0,
            available_at: null,
            started_at: null,
            completed_at: null,
            step_code: "activity",
            is_required: true,
            position: 1,
            metadata: {},
            activity_version_id: IDS.activityVersion,
            activity_title: "Entradas, regras e validação humana",
            activity_description: "Distinguir entrada, regra, saída e validação humana.",
            activity_type: "text_activity",
            estimated_minutes: 15,
            can_open: true,
            can_start: true,
          }],
        }],
      },
    };
  }

  if (name === "list_operator_announcements") {
    return { handled: true, value: { organization_id: IDS.organization, announcements: [] } };
  }

  return { handled: false };
}
