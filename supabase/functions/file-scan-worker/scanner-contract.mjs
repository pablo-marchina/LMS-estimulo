const ALLOWED_STATUSES = new Set(["clean", "infected", "unsupported", "manual_review"]);
const MAX_ARRAY_ITEMS = 50;
const MAX_RESULT_JSON_BYTES = 32 * 1024;

function requiredBoundedString(value, name, maximum = 240) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) throw new Error(`external_scanner_${name}_invalid`);
  return text;
}

function boundedJsonArray(value, name) {
  if (!Array.isArray(value) || value.length > MAX_ARRAY_ITEMS) {
    throw new Error(`external_scanner_${name}_invalid`);
  }
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).byteLength > MAX_RESULT_JSON_BYTES) {
    throw new Error(`external_scanner_${name}_too_large`);
  }
  return value;
}

export function manualReviewResult(code, providerReference) {
  return {
    scanStatus: "manual_review",
    threats: [],
    statusReasons: [{ code }],
    scannerProvider: "estimulo-scanner-gate",
    scannerVersion: "1.0.0",
    providerReference,
  };
}

export function normalizeExternalScanResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("external_scanner_response_invalid");
  }
  const record = value;
  const scanStatus = requiredBoundedString(record.status, "status", 32);
  if (!ALLOWED_STATUSES.has(scanStatus)) throw new Error("external_scanner_status_invalid");
  return {
    scanStatus,
    threats: boundedJsonArray(record.threats ?? [], "threats"),
    statusReasons: boundedJsonArray(record.reasons ?? [], "reasons"),
    scannerProvider: requiredBoundedString(record.provider, "provider", 120),
    scannerVersion: requiredBoundedString(record.version, "version", 80),
    providerReference: requiredBoundedString(record.reference, "reference", 240),
  };
}

export function externalScannerHeaders({ apiKey, sha256, contentType, sizeBytes }) {
  const secret = requiredBoundedString(apiKey, "api_key", 4096);
  const hash = requiredBoundedString(sha256, "sha256", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("external_scanner_sha256_invalid");
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0) throw new Error("external_scanner_size_invalid");
  return {
    authorization: `Bearer ${secret}`,
    "content-type": "application/octet-stream",
    "x-file-sha256": hash,
    "x-file-content-type": requiredBoundedString(contentType, "content_type", 160),
    "x-file-size": String(sizeBytes),
  };
}

export function validateExternalScannerUrl(value) {
  const url = new URL(requiredBoundedString(value, "url", 2048));
  if (url.protocol !== "https:") throw new Error("external_scanner_url_must_be_https");
  if (url.username || url.password || url.hash) throw new Error("external_scanner_url_invalid");
  return url.toString();
}
