import "server-only";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import type {
  AnnouncementBannerDownload,
  AnnouncementUploadedFile,
  AnnouncementUploadIntent,
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
    { p_actor_user_account_id: actorUserAccountId, p_organization_id: organizationId },
  ),
  createAnnouncementUploadIntent: (input: {
    actorUserAccountId: string;
    organizationId: string;
    originalFilename: string;
    expectedContentType: string;
    bucket: string;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<AnnouncementUploadIntent>>(
    "create_announcement_banner_upload_intent",
    {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_original_filename: input.originalFilename,
      p_expected_content_type: input.expectedContentType,
      p_storage_provider: "supabase_storage",
      p_bucket: input.bucket,
      p_idempotency_key: input.idempotencyKey,
    },
  ),
  confirmAnnouncementUpload: (input: {
    actorUserAccountId: string;
    organizationId: string;
    uploadIntentId: string;
    actualContentType: string;
    actualSizeBytes: number;
    sha256: string;
    providerObjectVersion: string | null;
    etag: string | null;
    metadata: Record<string, unknown>;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<AnnouncementUploadedFile>>(
    "confirm_announcement_banner_upload",
    {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_upload_intent_id: input.uploadIntentId,
      p_actual_content_type: input.actualContentType,
      p_actual_size_bytes: input.actualSizeBytes,
      p_sha256: input.sha256,
      p_provider_object_version: input.providerObjectVersion,
      p_etag: input.etag,
      p_metadata: input.metadata,
      p_idempotency_key: input.idempotencyKey,
    },
  ),
  abortAnnouncementUpload: (
    actorUserAccountId: string,
    organizationId: string,
    uploadIntentId: string,
    failureCode: string,
    idempotencyKey: string,
  ) => invokeServerRpc<RpcEnvelope<Record<string, unknown>>>(
    "abort_announcement_banner_upload",
    {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
      p_upload_intent_id: uploadIntentId,
      p_failure_code: failureCode,
      p_idempotency_key: idempotencyKey,
    },
  ),
  getAnnouncementBannerDownload: (actorUserAccountId: string, announcementId: string) => invokeServerRpc<AnnouncementBannerDownload>(
    "get_announcement_banner_download",
    { p_actor_user_account_id: actorUserAccountId, p_announcement_id: announcementId },
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
    imageFileObjectId: string | null;
    imageAlt: string | null;
    displayMode: "image_only" | "image_with_text";
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
      p_image_file_object_id: input.imageFileObjectId,
      p_image_alt: input.imageAlt,
      p_display_mode: input.displayMode,
      p_idempotency_key: input.idempotencyKey,
    },
  ),
};
