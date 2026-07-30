export const DEFAULT_LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN: string;
export const ADMIN_LOCAL_OAUTH_RETURN_COOKIE: string;

export function isLocalApplicationOrigin(value: string | undefined): boolean;
export function localAdminCallbackUrl(value: string | undefined): URL | null;
export function encodeLocalAdminCallback(value: string | undefined): string | null;
export function decodeLocalAdminCallback(value: string | undefined): URL | null;
export function adminOAuthPreparationTarget(input: {
  applicationOrigin: string;
  requestOrigin?: string;
  bridgeOrigin?: string;
}): string | null;
export function localAdminOAuthResumeUrl(callbackValue: string | undefined): URL | null;
export function adminOAuthRedirectTarget(input: {
  applicationOrigin: string;
  requestOrigin?: string;
  bridgeOrigin?: string;
}): string;
