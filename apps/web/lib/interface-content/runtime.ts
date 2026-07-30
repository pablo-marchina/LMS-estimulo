import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { AdminInterfaceContentWorkspace, InterfaceContentMap, InterfaceContentValue } from "@/lib/interface-content/contracts";
import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const INTERFACE_CONTENT_CACHE_TAG = "interface-content:published";
const INTERFACE_CONTENT_REVALIDATE_SECONDS = 300;

function contentMap(value: unknown): InterfaceContentMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, InterfaceContentValue] => {
      const item = entry[1];
      return Boolean(item && typeof item === "object" && !Array.isArray(item));
    }),
  );
}

const loadPublishedSupabaseInterfaceContent = unstable_cache(
  async (organizationSlug: string, locale: string): Promise<InterfaceContentMap> => {
    const { url, anonKey } = publicSupabaseEnv();
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-client-info": "estimulo-interface-content/1" } },
    });
    const { data, error } = await client.rpc("get_published_interface_content", {
      p_organization_slug: organizationSlug,
      p_locale: locale,
    });
    if (error) throw new Error(`INTERFACE_CONTENT_READ_FAILED:${error.code ?? "UNKNOWN"}`);
    return contentMap(data);
  },
  ["published-interface-content-v1"],
  { revalidate: INTERFACE_CONTENT_REVALIDATE_SECONDS, tags: [INTERFACE_CONTENT_CACHE_TAG] },
);

export async function getPublishedInterfaceContent(
  organizationSlug = "estimulo",
  locale = "pt-BR",
): Promise<InterfaceContentMap> {
  if (platformRuntimeProvider() === "aws") {
    console.warn(JSON.stringify({
      level: "warn",
      event: "interface_content_adapter_unavailable",
      component: "interface_content_runtime",
      provider: "aws",
      architecture_status: "decision_pending",
    }));
    return {};
  }

  try {
    return await loadPublishedSupabaseInterfaceContent(organizationSlug, locale);
  } catch (error) {
    console.warn(JSON.stringify({
      level: "warn",
      event: "interface_content_fallback",
      component: "interface_content_runtime",
      organization_slug: organizationSlug,
      locale,
      error_name: error instanceof Error ? error.name : "unknown",
    }));
    return {};
  }
}

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

export function registerAdminInterfaceContent(input: {
  actorUserAccountId: string;
  organizationId: string;
  entry: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{ entry_id: string; content_key: string; replayed: boolean }>("register_admin_interface_content", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_entry: input.entry,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function archiveAdminInterfaceContent(input: {
  actorUserAccountId: string;
  organizationId: string;
  contentKey: string;
  locale?: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{ content_key: string; archived: boolean; replayed: boolean }>("archive_admin_interface_content", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_content_key: input.contentKey,
    p_locale: input.locale ?? "pt-BR",
    p_idempotency_key: input.idempotencyKey,
  });
}
