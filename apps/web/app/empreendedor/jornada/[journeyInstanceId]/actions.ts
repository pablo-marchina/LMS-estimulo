"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();
const version = z.coerce.number().int().nonnegative();
const stepStatus = z.enum(["available", "in_progress", "completed"]);

export async function openJourneyActivityAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");

  const journeyInstanceId = uuid.parse(formData.get("journey_instance_id"));
  const stepInstanceId = uuid.parse(formData.get("step_instance_id"));
  const aggregateVersion = version.parse(formData.get("step_aggregate_version"));
  const status = stepStatus.parse(formData.get("step_status"));
  const key = String(formData.get("idempotency_key") || randomUUID());

  if (status === "available") {
    await journeyRuntime.startActivity(auth.identity.user_account_id, stepInstanceId, aggregateVersion, `${key}:start`);
  }
  await journeyRuntime.focusActivity(auth.identity.user_account_id, journeyInstanceId, stepInstanceId, `${key}:focus`);

  redirect(`/empreendedor/atividade/${stepInstanceId}?journey=${journeyInstanceId}`);
}