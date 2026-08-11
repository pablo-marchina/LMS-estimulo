import "server-only";
import { getAdminProductWorkspace, type DefinitionSummary } from "@/lib/admin/product-management";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

export type AdminGamificationWorkspace = {
  organization_id: string;
  rules: DefinitionSummary[];
  journeys: DefinitionSummary[];
  point_rules: DefinitionSummary[];
  badges: DefinitionSummary[];
  certificates: DefinitionSummary[];
};

function isGamificationWorkspaceCompatibilityError(error: unknown) {
  if (!(error instanceof ServerRpcError)) return false;

  const code = error.code.trim().toUpperCase();
  if (code === "PGRST202" || code === "RPC_NOT_ALLOWED") return true;

  const detail = error.message.toLowerCase();
  return detail.includes("get_admin_gamification_workspace") &&
    (detail.includes("could not find") || detail.includes("does not exist") || detail.includes("not found"));
}

export async function getAdminGamificationWorkspace(actorUserAccountId: string, organizationId: string) {
  try {
    return await invokeServerRpc<AdminGamificationWorkspace>("get_admin_gamification_workspace", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    });
  } catch (error) {
    if (!isGamificationWorkspaceCompatibilityError(error)) throw error;

    // The dedicated workspace was introduced after the general product workspace.
    // A database or authenticated-rpc deployment can temporarily lag the web app
    // during rollout. Use the older, equivalent projection only for those explicit
    // compatibility cases; permission and data errors are never hidden here.
    const workspace = await getAdminProductWorkspace(actorUserAccountId, organizationId);
    return {
      organization_id: workspace.organization_id,
      rules: workspace.rules,
      journeys: workspace.journeys,
      point_rules: workspace.point_rules,
      badges: workspace.badges,
      certificates: workspace.certificates,
    } satisfies AdminGamificationWorkspace;
  }
}
