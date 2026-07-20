import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  externalScannerHeaders,
  manualReviewResult,
  normalizeExternalScanResponse,
  validateExternalScannerUrl,
} from "../../supabase/functions/file-scan-worker/scanner-contract.mjs";

const worker = await readFile("supabase/functions/file-scan-worker/index.ts", "utf8");

test("external scanner contract validates allowlisted statuses and bounded metadata", () => {
  const clean = normalizeExternalScanResponse({
    status: "clean", threats: [], reasons: [{ code: "none" }],
    provider: "scanner-sandbox", version: "1.2.3", reference: "scan-123",
  });
  assert.equal(clean.scanStatus, "clean");
  assert.throws(() => normalizeExternalScanResponse({ status: "safe", provider: "x", version: "1", reference: "x" }), /status_invalid/u);
  assert.throws(() => normalizeExternalScanResponse({ status: "clean", threats: new Array(51).fill({}), provider: "x", version: "1", reference: "x" }), /threats_invalid/u);
});

test("scanner request discloses only technical metadata and requires HTTPS", () => {
  const headers = externalScannerHeaders({ apiKey: "secret", sha256: "a".repeat(64), contentType: "application/pdf", sizeBytes: 10 });
  assert.equal(headers.authorization, "Bearer secret");
  assert.equal(headers["x-file-size"], "10");
  assert.equal("x-file-name" in headers, false);
  assert.equal("x-object-key" in headers, false);
  assert.equal(validateExternalScannerUrl("https://scanner.example.test/v1/scan"), "https://scanner.example.test/v1/scan");
  assert.throws(() => validateExternalScannerUrl("http://scanner.example.test/scan"), /must_be_https/u);
});

test("missing scanner configuration yields manual review and never clean", () => {
  const result = manualReviewResult("external_scanner_not_configured", "ref-1");
  assert.equal(result.scanStatus, "manual_review");
  assert.equal(result.scannerProvider, "estimulo-scanner-gate");
  assert.match(worker, /external_scanner_not_configured/u);
  assert.match(worker, /scanResult\.scanStatus === "clean"/u);
  assert.doesNotMatch(worker, /scanner_not_configured_for_profile/u);
});

test("real profiles use external scanning while the proof profile remains isolated", () => {
  assert.match(worker, /profile === "e12_storage_proof"/u);
  assert.match(worker, /return externalScan\(client, payload\)/u);
  assert.match(worker, /MALWARE_SCANNER_URL/u);
  assert.match(worker, /MALWARE_SCANNER_API_KEY/u);
  assert.match(worker, /AbortSignal\.timeout/u);
  assert.match(worker, /MAX_SCAN_BYTES = 25 \* 1024 \* 1024/u);
});
