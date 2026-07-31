import "server-only";

import { publicSupabaseEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

export async function triggerDeliveryGrading(submissionId: string) {
  const client = await createSessionClient();
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("AUTHENTICATED_SESSION_REQUIRED");
  const { url } = publicSupabaseEnv();
  const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/ai-grade-submission`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ submission_id: submissionId }),
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; code?: string; data?: unknown } | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.code || `AI_GRADING_HTTP_${response.status}`);
  return payload.data;
}
