import "server-only";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import type {
  AnnouncementBannerDownload,
  AnnouncementUploadedFile,
  AnnouncementUploadIntent,
  AdminHomeBadgeHighlights,
  ParticipantFeaturedBadges,
  OperatorAnnouncements,
  ParticipantDiagnosticSummary,
  ParticipantEngagementHub,
  ParticipantPointRules,
  ParticipantProfileSummary,
  SavedAnnouncement,
} from "@/lib/engagement/contracts";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

function isMissingAnnouncementMobileSignature(error: unknown) {
  if (!(error instanceof ServerRpcError)) return false;
  const text = `${error.code} ${error.message}`.toLowerCase();
  return text.includes("pgrst202") || (
    text.includes("save_operator_announcement") &&
    (text.includes("mobile_image_file_object_id") || text.includes("could not find"))
  );
}

export const engagementRuntime = {
  participantHub: (actorUserAccountId: string) => invokeServerRpc<ParticipantEngagementHub>(
    "get_participant_engagement_hub",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  participantProfileSummary: (actorUserAccountId: string) => invokeServerRpc<ParticipantProfileSummary>(
    "get_participant_profile_summary",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  participantFeaturedBadges: (actorUserAccountId: string) => invokeServerRpc<ParticipantFeaturedBadges>(
    "get_participant_featured_badges",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  adminHomeBadgeHighlights: (actorUserAccountId: string, organizationId: string) => invokeServerRpc<AdminHomeBadgeHighlights>(
    "get_admin_home_badge_highlights",
    { p_actor_user_account_id: actorUserAccountId, p_organization_id: organizationId },
  ),
  saveAdminHomeBadgeHighlights: (input: {
    actorUserAccountId: string;
    organizationId: string;
    badgeVersionIds: string[];
    maxItems: number;
    idempotencyKey: string;
  }) => invokeServerRpc<{ saved_count: number; max_items: number; replayed: boolean }>(
    "save_admin_home_badge_highlights",
    {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_badge_version_ids: input.badgeVersionIds,
      p_max_items: input.maxItems,
      p_idempotency_key: input.idempotencyKey,
    },
  ),
  participantPointRules: (actorUserAccountId: string) => invokeServerRpc<ParticipantPointRules>(
    "list_participant_point_rules",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  participantDiagnosticSummary: (actorUserAccountId: string) => invokeServerRpc<ParticipantDiagnosticSummary>(
    "get_participant_diagnostic_summary",
    { p_actor_user_account_id: actorUserAccountId },
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
  getAnnouncementBannerDownload: (actorUserAccountId: string, announcementId: string, variant: "desktop" | "mobile" = "desktop") => invokeServerRpc<AnnouncementBannerDownload>(
    "get_announcement_banner_download",
    { p_actor_user_account_id: actorUserAccountId, p_announcement_id: announcementId, p_variant: variant },
  ),
  saveAnnouncement: async (input: {
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
    mobileImageFileObjectId: string | null;
    imageAlt: string | null;
    displayMode: "image_only" | "image_with_text";
    idempotencyKey: string;
  }) => {
    const commonArgs = {
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
    };

    try {
      return await invokeServerRpc<RpcEnvelope<SavedAnnouncement>>(
        "save_operator_announcement",
        { ...commonArgs, p_mobile_image_file_object_id: input.mobileImageFileObjectId },
      );
    } catch (error) {
      if (!isMissingAnnouncementMobileSignature(error)) throw error;
      if (input.mobileImageFileObjectId) {
        throw new ServerRpcError(
          "ANNOUNCEMENT_MOBILE_SCHEMA_REQUIRED",
          "ANNOUNCEMENT_MOBILE_SCHEMA_REQUIRED",
        );
      }
      return invokeServerRpc<RpcEnvelope<SavedAnnouncement>>(
        "save_operator_announcement",
        commonArgs,
      );
    }
  },
};