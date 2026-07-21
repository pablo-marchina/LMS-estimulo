import "server-only";

const IDS = {
  actor: "11111111-1111-4111-8111-111111111111",
  entrepreneur: "22222222-2222-4222-8222-222222222222",
  organization: "33333333-3333-4333-8333-333333333333",
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

  if (name === "list_operator_announcements") {
    return { handled: true, value: { organization_id: IDS.organization, announcements: [] } };
  }

  return { handled: false };
}
