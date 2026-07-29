import "server-only";

import { cache } from "react";
import type { AdminInterfaceContentWorkspace, InterfaceContentMap, InterfaceContentValue } from "@/lib/interface-content/contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import { createSessionClient } from "@/lib/supabase/server";

function contentMap(value: unknown): InterfaceContentMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, InterfaceContentValue] => {
      const item = entry[1];
      return Boolean(item && typeof item === "object" && !Array.isArray(item));
    }),
  );
}

export const getPublishedInterfaceContent = cache(async (
  organizationSlug = "estimulo",
  locale = "pt-BR",
): Promise<InterfaceContentMap> => {
  const client = await createSessionClient();
  const { data, error } = await client.rpc("get_published_interface_content", {
    p_organization_slug: organizationSlug,
    p_locale: locale,
  });
  if (error) throw new Error(`INTERFACE_CONTENT_READ_FAILED:${error.code ?? "UNKNOWN"}`);
  return contentMap(data);
});

export function getAdminInterfaceContent(input: {
  actorUserAccountId: string;
  organizationId: string;
  locale?: string;
}) {
  return invokeServerRpc<AdminInterfaceContentWorkspace>("get_admin_interface_content", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_locale: input.locale ?? "pt-BR",
  });
}

export function saveAdminInterfaceContent(input: {
  actorUserAccountId: string;
  organizationId: string;
  entries: Array<{ content_key: string; locale: string; value: InterfaceContentValue }>;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{ saved_count: number; replayed: boolean }>("save_admin_interface_content", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_entries: input.entries,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function publishAdminInterfaceContent(input: {
  actorUserAccountId: string;
  organizationId: string;
  contentKeys: string[] | null;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{ published_count: number; replayed: boolean }>("publish_admin_interface_content", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_content_keys: input.contentKeys,
    p_idempotency_key: input.idempotencyKey,
  });
}
