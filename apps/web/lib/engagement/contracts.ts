export type ParticipantAnnouncement = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
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

export type SavedAnnouncement = {
  announcement_id: string;
  organization_id: string;
  status: "draft" | "published" | "retired";
  aggregate_version: number;
};
