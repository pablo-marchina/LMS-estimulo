export type ScanResult = {
  scanStatus: "clean" | "infected" | "unsupported" | "manual_review";
  threats: unknown[];
  statusReasons: unknown[];
  scannerProvider: string;
  scannerVersion: string;
  providerReference: string;
};
export function manualReviewResult(code: string, providerReference: string): ScanResult;
export function normalizeExternalScanResponse(value: unknown): ScanResult;
export function externalScannerHeaders(input: {
  apiKey: string;
  sha256: string;
  contentType: string;
  sizeBytes: number;
}): Record<string, string>;
export function validateExternalScannerUrl(value: string): string;
