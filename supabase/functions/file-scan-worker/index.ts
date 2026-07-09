import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const QUEUE_CODE = "file_scan";
const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_VISIBILITY_SECONDS = 120;
const MAX_BATCH_SIZE = 10;
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

interface QueueDelivery {
  receipt_handle: string;
  job_id: string;
  job_type: string;
  job_version: number;
  receive_count: number;
  visibility_deadline: string;
  enqueued_at: string;
  payload: Record<string, unknown>;
  message_headers: Record<string, unknown>;
}

interface ScanResult {
  scanStatus: "clean" | "infected" | "unsupported" | "manual_review";
  threats: unknown[];
  statusReasons: unknown[];
  scannerProvider: string;
  scannerVersion: string;
  providerReference: string;
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-request-id",
  "access-control-allow-methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function normalizeContentType(value: unknown) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

function requiredString(value: unknown, name: string) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name}_required`);
  return result;
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error("invalid_integer_parameter");
  }
  return parsed;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function unwrapOne<T>(data: T[] | T | null, operation: string): T {
  if (Array.isArray(data)) {
    if (data.length !== 1) throw new Error(`${operation}_expected_one_row`);
    return data[0];
  }
  if (!data) throw new Error(`${operation}_missing_data`);
  return data;
}

async function callRpc<T>(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}_failed:${error.message}`);
  return data as T;
}

async function proofScan(client: SupabaseClient, payload: Record<string, unknown>): Promise<ScanResult> {
  const profile = requiredString(payload.uploadProfileCode, "upload_profile_code");
  if (profile !== "e12_storage_proof") {
    throw new Error("scanner_not_configured_for_profile");
  }

  const bucketName = requiredString(payload.bucket, "bucket");
  const objectKey = requiredString(payload.objectKey, "object_key");
  const expectedHash = requiredString(payload.sha256, "sha256").toLowerCase();
  const expectedContentType = normalizeContentType(payload.contentType);
  const expectedSize = boundedInteger(payload.sizeBytes, -1, 0, 5 * 1024 * 1024);

  if (expectedContentType !== "text/plain") {
    return {
      scanStatus: "unsupported",
      threats: [],
      statusReasons: [{ code: "proof_scanner_text_only", contentType: expectedContentType }],
      scannerProvider: "e12-proof-integrity-scanner",
      scannerVersion: "1.0.0",
      providerReference: crypto.randomUUID(),
    };
  }

  const bucket = client.storage.from(bucketName);
  const download = await bucket.download(objectKey);
  if (download.error || !download.data) {
    throw new Error(`storage_download_failed:${errorText(download.error)}`);
  }

  const bytes = await download.data.arrayBuffer();
  if (bytes.byteLength !== expectedSize) throw new Error("file_size_mismatch");
  const actualHash = hex(await crypto.subtle.digest("SHA-256", bytes));
  if (actualHash !== expectedHash) throw new Error("file_hash_mismatch");

  const text = new TextDecoder().decode(bytes);
  const infected = text.includes(EICAR_SIGNATURE);
  return {
    scanStatus: infected ? "infected" : "clean",
    threats: infected ? [{ name: "EICAR-Test-File", category: "test_signature" }] : [],
    statusReasons: [{ code: "technical_proof_only", sha256Verified: true }],
    scannerProvider: "e12-proof-integrity-scanner",
    scannerVersion: "1.0.0",
    providerReference: crypto.randomUUID(),
  };
}

async function ensureReleased(
  client: SupabaseClient,
  scan: {
    file_object_id: string;
    source_bucket: string;
    source_object_key: string;
    target_object_key: string | null;
    next_security_status: string;
    already_applied: boolean;
  },
) {
  if (scan.next_security_status === "clean") return { released: true, alreadyReleased: true };
  if (scan.next_security_status !== "release_pending" || !scan.target_object_key) {
    return { released: false, alreadyReleased: false };
  }

  const bucket = client.storage.from(scan.source_bucket);
  let targetInfo = await bucket.info(scan.target_object_key);
  if (targetInfo.error || !targetInfo.data) {
    const moved = await bucket.move(scan.source_object_key, scan.target_object_key);
    if (moved.error) {
      targetInfo = await bucket.info(scan.target_object_key);
      if (targetInfo.error || !targetInfo.data) {
        throw new Error(`release_move_failed:${errorText(moved.error)}`);
      }
    } else {
      targetInfo = await bucket.info(scan.target_object_key);
    }
  }

  if (targetInfo.error || !targetInfo.data) {
    throw new Error(`released_object_info_failed:${errorText(targetInfo.error)}`);
  }

  const completed = await client.rpc("file_complete_release", {
    p_file_object_id: scan.file_object_id,
    p_target_object_key: scan.target_object_key,
    p_provider_object_version: targetInfo.data.version ?? null,
    p_etag: targetInfo.data.eTag ?? null,
  });
  if (completed.error) throw new Error(`file_complete_release_failed:${completed.error.message}`);
  return { released: true, alreadyReleased: scan.already_applied };
}

function isPermanentFailure(message: string) {
  return [
    "scanner_not_configured_for_profile",
    "upload_profile_code_required",
    "bucket_required",
    "object_key_required",
    "sha256_required",
    "invalid_integer_parameter",
    "file_size_mismatch",
    "file_hash_mismatch",
    "scan_job_file_mismatch",
    "file_scan_job_mismatch",
    "invalid_job_type",
  ].some((code) => message.includes(code));
}

function retryDelaySeconds(receiveCount: number) {
  const cap = Math.min(900, 15 * 2 ** Math.max(0, receiveCount - 1));
  return Math.max(1, Math.floor(Math.random() * cap));
}

async function processDelivery(client: SupabaseClient, workerId: string, delivery: QueueDelivery) {
  if (delivery.job_type !== "file.malware_scan.requested" || delivery.job_version !== 1) {
    await callRpc(client, "queue_dead_letter_job", {
      p_receipt_handle: delivery.receipt_handle,
      p_worker_id: workerId,
      p_reason_code: "invalid_job_type",
      p_reason_details: { jobType: delivery.job_type, jobVersion: delivery.job_version },
    });
    return { jobId: delivery.job_id, outcome: "dead_lettered", reason: "invalid_job_type" };
  }

  await callRpc(client, "queue_extend_visibility", {
    p_receipt_handle: delivery.receipt_handle,
    p_worker_id: workerId,
    p_visibility_timeout_seconds: DEFAULT_VISIBILITY_SECONDS,
  });

  const startedAt = new Date().toISOString();
  try {
    const fileObjectId = requiredString(delivery.payload.fileObjectId, "file_object_id");
    const stateData = await callRpc<unknown>(client, "file_get_scan_job_state", {
      p_queue_job_id: delivery.job_id,
      p_file_object_id: fileObjectId,
    });
    const state = unwrapOne(stateData as Record<string, unknown>[] | Record<string, unknown>, "file_get_scan_job_state") as {
      file_object_id: string;
      queue_job_id: string;
      security_status: string;
      scan_applied: boolean;
      scan_status: string | null;
      source_bucket: string;
      source_object_key: string;
      target_object_key: string | null;
    };

    if (state.scan_applied) {
      const release = state.scan_status === "clean"
        ? await ensureReleased(client, {
          file_object_id: state.file_object_id,
          source_bucket: state.source_bucket,
          source_object_key: state.source_object_key,
          target_object_key: state.target_object_key,
          next_security_status: state.security_status,
          already_applied: true,
        })
        : { released: false, alreadyReleased: true };
      await callRpc(client, "queue_ack_job", {
        p_receipt_handle: delivery.receipt_handle,
        p_worker_id: workerId,
        p_result_details: {
          scanStatus: state.scan_status,
          released: release.released,
          duplicateSuppressed: true,
          recoveryPath: true,
        },
      });
      return {
        jobId: delivery.job_id,
        outcome: "completed",
        scanStatus: state.scan_status,
        released: release.released,
        alreadyApplied: true,
        recoveryPath: true,
      };
    }

    const scanResult = await proofScan(client, delivery.payload);
    const appliedData = await callRpc<unknown>(client, "file_apply_scan_result", {
      p_queue_job_id: delivery.job_id,
      p_file_object_id: fileObjectId,
      p_scanner_provider: scanResult.scannerProvider,
      p_scanner_version: scanResult.scannerVersion,
      p_scan_status: scanResult.scanStatus,
      p_threats: scanResult.threats,
      p_status_reasons: scanResult.statusReasons,
      p_provider_reference: scanResult.providerReference,
      p_started_at: startedAt,
      p_completed_at: new Date().toISOString(),
    });
    const applied = unwrapOne(appliedData as Record<string, unknown>[] | Record<string, unknown>, "file_apply_scan_result") as {
      file_object_id: string;
      source_bucket: string;
      source_object_key: string;
      target_object_key: string | null;
      next_security_status: string;
      already_applied: boolean;
    };

    const release = scanResult.scanStatus === "clean"
      ? await ensureReleased(client, applied)
      : { released: false, alreadyReleased: false };

    await callRpc(client, "queue_ack_job", {
      p_receipt_handle: delivery.receipt_handle,
      p_worker_id: workerId,
      p_result_details: {
        scanStatus: scanResult.scanStatus,
        released: release.released,
        scannerProvider: scanResult.scannerProvider,
      },
    });

    return {
      jobId: delivery.job_id,
      outcome: "completed",
      scanStatus: scanResult.scanStatus,
      released: release.released,
      alreadyApplied: applied.already_applied,
    };
  } catch (error) {
    const message = errorText(error);
    if (isPermanentFailure(message)) {
      await callRpc(client, "queue_dead_letter_job", {
        p_receipt_handle: delivery.receipt_handle,
        p_worker_id: workerId,
        p_reason_code: message.split(":", 1)[0].slice(0, 120),
        p_reason_details: { message },
      });
      return { jobId: delivery.job_id, outcome: "dead_lettered", reason: message };
    }

    const delaySeconds = retryDelaySeconds(delivery.receive_count);
    const retry = await callRpc<string>(client, "queue_retry_job", {
      p_receipt_handle: delivery.receipt_handle,
      p_worker_id: workerId,
      p_error_code: message.split(":", 1)[0].slice(0, 120),
      p_delay_seconds: delaySeconds,
      p_error_details: { message, delaySeconds },
    });
    return { jobId: delivery.job_id, outcome: retry, reason: message, delaySeconds };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  if (!PROJECT_URL || !SERVICE_ROLE_KEY) return response({ error: "worker_not_configured" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const dispatchToken = requiredString(body.dispatchToken, "dispatch_token");
    const requestedWorkerId = String(body.workerId ?? "").trim();
    const workerId = requestedWorkerId || `file-scan-worker-${crypto.randomUUID()}`;
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(workerId)) throw new Error("invalid_worker_id");

    const client = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const claimData = await callRpc<unknown>(client, "queue_claim_dispatch_token", {
      p_raw_token: dispatchToken,
      p_worker_id: workerId,
    });
    const claim = unwrapOne(claimData as Record<string, unknown>[] | Record<string, unknown>, "queue_claim_dispatch_token") as {
      schedule_code: string;
      queue_code: string;
      batch_size: number;
      visibility_timeout_seconds: number;
    };
    if (claim.queue_code !== QUEUE_CODE) throw new Error("dispatch_token_queue_mismatch");
    const batchSize = boundedInteger(claim.batch_size, DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE);
    const visibilitySeconds = boundedInteger(
      claim.visibility_timeout_seconds,
      DEFAULT_VISIBILITY_SECONDS,
      30,
      43200,
    );

    const deliveries = await callRpc<QueueDelivery[]>(client, "queue_receive_jobs", {
      p_queue_code: claim.queue_code,
      p_worker_id: workerId,
      p_batch_size: batchSize,
      p_visibility_timeout_seconds: visibilitySeconds,
    });

    const results = [];
    for (const delivery of deliveries ?? []) {
      results.push(await processDelivery(client, workerId, delivery));
    }

    return response({
      queueCode: QUEUE_CODE,
      workerId,
      received: deliveries?.length ?? 0,
      results,
    });
  } catch (error) {
    const message = errorText(error);
    const status = message.includes("dispatch_token_unavailable") || message.includes("dispatch_token_worker_mismatch") ? 403
      : message.includes("invalid_") || message.includes("required") || message.includes("mismatch") ? 400
      : 500;
    return response({ error: message }, status);
  }
});
