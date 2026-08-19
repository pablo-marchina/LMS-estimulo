import "server-only";
import { invokeExtensionsGateway } from "@/lib/extensions/gateway";
import type { JsonRecord } from "@/lib/extensions/runtime";

export type ParticipantShellContext = {
  organization_id: string;
  pending_legal_documents: JsonRecord[];
  has_b2b_access: boolean;
  library_item_count: number;
  has_library_content: boolean;
};

export const participantShellRuntime = {
  get(actorUserAccountId: string) {
    return invokeExtensionsGateway<ParticipantShellContext>("get_participant_shell_context", {
      p_actor_user_account_id: actorUserAccountId,
    });
  },
};
