import "server-only";
import { HubSpotContractError } from "./contracts.js";
import { HubSpotHttpAdapter } from "./http-adapter.js";

export function createHubSpotHttpAdapterFromEnvironment() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN?.trim() ?? "";
  const portalId = process.env.HUBSPOT_PORTAL_ID?.trim() ?? "";
  if (!token || !portalId) {
    throw new HubSpotContractError(
      "HUBSPOT_ADAPTER_NOT_CONFIGURED",
      "The real HubSpot adapter is disabled until the private app token and portal ID are configured."
    );
  }
  return new HubSpotHttpAdapter({
    privateAppToken: token,
    portalId,
    apiBaseUrl: process.env.HUBSPOT_API_BASE_URL?.trim() || undefined,
    timeoutMs: process.env.HUBSPOT_API_TIMEOUT_MS
      ? Number(process.env.HUBSPOT_API_TIMEOUT_MS)
      : undefined,
  });
}
