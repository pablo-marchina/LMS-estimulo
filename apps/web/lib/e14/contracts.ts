export type OrganizationAccess = {
  organization_id: string;
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
  d: DiagnosticState;
  s: StepState;
  q: QuickCheckState;
  p: PointState;
};

export type ParticipantJourneys = {
  actor_user_account_id: string;
  entrepreneur_id: string | null;
  journeys: JourneyState[];
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
  title?: string;
  body?: string;
  [key: string]: unknown;
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
  journey: { title: string; description: string | null; purpose: string | null };
  diagnostic: { version_id: string; items: DiagnosticItem[] } | null;
  activity: {
    version_id: string;
    title: string;
    description: string | null;
    estimated_minutes: number;
    sections: ContentSection[];
  } | null;
  assessment: {
    passing_score: number | null;
    max_attempts: number | null;
    questions: AssessmentQuestion[];
  } | null;
};

export type OperatorInstances = {
  organization_id: string;
  instances: JourneyState[];
};

export type RpcEnvelope<T> = {
  request_id: string;
  idempotency_key: string;
  replayed: boolean;
  data: T;
};
