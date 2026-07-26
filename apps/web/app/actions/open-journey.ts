"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();
const version = z.coerce.number().int().nonnegative();

export async function openJourneyAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const journeyInstanceId = uuid.parse(formData.get("journey_instance_id"));
  const aggregateVersion = version.parse(formData.get("aggregate_version"));
  const key = String(formData.get("idempotency_key") || randomUUID());

  await journeyRuntime.startJourney(auth.identity.user_account_id, journeyInstanceId, aggregateVersion, key);
  redirect(`/empreendedor/jornada/${journeyInstanceId}`);
}
