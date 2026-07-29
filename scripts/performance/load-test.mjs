import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function integer(name, fallback, minimum, maximum) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function decimal(name, fallback, minimum, maximum) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a number between ${minimum} and ${maximum}`);
  }
  return value;
}

function targetUrl() {
  const base = new URL(process.env.LOAD_TEST_BASE_URL?.trim() || "http://127.0.0.1:3000");
  if (base.username || base.password) throw new Error("LOAD_TEST_BASE_URL must not include credentials");
  const local = ["localhost", "127.0.0.1", "::1"].includes(base.hostname);
  if (!local && base.protocol !== "https:") throw new Error("External load-test targets must use HTTPS");
  if (!local && process.env.LOAD_TEST_CONFIRM_EXTERNAL_TARGET !== "true") {
    throw new Error("Set LOAD_TEST_CONFIRM_EXTERNAL_TARGET=true to test a non-local target");
  }
  const requestPath = process.env.LOAD_TEST_PATH?.trim() || "/api/health/live";
  return new URL(requestPath, base);
}

function mapToObject(map, sorter) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => sorter(left, right)));
}

const url = targetUrl();
const concurrency = integer("LOAD_TEST_CONCURRENCY", 10, 1, 500);
const durationSeconds = integer("LOAD_TEST_DURATION_SECONDS", 10, 1, 900);
const warmupSeconds = integer("LOAD_TEST_WARMUP_SECONDS", 2, 0, 60);
const requestTimeoutMs = integer("LOAD_TEST_REQUEST_TIMEOUT_MS", 5_000, 100, 60_000);
const maximumErrorRate = decimal("LOAD_TEST_MAX_ERROR_RATE", 0.01, 0, 1);
const maximumP95Ms = decimal("LOAD_TEST_MAX_P95_MS", 2_000, 1, 120_000);
const maximumP99Ms = decimal("LOAD_TEST_MAX_P99_MS", 5_000, 1, 120_000);
const expectedStatuses = new Set(
  (process.env.LOAD_TEST_EXPECTED_STATUS ?? "200")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Number.isInteger),
);
const method = (process.env.LOAD_TEST_METHOD?.trim() || "GET").toUpperCase();
const requestBody = process.env.LOAD_TEST_BODY?.trim();
const bearerToken = process.env.LOAD_TEST_BEARER_TOKEN?.trim();

function requestHeaders() {
  const headers = new Headers({
    accept: "application/json",
    "user-agent": "lms-estimulo-capacity-test/1.0",
  });
  if (requestBody) headers.set("content-type", "application/json");
  if (bearerToken) headers.set("authorization", `Bearer ${bearerToken}`);
  return headers;
}

const latencyCeilingMs = requestTimeoutMs + 1_000;
const latencyHistogram = new Uint32Array(latencyCeilingMs + 1);
const statusCounts = new Map();
const errorCounts = new Map();
let requests = 0;
let failures = 0;
let minimumLatencyMs = Number.POSITIVE_INFINITY;
let maximumLatencyMs = 0;

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function recordResult(status, error, durationMs) {
  requests += 1;
  increment(statusCounts, status);
  if (error) {
    failures += 1;
    increment(errorCounts, error);
  }
  minimumLatencyMs = Math.min(minimumLatencyMs, durationMs);
  maximumLatencyMs = Math.max(maximumLatencyMs, durationMs);
  const bucket = Math.min(latencyCeilingMs, Math.max(0, Math.ceil(durationMs)));
  latencyHistogram[bucket] += 1;
}

function percentile(fraction) {
  if (requests === 0) return 0;
  const target = Math.max(1, Math.ceil(requests * fraction));
  let cumulative = 0;
  for (let index = 0; index < latencyHistogram.length; index += 1) {
    cumulative += latencyHistogram[index];
    if (cumulative >= target) return index;
  }
  return latencyCeilingMs;
}

async function oneRequest(record) {
  const startedAt = performance.now();
  let status = 0;
  let error = null;
  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders(),
      body: requestBody || undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    status = response.status;
    await response.arrayBuffer();
    if (!expectedStatuses.has(status)) error = `unexpected_status_${status}`;
  } catch (cause) {
    error = cause instanceof Error ? cause.name : "request_failed";
  }
  if (record) recordResult(status, error, Math.max(0, performance.now() - startedAt));
}

async function warmup() {
  if (warmupSeconds === 0) return;
  const deadline = performance.now() + warmupSeconds * 1_000;
  await Promise.all(Array.from({ length: Math.min(concurrency, 25) }, async () => {
    while (performance.now() < deadline) await oneRequest(false);
  }));
}

await warmup();

const startedAt = performance.now();
const deadline = startedAt + durationSeconds * 1_000;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (performance.now() < deadline) await oneRequest(true);
}));
const elapsedSeconds = Math.max(0.001, (performance.now() - startedAt) / 1_000);
const errorRate = requests === 0 ? 1 : failures / requests;

const report = {
  schema_version: "1.0",
  target: `${url.origin}${url.pathname}`,
  method,
  concurrency,
  duration_seconds: Number(elapsedSeconds.toFixed(3)),
  request_timeout_ms: requestTimeoutMs,
  expected_statuses: [...expectedStatuses].sort((left, right) => left - right),
  requests,
  requests_per_second: Number((requests / elapsedSeconds).toFixed(2)),
  failures,
  error_rate: Number(errorRate.toFixed(6)),
  latency_ms: {
    min: Number((Number.isFinite(minimumLatencyMs) ? minimumLatencyMs : 0).toFixed(2)),
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: Number(maximumLatencyMs.toFixed(2)),
    histogram_resolution_ms: 1,
    overflow_bucket_ms: latencyCeilingMs,
  },
  status_counts: mapToObject(statusCounts, (left, right) => Number(left) - Number(right)),
  error_counts: mapToObject(errorCounts, (left, right) => String(left).localeCompare(String(right))),
  thresholds: {
    maximum_error_rate: maximumErrorRate,
    maximum_p95_ms: maximumP95Ms,
    maximum_p99_ms: maximumP99Ms,
  },
};

const failuresAgainstThreshold = [];
if (requests === 0) failuresAgainstThreshold.push("no_requests_completed");
if (errorRate > maximumErrorRate) failuresAgainstThreshold.push("error_rate_exceeded");
if (report.latency_ms.p95 > maximumP95Ms) failuresAgainstThreshold.push("p95_exceeded");
if (report.latency_ms.p99 > maximumP99Ms) failuresAgainstThreshold.push("p99_exceeded");
report.status = failuresAgainstThreshold.length === 0 ? "passed" : "failed";
report.threshold_failures = failuresAgainstThreshold;

await mkdir(path.resolve(".artifacts"), { recursive: true });
await writeFile(
  path.resolve(".artifacts/load-test.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failuresAgainstThreshold.length > 0) process.exitCode = 1;
