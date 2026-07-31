"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export async function acceptPendingLegalDocumentsAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") throw new Error("AUTHENTICATION_REQUIRED");

  const documentIds = [...new Set(formData.getAll("legal_document_version_ids").map(String).filter(Boolean))];
  const acceptedIds = new Set(formData.getAll("accepted_document_ids").map(String));
  if (documentIds.length === 0 || documentIds.some((id) => !acceptedIds.has(id))) {
    throw new Error("LEGAL_ACCEPTANCE_REQUIRED");
  }

  for (const documentId of documentIds) {
    await extensionsRuntime.performParticipant({
      actorUserAccountId: auth.identity.user_account_id,
      action: "legal_accept",
      payload: {
        legal_document_version_id: documentId,
        metadata: { source: "required_reacceptance_gate" },
      },
      idempotencyKey: `${randomUUID()}:${documentId}`,
    });
  }

  revalidatePath("/empreendedor", "layout");
}
