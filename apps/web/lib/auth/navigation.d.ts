import type { IdentityContext } from "../journey-runtime/contracts";

export declare function isProtectedPath(pathname: string): boolean;
export declare function sanitizeReturnTo(value: string | null | undefined): string | null;
export declare function defaultAuthenticatedDestination(identity: IdentityContext): string | null;
export declare function isAuthorizedDestination(identity: IdentityContext, value: string | null | undefined): boolean;
export declare function resolveAuthenticatedDestination(
  identity: IdentityContext,
  requestedReturnTo: string | null | undefined
): string | null;
