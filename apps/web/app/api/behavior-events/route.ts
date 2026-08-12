import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, code: "ORIGIN_FORBIDDEN" }, { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !auth.identity.entrepreneur_id) return NextResponse.json({ ok: false, code: "PARTICIPANT_REQUIRED" }, { status: 401 });

  let input: Record<string, unknown>;
  try { input = object(await request.json()); } catch { return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }
  const interactionType = text(input.interaction_type);
  const eventId = text(input.event_id);
  const properties = object(input.properties);
  if (!/^[a-z][a-z0-9_.-]{1,99}$/u.test(interactionType) || !/^[A-Za-z0-9._:-]{8,160}$/u.test(eventId)) return NextResponse.json({ ok: false, code: "BEHAVIOR_EVENT_INVALID" }, { status: 400 });
  if (Buffer.byteLength(JSON.stringify(properties), "utf8") > 16_384) return NextResponse.json({ ok: false, code: "BEHAVIOR_EVENT_TOO_LARGE" }, { status: 413 });

  const payload = {
    interaction_type: interactionType,
    captured_at: text(input.captured_at) || new Date().toISOString(),
    session_id: text(input.session_id).slice(0, 160),
    entity_type: text(input.entity_type).slice(0, 100),
    entity_id: text(input.entity_id).slice(0, 200),
    journey_instance_id: text(input.journey_instance_id),
    channel: text(properties.channel).slice(0, 80),
    properties,
  };

  try {
    const result = interactionType === "social_share"
      ? await extensionsRuntime.performParticipant({ actorUserAccountId: auth.identity.user_account_id, action: "social_share", payload, idempotencyKey: eventId })
      : await extensionsRuntime.performParticipant({ actorUserAccountId: auth.identity.user_account_id, action: "behavior_event", payload, idempotencyKey: eventId });
    return NextResponse.json({ ok: true, data: result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message.split(":", 1)[0] : "BEHAVIOR_EVENT_FAILED";
    return NextResponse.json({ ok: false, code }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
