import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";

export type ExternalCredential = {
  id: string;
  title: string;
  issuer: string;
  issued_on: string | null;
  expires_on: string | null;
  verification_url: string | null;
  status: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type CertificateRenderPayload = {
  issuance_id: string;
  display_name: string;
  journey_title: string;
  certificate_name: string;
  verification_code: string;
  issued_at: string;
  expires_at: string | null;
  template_layout: { name_y?: number; journey_y?: number; text_color?: string };
  template: null | { bucket: string; object_key: string; content_type: string; filename: string | null };
};

type UploadIntent = {
  upload_intent_id: string;
  bucket: string;
  object_key: string;
  original_filename: string;
  expected_content_type: string;
  max_size_bytes: number;
};

export const extendedCredentialRuntime = {
  listExternal: (actorUserAccountId: string) => invokeServerRpc<{ entrepreneur_id?: string; items: ExternalCredential[] }>("list_participant_external_credentials", { p_actor_user_account_id: actorUserAccountId }),
  createExternalIntent: (input: { actorUserAccountId: string; originalFilename: string; expectedContentType: string; storageProvider: string; bucket: string; idempotencyKey: string }) => invokeServerRpc<RpcEnvelope<UploadIntent>>("create_external_credential_upload_intent", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_original_filename: input.originalFilename,
    p_expected_content_type: input.expectedContentType,
    p_storage_provider: input.storageProvider,
    p_bucket: input.bucket,
    p_idempotency_key: input.idempotencyKey,
  }),
  confirmExternal: (input: { actorUserAccountId: string; uploadIntentId: string; title: string; issuer: string; issuedOn: string | null; expiresOn: string | null; verificationUrl: string | null; actualContentType: string; actualSizeBytes: number; sha256: string; providerObjectVersion: string | null; etag: string | null; idempotencyKey: string }) => invokeServerRpc<RpcEnvelope<Record<string, unknown>>>("confirm_external_credential_upload", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_upload_intent_id: input.uploadIntentId,
    p_title: input.title,
    p_issuer: input.issuer,
    p_issued_on: input.issuedOn,
    p_expires_on: input.expiresOn,
    p_verification_url: input.verificationUrl,
    p_actual_content_type: input.actualContentType,
    p_actual_size_bytes: input.actualSizeBytes,
    p_sha256: input.sha256,
    p_provider_object_version: input.providerObjectVersion,
    p_etag: input.etag,
    p_idempotency_key: input.idempotencyKey,
  }),
  abortExternal: (actorUserAccountId: string, uploadIntentId: string, failureCode: string, idempotencyKey: string) => invokeServerRpc<RpcEnvelope<Record<string, unknown>>>("abort_external_credential_upload", { p_actor_user_account_id: actorUserAccountId, p_upload_intent_id: uploadIntentId, p_failure_code: failureCode, p_idempotency_key: idempotencyKey }),
  externalDownload: (actorUserAccountId: string, externalCredentialId: string) => invokeServerRpc<{ bucket: string; object_key: string; filename: string; content_type: string }>("get_external_credential_download", { p_actor_user_account_id: actorUserAccountId, p_external_credential_id: externalCredentialId }),
  createTemplateIntent: (input: { actorUserAccountId: string; organizationId: string; originalFilename: string; expectedContentType: string; storageProvider: string; bucket: string; idempotencyKey: string }) => invokeServerRpc<RpcEnvelope<UploadIntent>>("create_certificate_template_upload_intent", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_original_filename: input.originalFilename,
    p_expected_content_type: input.expectedContentType,
    p_storage_provider: input.storageProvider,
    p_bucket: input.bucket,
    p_idempotency_key: input.idempotencyKey,
  }),
  confirmTemplate: (input: { actorUserAccountId: string; organizationId: string; uploadIntentId: string; actualContentType: string; actualSizeBytes: number; sha256: string; providerObjectVersion: string | null; etag: string | null; idempotencyKey: string }) => invokeServerRpc<RpcEnvelope<{ file_object_id: string; original_filename: string }>>("confirm_certificate_template_upload", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_upload_intent_id: input.uploadIntentId,
    p_actual_content_type: input.actualContentType,
    p_actual_size_bytes: input.actualSizeBytes,
    p_sha256: input.sha256,
    p_provider_object_version: input.providerObjectVersion,
    p_etag: input.etag,
    p_idempotency_key: input.idempotencyKey,
  }),
  configureCertificate: (input: { actorUserAccountId: string; organizationId: string; certificateVersionId: string; templateFileObjectId: string | null; templateLayout: Record<string, unknown>; idempotencyKey: string }) => invokeServerRpc<RpcEnvelope<Record<string, unknown>>>("configure_certificate_version", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_certificate_version_id: input.certificateVersionId,
    p_template_file_object_id: input.templateFileObjectId,
    p_template_layout: input.templateLayout,
    p_idempotency_key: input.idempotencyKey,
  }),
  publishCertificate: (input: { actorUserAccountId: string; organizationId: string; certificateVersionId: string; idempotencyKey: string }) => invokeServerRpc<RpcEnvelope<Record<string, unknown>>>("publish_certificate_version", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_certificate_version_id: input.certificateVersionId,
    p_idempotency_key: input.idempotencyKey,
  }),
  renderPayload: (actorUserAccountId: string, issuanceId: string) => invokeServerRpc<CertificateRenderPayload>("get_certificate_render_payload", { p_actor_user_account_id: actorUserAccountId, p_issuance_id: issuanceId }),
};
