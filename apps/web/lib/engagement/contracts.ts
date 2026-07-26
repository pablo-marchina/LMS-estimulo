export type ParticipantAnnouncement = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  image_file_object_id: string | null;
  image_alt: string | null;
  display_mode: "image_only" | "image_with_text";
};

export type RankingEntry = {
  position: number;
  participant: string;
  points: number;
  is_current: boolean;
};

export type PointHistoryEntry = {
  id: string;
  amount: number;
  reason: string;
  occurred_at: string;
  journey_instance_id: string | null;
};

export type ParticipantPointRule = {
  definition_id: string;
  code: string;
  name: string;
  description: string;
  amount: number;
  frequency: "once" | "per_activity" | "per_assessment" | "per_path" | "per_journey" | "daily" | "weekly" | "unlimited";
  maximum_awards: number;
};

export type ParticipantPointRules = {
  point_rules: ParticipantPointRule[];
};

export type AvailableReward = {
  type: "badge" | "certificate";
  version_id: string;
  title: string;
  description: string;
  earned: boolean;
};

export type ArchetypeSummary = {
  assignment_id: string;
  name: string | null;
  description: string | null;
  classification_status: string;
  probability: number | null;
  assigned_at: string;
} | null;

export type ParticipantEngagementHub = {
  entrepreneur_id: string;
  preferred_name: string | null;
  email: string;
  announcements: ParticipantAnnouncement[];
  ranking: RankingEntry[];
  own_rank: { position: number; points: number } | null;
  point_history: PointHistoryEntry[];
  rewards: AvailableReward[];
  archetype: ArchetypeSummary;
};

export type OperatorAnnouncement = ParticipantAnnouncement & {
  status: "draft" | "published" | "retired";
  aggregate_version: number;
  created_at: string;
  updated_at: string;
};

export type OperatorAnnouncements = {
  organization_id: string;
  announcements: OperatorAnnouncement[];
};

export type AnnouncementUploadIntent = {
  upload_intent_id: string;
  bucket: string;
  object_key: string;
  original_filename: string;
  expected_content_type: string;
  max_size_bytes: number;
  expires_at: string;
};

export type AnnouncementUploadedFile = {
  file_object_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  bucket: string;
  object_key: string;
  security_status: string;
};

export type AnnouncementBannerDownload = {
  announcement_id: string;
  file_object_id: string;
  bucket: string;
  object_key: string;
  content_type: string;
  original_filename: string;
};

export type SavedAnnouncement = {
  announcement_id: string;
  organization_id: string;
  status: "draft" | "published" | "retired";
  aggregate_version: number;
  image_file_object_id: string | null;
  display_mode: "image_only" | "image_with_text";
};
