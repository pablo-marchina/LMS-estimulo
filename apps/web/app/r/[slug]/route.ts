import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { publicSupabaseEnv } from "@/lib/env";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trackingCookie = "estimulo_tracking_visit";

function device(userAgent: string) {
  const lower = userAgent.toLowerCase();
  return lower.includes("mobile") ? "mobile" : lower.includes("tablet") || lower.includes("ipad") ? "tablet" : "desktop";
}
function browser(userAgent: string) {
  if (/edg\//iu.test(userAgent)) return "Edge";
  if (/chrome\//iu.test(userAgent)) return "Chrome";
  if (/firefox\//iu.test(userAgent)) return "Firefox";
  if (/safari\//iu.test(userAgent)) return "Safari";
  return "Other";
}
function operatingSystem(userAgent: string) {
  if (/windows/iu.test(userAgent)) return "Windows";
  if (/android/iu.test(userAgent)) return "Android";
  if (/iphone|ipad|ios/iu.test(userAgent)) return "iOS";
  if (/mac os/iu.test(userAgent)) return "macOS";
  if (/linux/iu.test(userAgent)) return "Linux";
  return "Other";
}
function safeDestination(value: unknown) { return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/empreendedor"; }

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const visitToken = `${randomUUID()}.${randomBytes(24).toString("hex")}`;
  const userAgent = request.headers.get("user-agent") ?? "";
  const forwardedIp = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
  const parameters = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { url, anonKey } = publicSupabaseEnv();
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await client.rpc("capture_tracking_visit", {
    p_slug: slug.toLowerCase(),
    p_visit_token: visitToken,
    p_metadata: {
      anonymous_id: request.cookies.get("estimulo_anonymous_id")?.value ?? randomUUID(),
      session_id: request.cookies.get("estimulo_session_id")?.value ?? randomUUID(),
      landing_path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
      referrer: request.headers.get("referer"),
      device_type: device(userAgent),
      browser: browser(userAgent),
      operating_system: operatingSystem(userAgent),
      user_agent: userAgent.slice(0, 1000),
      ip_hash: forwardedIp ? createHash("sha256").update(forwardedIp).digest("hex") : null,
      parameters,
    },
  });
  if (error || !data || typeof data !== "object") return NextResponse.redirect(new URL("/entrar?erro=campanha_indisponivel", request.url), 303);

  const result = data as Record<string, unknown>;
  let destination = safeDestination(result.destination_path);
  const auth = await getAuthContext();
  if (auth.status === "authenticated") {
    try {
      const associated = await extensionsRuntime.performParticipant({
        actorUserAccountId: auth.identity.user_account_id,
        action: "tracking_associate",
        payload: { visit_token: visitToken },
        idempotencyKey: `tracking:${String(result.visit_id ?? randomUUID())}`,
      });
      destination = safeDestination(associated.destination_path);
    } catch {
      destination = "/empreendedor";
    }
  } else {
    destination = `/entrar?retorno=${encodeURIComponent(destination)}`;
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(trackingCookie, visitToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  if (!request.cookies.has("estimulo_anonymous_id")) response.cookies.set("estimulo_anonymous_id", randomUUID(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  response.cookies.set("estimulo_session_id", randomUUID(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 6 });
  return response;
}
