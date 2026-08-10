import "server-only";
import { getAdminProductWorkspace, type DefinitionSummary } from "@/lib/admin/product-management";
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
  try {
    return await invokeServerRpc<AdminGamificationWorkspace>("get_admin_gamification_workspace", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    });
  } catch (error) {
    // The dedicated workspace was introduced after the general product workspace.
    // Keep the Admin scoring screen usable while a development/test database is
    // between those schema revisions; both payloads expose the same definitions.
    try {
      const workspace = await getAdminProductWorkspace(actorUserAccountId, organizationId);
      return {
        organization_id: workspace.organization_id,
        rules: workspace.rules,
        journeys: workspace.journeys,
        point_rules: workspace.point_rules,
        badges: workspace.badges,
        certificates: workspace.certificates,
      } satisfies AdminGamificationWorkspace;
    } catch {
      throw error;
    }
  }
}
