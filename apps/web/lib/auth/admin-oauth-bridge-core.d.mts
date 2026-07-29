export const DEFAULT_LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN: string;

export function isLocalApplicationOrigin(value: string | undefined): boolean;
export function localAdminCallbackUrl(value: string | undefined): URL | null;
export function adminOAuthRedirectTarget(input: {
  applicationOrigin: string;
  requestOrigin?: string;
  bridgeOrigin?: string;
}): string;
