import "server-only";
import type { DefinitionSummary } from "@/lib/admin/product-management";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type AdminGamificationWorkspace = {
  organization_id: string;
  rules: DefinitionSummary[];
  journeys: DefinitionSummary[];
  point_rules: DefinitionSummary[];
  badges: DefinitionSummary[];
  certificates: DefinitionSummary[];
};

export async function getAdminGamificationWorkspace(actorUserAccountId: string, organizationId: string) {
  return invokeServerRpc<AdminGamificationWorkspace>("get_admin_gamification_workspace", {
    p_actor_user_account_id: actorUserAccountId,
    p_organization_id: organizationId,
  });
}
