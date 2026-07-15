import "server-only";
import type {
  OperatorPracticeSubmissions,
  PracticeDownloadDescriptor,
  PracticeSubmissions,
  PracticeUploadConfirmation,
  PracticeUploadIntent,
  RpcEnvelope
} from "@/lib/practice/contracts";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

export class PracticeRpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PracticeRpcError";
  }
}

async function invoke<T>(name: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invokeServerRpc<T>(name, args);
  } catch (error) {
    if (error instanceof ServerRpcError) throw new PracticeRpcError(error.code, error.message);
    throw error;
  }
}

export const practiceRuntime = {
  createUploadIntent: (input: {
    actorUserAccountId: string;
    stepInstanceId: string;
    originalFilename: string;
    expectedContentType: string;
    storageProvider: "supabase_storage" | "s3";
    bucket: string;
    allowPublicUse: boolean;
    idempotencyKey: string;
  }) => invoke<RpcEnvelope<PracticeUploadIntent>>("create_practice_upload_intent", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_step_instance_id: input.stepInstanceId,
    p_original_filename: input.originalFilename,
    p_expected_content_type: input.expectedContentType,
    p_storage_provider: input.storageProvider,
    p_bucket: input.bucket,
    p_allow_public_use: input.allowPublicUse,
    p_idempotency_key: input.idempotencyKey
  }),

  confirmUpload: (input: {
    actorUserAccountId: string;
    submissionId: string;
    uploadIntentId: string;
    actualContentType: string;
    actualSizeBytes: number;
    sha256: string;
    providerObjectVersion: string | null;
    etag: string | null;
    metadata: Record<string, unknown>;
    idempotencyKey: string;
  }) => invoke<RpcEnvelope<PracticeUploadConfirmation>>("confirm_practice_upload", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_submission_id: input.submissionId,
    p_upload_intent_id: input.uploadIntentId,
    p_actual_content_type: input.actualContentType,
    p_actual_size_bytes: input.actualSizeBytes,
    p_sha256: input.sha256,
    p_provider_object_version: input.providerObjectVersion,
    p_etag: input.etag,
    p_metadata: input.metadata,
    p_idempotency_key: input.idempotencyKey
  }),

  abortUpload: (actor: string, submissionId: string, failureCode: string, key: string) =>
    invoke<RpcEnvelope<{ submission_id: string; status: "failed"; failure_code: string }>>("abort_practice_upload", {
      p_actor_user_account_id: actor,
      p_submission_id: submissionId,
      p_failure_code: failureCode,
      p_idempotency_key: key
    }),

  listParticipant: (actor: string, stepInstanceId: string) =>
    invoke<PracticeSubmissions>("list_practice_submissions", {
      p_actor_user_account_id: actor,
      p_step_instance_id: stepInstanceId
    }),

  listOperator: (actor: string, organizationId: string, limit = 100) =>
    invoke<OperatorPracticeSubmissions>("list_operator_practice_submissions", {
      p_actor_user_account_id: actor,
      p_organization_id: organizationId,
      p_limit: limit
    }),

  review: (
    actor: string,
    organizationId: string,
    submissionId: string,
    status: "accepted" | "rejected",
    feedback: string,
    key: string
  ) => invoke<RpcEnvelope<Record<string, unknown>>>("review_practice_submission", {
    p_actor_user_account_id: actor,
    p_organization_id: organizationId,
    p_submission_id: submissionId,
    p_status: status,
    p_feedback: feedback,
    p_idempotency_key: key
  }),

  getDownloadDescriptor: (actor: string, submissionId: string) =>
    invoke<PracticeDownloadDescriptor>("get_practice_download_descriptor", {
      p_actor_user_account_id: actor,
      p_submission_id: submissionId
    })
};
