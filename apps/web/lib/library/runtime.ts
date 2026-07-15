import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import type {
  LibraryAccessResult,
  LibraryContent,
  LibraryDraftResult,
  LibraryListing,
  OperatorLibraryData
} from "@/lib/library/contracts";

export const libraryRuntime = {
  list: (input: {
    actorUserAccountId: string;
    query?: string | null;
    topic?: string | null;
    contentFormat?: string | null;
    level?: string | null;
    journeyVersionId?: string | null;
    limit?: number;
    offset?: number;
  }) => invokeServerRpc<LibraryListing>("list_library_content", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_query: input.query ?? null,
    p_topic: input.topic ?? null,
    p_content_format: input.contentFormat ?? null,
    p_level: input.level ?? null,
    p_journey_version_id: input.journeyVersionId ?? null,
    p_limit: input.limit ?? 24,
    p_offset: input.offset ?? 0
  }),

  get: (actorUserAccountId: string, slug: string) => invokeServerRpc<LibraryContent>(
    "get_library_content",
    { p_actor_user_account_id: actorUserAccountId, p_slug: slug }
  ),

  listOperator: (actorUserAccountId: string, organizationId: string) => invokeServerRpc<OperatorLibraryData>(
    "list_operator_library_content",
    { p_actor_user_account_id: actorUserAccountId, p_organization_id: organizationId }
  ),

  saveDraft: (input: {
    actorUserAccountId: string;
    organizationId: string;
    libraryItemId: string | null;
    slug: string;
    title: string;
    summary: string;
    body: string | null;
    contentKind: "article" | "external_link";
    contentFormat: string;
    level: string;
    estimatedMinutes: number;
    sourceType: string;
    sourceName: string;
    externalUrl: string | null;
    languageCode: string;
    topics: string[];
    visibility: string;
    journeyVersionIds: string[];
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<LibraryDraftResult>>("save_library_content_draft", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_library_item_id: input.libraryItemId,
    p_slug: input.slug,
    p_title: input.title,
    p_summary: input.summary,
    p_body: input.body,
    p_content_kind: input.contentKind,
    p_content_format: input.contentFormat,
    p_level: input.level,
    p_estimated_minutes: input.estimatedMinutes,
    p_source_type: input.sourceType,
    p_source_name: input.sourceName,
    p_external_url: input.externalUrl,
    p_language_code: input.languageCode,
    p_topics: input.topics,
    p_visibility: input.visibility,
    p_journey_version_ids: input.journeyVersionIds,
    p_idempotency_key: input.idempotencyKey
  }),

  publish: (
    actorUserAccountId: string,
    organizationId: string,
    libraryItemVersionId: string,
    expectedContentHash: string,
    idempotencyKey: string
  ) => invokeServerRpc<RpcEnvelope<Record<string, unknown>>>("publish_library_content", {
    p_actor_user_account_id: actorUserAccountId,
    p_organization_id: organizationId,
    p_library_item_version_id: libraryItemVersionId,
    p_expected_content_hash: expectedContentHash,
    p_idempotency_key: idempotencyKey
  }),

  recordAccess: (input: {
    actorUserAccountId: string;
    libraryItemVersionId: string;
    action: "view" | "open";
    source: string;
    journeyInstanceId?: string | null;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<LibraryAccessResult>>("record_library_content_access", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_library_item_version_id: input.libraryItemVersionId,
    p_action: input.action,
    p_source: input.source,
    p_journey_instance_id: input.journeyInstanceId ?? null,
    p_idempotency_key: input.idempotencyKey
  })
};
