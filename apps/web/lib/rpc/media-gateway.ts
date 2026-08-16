import "server-only";
import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";
import { createSessionClient } from "@/lib/supabase/server";

export type MediaDescriptorOperation =
  | "get_announcement_banner_download"
  | "get_journey_cover_download"
  | "get_participant_lesson_thumbnail_download"
  | "get_reward_image_download"
  | "get_interface_content_image_download";

export class MediaGatewayError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "MediaGatewayError";
  }
}

type GatewayPayload<T> = { ok: true; data: T } | { ok: false; code?: string; message?: string };

export async function invokeMediaDescriptorGateway<T>(
  name: MediaDescriptorOperation,
  args: Record<string, unknown>,
): Promise<T> {
  if (platformRuntimeProvider() !== "supabase") {
    throw new MediaGatewayError("AWS_MEDIA_ARCHITECTURE_PENDING", "The AWS media architecture is pending approval.");
  }

  const client = await createSessionClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    throw new MediaGatewayError("AUTHENTICATED_SESSION_REQUIRED", "An authenticated session is required.");
  }

  const requestId = crypto.randomUUID();
  const { url } = publicSupabaseEnv();
  const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/authenticated-media-rpc`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    body: JSON.stringify({ name, args }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  let payload: GatewayPayload<T>;
  try {
    payload = await response.json() as GatewayPayload<T>;
  } catch {
    throw new MediaGatewayError("MEDIA_GATEWAY_INVALID_RESPONSE", "The media gateway returned an invalid response.");
  }
  if (!response.ok || !payload.ok) {
    const failure = payload as Extract<GatewayPayload<T>, { ok: false }>;
    throw new MediaGatewayError(
      failure.code ?? `MEDIA_GATEWAY_HTTP_${response.status}`,
      failure.message ?? "The media gateway rejected the request.",
    );
  }
  return payload.data;
}
