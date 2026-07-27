export type JourneyPresentation = {
  featured?: boolean;
  featured_rank?: number;
  eyebrow?: string;
  badge?: string;
  tone?: string;
  icon?: string;
  tags?: string[];
  cta?: string;
  card_background_file_object_id?: string;
  featured_background_file_object_id?: string;
  card_background_alt?: string;
  featured_background_alt?: string;
  [key: string]: unknown;
};

export type OrganizationAccess = {
  organization_id: string;
  slug?: string;
  display_name: string;
  roles: string[];
  permissions: string[];
};

export type IdentityContext = {
  user_account_id: string;
  entrepreneur_id: string | null;
  organizations: OrganizationAccess[];
};

export type DiagnosticState = {
  session_id: string;
  status: string;
  aggregate_version: number;
  result_id?: string | null;
  path_code?: string | null;
  low_confidence?: boolean;
} | null;

export type StepState = {
  step_instance_id: string;
  status: string;
  aggregate_version: number;
  version_id: string;
  accepted_sections: number;
  session_id?: string | null;
} | null;

export type QuickCheckState = {
  attempt_id: string;
  attempt_number: number;
  status: string;
  aggregate_version: number;
  score?: number | null;
  passed?: boolean | null;
} | null;

export type PointState = {
  balance: number;
  ledger_count: number;
  ledger_sum: number;
} | null;

export type JourneyState = {
  journey_instance_id: string;
  journey_code: string;
  journey_version_number: number;
  journey_version_id: string;
  journey_content_hash: string;
  journey_status: string;
  journey_aggregate_version: number;
  enrollment_status: string;
  entrepreneur_id: string;
  organization_id: string;
  progress: number;
  completed_required_steps: number;
  total_required_steps: number;
  journey_title?: string;
  journey_description?: string | null;
  journey_slug?: string;
  journey_presentation?: JourneyPresentation;
  d: DiagnosticState;
  s: StepState;
  q: QuickCheckState;
  p: PointState;
};

export type ParticipantJourneys = {
  actor_user_account_id: string;
  entrepreneur_id: string | null;
  journeys: JourneyState[];
  skipped_invalid_journeys?: number;
};

export type DiagnosticOption = { id: string; code: string; label: string; position: number };
export type DiagnosticItem = {
  id: string;
  code: string;
  prompt: string;
  item_type: string;
  position: number;
  is_required: boolean;
  options: DiagnosticOption[];
  response?: { revision: number; option_code: string } | null;
};

export type ContentSection = {
  code: string;
  heading?: string;
  title?: string;
  body?: string;
  [key: string]: unknown;
};

export type ActivityPrompt = { title: string; text: string };

export type ActivityAssetProgress = {
  watched_seconds: number;
  duration_seconds: number | null;
  completion_ratio: number;
  completed: boolean;
};

export type ActivityAsset = {
  id: string;
  asset_type: string;
  title: string;
  external_url: string | null;
  file_object_id: string | null;
  original_filename: string | null;
  content_type: string | null;
  language_code: string;
  accessibility_metadata: Record<string, unknown>;
  position: number;
  is_required: boolean;
  progress: ActivityAssetProgress;
  library_item_version_id?: string | null;
  library_slug?: string | null;
  library_body?: string | null;
  library_content_kind?: string | null;
  library_content_format?: string | null;
  library_summary?: string | null;
  library_source_name?: string | null;
};

export type AssessmentOption = { id: string; code: string; label: string; position: number };
export type AssessmentQuestion = {
  id: string;
  code: string;
  prompt: string;
  question_type: string;
  position: number;
  options: AssessmentOption[];
  response?: { option_code: string } | null;
};

export type ParticipantExperience = {
  state: JourneyState;
  journey: {
    title: string;
    description: string | null;
    purpose: string | null;
    presentation?: JourneyPresentation;
  };
  diagnostic: { version_id: string; items: DiagnosticItem[] } | null;
  activity: {
    version_id: string;
    title: string;
    description: string | null;
    estimated_minutes: number;
    sections: ContentSection[];
    prompts: ActivityPrompt[];
    assets: ActivityAsset[];
    content_progress: {
      completed_parts: number;
      total_parts: number;
      required_assets_completed: number;
      required_assets_total: number;
    };
  } | null;
  assessment: {
    passing_score: number | null;
    max_attempts: number | null;
    questions: AssessmentQuestion[];
  } | null;
};

export type ActivityComment = {
  id: string;
  step_instance_id: string;
  author_name: string;
  body: string;
  status: "visible" | "hidden";
  created_at: string;
  is_own: boolean;
};

export type ActivityComments = { step_instance_id: string; comments: ActivityComment[] };

export type OperatorActivityComment = {
  id: string;
  organization_id: string;
  journey_instance_id: string;
  step_instance_id: string;
  activity_title: string;
  author_name: string;
  body: string;
  status: "visible" | "hidden";
  aggregate_version: number;
  created_at: string;
  moderated_at: string | null;
  moderation_reason: string | null;
};

export type OperatorActivityComments = { organization_id: string; comments: OperatorActivityComment[] };
export type OperatorInstances = { organization_id: string; instances: JourneyState[] };

export type OperatorWorkspace = {
  organization_id: string;
  journey_versions: Array<{
    journey_version_id: string;
    journey_definition_id: string;
    journey_code: string;
    title: string;
    version_number: number;
    status: string;
    content_hash: string;
    published_at: string | null;
  }>;
  participants: Array<{ entrepreneur_id: string; display_name: string; email: string }>;
};

export type RpcEnvelope<T> = {
  request_id: string;
  idempotency_key: string;
  replayed: boolean;
  data: T;
};
