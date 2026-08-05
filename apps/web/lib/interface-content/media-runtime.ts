import "server-only";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type InterfaceMediaUploadIntent = {
  upload_intent_id: string;
  bucket: string;
  object_key: string;
  original_filename: string;
  expected_content_type: string;
  max_size_bytes: number;
  expires_at: string;
};

export type InterfaceMediaUploadedFile = {
  file_object_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  bucket: string;
  object_key: string;
  security_status: string;
};

export type InterfaceMediaDownload = {
  file_object_id: string;
  bucket: string;
  object_key: string;
  content_type: string;
  original_filename: string;
};

export const interfaceMediaRuntime = {
  createUploadIntent(input: {
    actorUserAccountId: string;
    organizationId: string;
    originalFilename: string;
    expectedContentType: string;
    bucket: string;
    idempotencyKey: string;
  }) {
    return invokeServerRpc<RpcEnvelope<InterfaceMediaUploadIntent>>(
      "create_interface_media_upload_intent",
      {
        p_actor_user_account_id: input.actorUserAccountId,
        p_organization_id: input.organizationId,
        p_original_filename: input.originalFilename,
        p_expected_content_type: input.expectedContentType,
        p_storage_provider: "supabase_storage",
        p_bucket: input.bucket,
        p_idempotency_key: input.idempotencyKey,
      },
    );
  },

  confirmUpload(input: {
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
  }) {
    return invokeServerRpc<RpcEnvelope<InterfaceMediaUploadedFile>>(
      "confirm_interface_media_upload",
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
    );
  },

  download(actorUserAccountId: string, fileObjectId: string) {
    return invokeServerRpc<InterfaceMediaDownload>(
      "get_interface_media_download",
      {
        p_actor_user_account_id: actorUserAccountId,
        p_file_object_id: fileObjectId,
      },
    );
  },
};
