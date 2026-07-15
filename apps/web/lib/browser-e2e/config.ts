import "server-only";

export const BROWSER_E2E_COOKIE = "estimulo_browser_e2e";

function loopbackUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

export function browserE2EEnabled(): boolean {
  const token = process.env.BROWSER_E2E_TOKEN?.trim() ?? "";
  return process.env.BROWSER_E2E_MODE === "synthetic"
    && token.length >= 24
    && loopbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function browserE2EToken(): string {
  if (!browserE2EEnabled()) throw new Error("BROWSER_E2E_DISABLED");
  return process.env.BROWSER_E2E_TOKEN!.trim();
}

export function browserE2EStateFile(): string {
  if (!browserE2EEnabled()) throw new Error("BROWSER_E2E_DISABLED");
  return process.env.BROWSER_E2E_STATE_FILE?.trim() || "/tmp/estimulo-browser-e2e-state.json";
}

export function browserE2EStorageDir(): string {
  if (!browserE2EEnabled()) throw new Error("BROWSER_E2E_DISABLED");
  return process.env.BROWSER_E2E_STORAGE_DIR?.trim() || "/tmp/estimulo-browser-e2e-storage";
}
