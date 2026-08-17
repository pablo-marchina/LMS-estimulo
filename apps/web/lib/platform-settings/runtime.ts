import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import {
  DEFAULT_LANDING_PAGE_VERSION,
  normalizeLandingPageVersion,
  type LandingPageVersion,
} from "@/lib/landing-pages/catalog";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";

export type PublicPlatformSettings = {
  platform_name: string | null;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_email: string | null;
  support_hours: string | null;
  institutional_links: Array<{ label?: string; url?: string }>;
  footer_text: string | null;
  community_whatsapp_url: string | null;
  landing_page_version: LandingPageVersion;
};

const fallback: PublicPlatformSettings = {
  platform_name: null,
  support_phone: null,
  support_whatsapp: null,
  support_email: null,
  support_hours: null,
  institutional_links: [],
  footer_text: null,
  community_whatsapp_url: null,
  landing_page_version: DEFAULT_LANDING_PAGE_VERSION,
};

const loadSupabaseSettings = unstable_cache(async (): Promise<PublicPlatformSettings> => {
  const { url, anonKey } = publicSupabaseEnv();
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await client.rpc("get_public_platform_settings");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error(`PUBLIC_PLATFORM_SETTINGS_FAILED:${error?.code ?? "INVALID_DATA"}`);
  const value = data as Record<string, unknown>;
  const links = Array.isArray(value.institutional_links) ? value.institutional_links.filter((item): item is { label?: string; url?: string } => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
  return {
    platform_name: typeof value.platform_name === "string" ? value.platform_name : null,
    support_phone: typeof value.support_phone === "string" ? value.support_phone : null,
    support_whatsapp: typeof value.support_whatsapp === "string" ? value.support_whatsapp : null,
    support_email: typeof value.support_email === "string" ? value.support_email : null,
    support_hours: typeof value.support_hours === "string" ? value.support_hours : null,
    institutional_links: links,
    footer_text: typeof value.footer_text === "string" ? value.footer_text : null,
    community_whatsapp_url: typeof value.community_whatsapp_url === "string" ? value.community_whatsapp_url : null,
    landing_page_version: normalizeLandingPageVersion(value.landing_page_version),
  };
}, ["public-platform-settings-v2"], { revalidate: 120, tags: ["public-platform-settings"] });

export async function getPublicPlatformSettings(): Promise<PublicPlatformSettings> {
  if (platformRuntimeProvider() === "aws") return fallback;
  try { return await loadSupabaseSettings(); }
  catch { return fallback; }
}
