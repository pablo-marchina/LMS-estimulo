import "server-only";

/**
 * Compatibility facade.
 *
 * Request-level orchestration lives in `@/lib/request-context/auth-context`.
 * Domain auth modules must not depend directly on sibling product modules.
 */
export {
  getAuthContext,
  type AuthContext,
} from "@/lib/request-context/auth-context";
