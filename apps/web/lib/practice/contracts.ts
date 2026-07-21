export type PracticeConfiguration = {
  enabled: true;
  submission_mode: string;
  allowed_evidence_types: string[];
  max_submissions: number | null;
  review_required: boolean;
  terms_version: string | null;
  upload_profile_code: string;
};

export type PracticeSubmission = {
  id: string;
  step_instance_id: string;
  submission_number: number;
  status: string;
  file_object_id: string | null;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  allow_public_use: boolean;
  submitted_at: string;
  can_download: boolean;
  review_status: string | null;
  review_feedback: string | null;
  reviewed_at: string | null;
};

export type PracticeSubmissions = {
  step_instance_id: string;
  practice: PracticeConfiguration | null;
  submissions: PracticeSubmission[];
};

export type OperatorPracticeSubmission = PracticeSubmission & {
  organization_id: string;
  journey_instance_id: string;
  activity_title: string;
  participant_name: string;
  review_required: boolean;
};

export type OperatorPracticeSubmissions = {
  organization_id: string;
  submissions: OperatorPracticeSubmission[];
};

export type PracticeUploadIntent = {
  submission_id: string;
  upload_intent_id: string;
  journey_instance_id: string;
  step_instance_id: string;
  activity_version_id: string;
  submission_number: number;
  status: "upload_pending";
  bucket: string;
  object_key: string;
  original_filename: string;
  expected_content_type: string;
  max_size_bytes: number;
  expires_at: string;
  allow_public_use: boolean;
  terms_version: string | null;
};

export type PracticeUploadConfirmation = {
  submission_id: string;
  file_object_id: string;
  status: "awaiting_review" | "available";
  original_filename: string;
  content_type: string;
  size_bytes: number;
  allow_public_use: boolean;
  submitted_at: string;
};

export type PracticeDownloadDescriptor = {
  submission_id: string;
  file_object_id: string;
  storage_provider: string;
  bucket: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  original_filename: string;
};

export type RpcEnvelope<T> = {
  request_id: string;
  idempotency_key: string;
  replayed: boolean;
  data: T;
};
