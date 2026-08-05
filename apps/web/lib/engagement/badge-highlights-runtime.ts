import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type AdminHomeBadge = {
  badge_version_id: string;
  definition_id: string;
  name: string;
  title: string;
  description: string;
  asset_file_object_id: string | null;
  version_number: number;
};

export type AdminHomeBadgeSelection = {
  badge_version_id: string;
  position: number;
  active: boolean;
};

export type AdminHomeBadgeWorkspace = {
  organization_id: string;
  display_limit: number;
  available_badges: AdminHomeBadge[];
  selected_badges: AdminHomeBadgeSelection[];
};

export type ParticipantHomeBadge = {
  badge_version_id: string;
  title: string;
  description: string;
  asset_file_object_id: string | null;
  position: number;
  earned: boolean;
};

export type ParticipantHomeBadgeHighlights = {
  display_limit: number;
  badges: ParticipantHomeBadge[];
};

export const badgeHighlightsRuntime = {
  admin(actorUserAccountId: string, organizationId: string) {
    return invokeServerRpc<AdminHomeBadgeWorkspace>(
      "get_admin_home_badge_highlights",
      {
        p_actor_user_account_id: actorUserAccountId,
        p_organization_id: organizationId,
      },
    );
  },

  save(input: {
    actorUserAccountId: string;
    organizationId: string;
    badgeVersionIds: string[];
    displayLimit: number;
    idempotencyKey: string;
  }) {
    return invokeServerRpc<Record<string, unknown>>(
      "save_admin_home_badge_highlights",
      {
        p_actor_user_account_id: input.actorUserAccountId,
        p_organization_id: input.organizationId,
        p_badge_version_ids: input.badgeVersionIds,
        p_display_limit: input.displayLimit,
        p_idempotency_key: input.idempotencyKey,
      },
    );
  },

  participant(actorUserAccountId: string) {
    return invokeServerRpc<ParticipantHomeBadgeHighlights>(
      "list_participant_home_badge_highlights",
      { p_actor_user_account_id: actorUserAccountId },
    );
  },
};
