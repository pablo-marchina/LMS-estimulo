"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();

export async function selfEnrollAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const journeyVersionId = uuid.parse(formData.get("journey_version_id"));
  const key = String(formData.get("idempotency_key") || randomUUID());
  try {
    await journeyRuntime.selfEnroll(auth.identity.user_account_id, journeyVersionId, key);
  } catch {
    redirect("/empreendedor/trilhas?erro=matricula");
  }
  redirect("/empreendedor?matricula=criada");
}
