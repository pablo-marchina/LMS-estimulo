import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, code: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, code: "EDGE_CONFIGURATION_MISSING" }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_landing_journey`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ ok: false, code: "LANDING_JOURNEY_UNAVAILABLE" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: jsonHeaders });
  } catch {
    return new Response(JSON.stringify({ ok: false, code: "LANDING_JOURNEY_FAILED" }), {
      status: 502,
      headers: jsonHeaders,
    });
  }
});
