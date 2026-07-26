import "server-only";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import type {
  OperatorAnnouncements,
  ParticipantEngagementHub,
  ParticipantPointRules,
  SavedAnnouncement,
} from "@/lib/engagement/contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const engagementRuntime = {
  participantHub: (actorUserAccountId: string) => invokeServerRpc<ParticipantEngagementHub>(
    "get_participant_engagement_hub",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  participantPointRules: (actorUserAccountId: string) => invokeServerRpc<ParticipantPointRules>(
    "list_participant_point_rules",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  awardAction: (input: {
    actorUserAccountId: string;
    journeyInstanceId: string | null;
    actionCode: string;
    sourceReference: string;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<{ amount: number; action_code: string; replayed: boolean }>>(
    "award_participant_action_points",
    {
      p_actor_user_account_id: input.actorUserAccountId,
      p_journey_instance_id: input.journeyInstanceId,
      p_action_code: input.actionCode,
      p_source_reference: input.sourceReference,
      p_idempotency_key: input.idempotencyKey,
    },
  ),
  listOperatorAnnouncements: (actorUserAccountId: string, organizationId: string) => invokeServerRpc<OperatorAnnouncements>(
    "list_operator_announcements",
    {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    },
  ),
  saveAnnouncement: (input: {
    actorUserAccountId: string;
    organizationId: string;
    announcementId: string | null;
    expectedVersion: number | null;
    title: string;
    body: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    status: "draft" | "published" | "retired";
    priority: number;
    startsAt: string | null;
    endsAt: string | null;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<SavedAnnouncement>>(
    "save_operator_announcement",
    {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_announcement_id: input.announcementId,
      p_expected_version: input.expectedVersion,
      p_title: input.title,
      p_body: input.body,
      p_cta_label: input.ctaLabel,
      p_cta_url: input.ctaUrl,
      p_status: input.status,
      p_priority: input.priority,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_idempotency_key: input.idempotencyKey,
    },
  ),
};