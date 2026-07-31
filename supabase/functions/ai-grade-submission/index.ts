import { createClient } from "npm:@supabase/supabase-js@2.110.2";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function asArray(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(asRecord) : []; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

function compactEvidence(payload: Record<string, unknown>) {
  const submission = asRecord(payload.submission);
  const files = asArray(payload.files);
  return {
    text_content: text(submission.text_content).slice(0, 100_000),
    external_link: text(submission.external_link),
    files: files.map((file) => ({
      name: text(file.original_filename),
      content_type: text(file.content_type),
      evidence_type: text(file.evidence_type),
      extracted_content: text(file.extracted_content).slice(0, 100_000),
      static_analysis_only: asRecord(file.metadata).static_analysis_only === true,
    })),
  };
}

function fallbackReview(payload: Record<string, unknown>, reason = "AI_GRADING_PROVIDER_NOT_CONFIGURED") {
  const evidence = compactEvidence(payload);
  const available = Boolean(evidence.text_content || evidence.external_link || evidence.files.some((file) => file.extracted_content));
  return {
    score: null,
    confidence: 0,
    criterion_scores: [],
    feedback: available
      ? "A entrega foi recebida, mas a correção automática não pôde ser concluída. Encaminhada para revisão humana."
      : "A entrega contém formatos que exigem extração, transcrição ou análise multimodal. Encaminhada para revisão humana sem executar arquivos enviados.",
    metadata: { fallback: true, reason, safety: "no_code_execution" },
  };
}

function safeProviderEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost = host === "localhost" || host === "::1" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./u.test(host);
    return url.protocol === "https:" && !url.username && !url.password && !privateHost ? url.toString() : "";
  } catch {
    return "";
  }
}

async function providerReview(payload: Record<string, unknown>, service: ReturnType<typeof createClient>) {
  const configuration = asRecord(payload.configuration);
  const organizationId = text(configuration.owner_organization_id);
  let databaseProvider: Record<string, unknown> = {};
  if (organizationId) {
    const { data, error } = await service.rpc("get_ai_grading_provider_runtime", { p_organization_id: organizationId });
    if (!error && data) databaseProvider = asRecord(data);
  }

  const endpoint = safeProviderEndpoint(text(databaseProvider.endpoint_url) || Deno.env.get("AI_GRADING_API_URL")?.trim() || "");
  const apiKey = text(databaseProvider.api_key) || Deno.env.get("AI_GRADING_API_KEY")?.trim() || "";
  const model = text(databaseProvider.model_name) || Deno.env.get("AI_GRADING_MODEL")?.trim() || "";
  const providerName = text(databaseProvider.provider_name) || "Provedor configurado por ambiente";
  if (!endpoint || !apiKey || !model) return fallbackReview(payload);

  const rubric = asRecord(configuration.rubric);
  const evidence = compactEvidence(payload);
  const prompt = {
    role: "Você é um avaliador educacional. Avalie somente pelas evidências fornecidas e pela rubrica. Não execute código, macros ou arquivos. Para ZIP ou código, faça apenas análise estática do texto extraído. Declare baixa confiança quando faltarem evidências.",
    instructions: text(configuration.ai_instructions),
    rubric,
    reference_material: configuration.reference_material ?? [],
    passing_score: configuration.passing_score,
    evidence,
    output: {
      score: "number 0..100 ou null",
      confidence: "number 0..1",
      criterion_scores: [{ code: "string", score: "number", justification: "string", strengths: ["string"], improvements: ["string"] }],
      feedback: "string",
      metadata: { insufficient_evidence: "boolean", safety_notes: ["string"] },
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Retorne somente JSON válido. Nunca execute nem instrua a execução de arquivos enviados." },
          { role: "user", content: JSON.stringify(prompt) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return fallbackReview(payload, "AI_PROVIDER_CONNECTION_FAILED");
  }
  if (!response.ok) return fallbackReview(payload, `AI_PROVIDER_HTTP_${response.status}`);
  const providerPayload = asRecord(await response.json());
  const choices = Array.isArray(providerPayload.choices) ? providerPayload.choices : [];
  const content = text(asRecord(asRecord(choices[0]).message).content);
  try {
    const parsed = asRecord(JSON.parse(content));
    const score = parsed.score === null ? null : Math.max(0, Math.min(100, number(parsed.score)));
    const confidence = Math.max(0, Math.min(1, number(parsed.confidence)));
    return {
      score,
      confidence,
      criterion_scores: Array.isArray(parsed.criterion_scores) ? parsed.criterion_scores : [],
      feedback: text(parsed.feedback) || "Correção sem feedback textual.",
      metadata: { ...asRecord(parsed.metadata), provider: providerName, model, safety: "no_code_execution" },
    };
  } catch {
    return fallbackReview(payload, "AI_PROVIDER_INVALID_JSON");
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
  if (!token) return json(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { ok: false, code: "RUNTIME_CONFIGURATION_INVALID" });

  let submissionId = "";
  try { submissionId = text(asRecord(await request.json()).submission_id); } catch { return json(400, { ok: false, code: "INVALID_JSON" }); }
  if (!/^[0-9a-f-]{36}$/iu.test(submissionId)) return json(400, { ok: false, code: "SUBMISSION_ID_INVALID" });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user?.email_confirmed_at) return json(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED" });

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: account } = await service.schema("iam").from("user_accounts").select("id,status").eq("auth_user_id", userData.user.id).maybeSingle();
  if (!account || account.status !== "active") return json(403, { ok: false, code: "IDENTITY_NOT_LINKED" });

  const { data: payload, error: payloadError } = await service.rpc("get_delivery_grading_payload", { p_submission_id: submissionId });
  if (payloadError || !payload) return json(404, { ok: false, code: "DELIVERY_SUBMISSION_NOT_FOUND" });
  const submission = asRecord(asRecord(payload).submission);
  if (text(submission.user_account_id) !== account.id) return json(403, { ok: false, code: "DELIVERY_SUBMISSION_FORBIDDEN" });
  if (!["processing", "submitted"].includes(text(submission.status))) return json(409, { ok: false, code: "DELIVERY_SUBMISSION_NOT_PROCESSABLE" });

  const review = await providerReview(asRecord(payload), service);
  const configuration = asRecord(asRecord(payload).configuration);
  const providerModel = text(review.metadata && asRecord(review.metadata).model) || text(configuration.grading_model) || "human-review-fallback-v1";
  const { data: result, error: applyError } = await service.rpc("apply_ai_delivery_review", {
    p_submission_id: submissionId,
    p_result: review,
    p_model_reference: providerModel,
  });
  if (applyError) return json(500, { ok: false, code: applyError.code || "AI_REVIEW_APPLY_FAILED" });
  return json(200, { ok: true, data: result });
});
