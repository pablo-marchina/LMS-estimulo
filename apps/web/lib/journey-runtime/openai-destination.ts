import "server-only";

import { randomUUID } from "node:crypto";
import type { FirstTouchAttribution } from "@/lib/auth/first-touch";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const CHATGPT_SLUG = "chatgpt-para-facilitar-o-seu-dia-a-dia";

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

export function isOpenAiCampaign(attribution: FirstTouchAttribution | null): boolean {
  if (!attribution) return false;
  const signal = [
    attribution.utm_source,
    attribution.utm_campaign,
    attribution.utm_content,
    attribution.landing_path,
  ].map(normalized).join(" ");
  return signal.includes("openai") || signal.includes("chatgpt");
}

export async function resolveOpenAiJourneyDestination(actorUserAccountId: string): Promise<string | null> {
  const participant = await journeyRuntime.listParticipantJourneys(actorUserAccountId);
  const enrolled = participant.journeys.find((journey) =>
    journey.journey_slug === CHATGPT_SLUG
    || normalized(journey.journey_title).includes("chatgpt"),
  );
  if (enrolled) return `/empreendedor/jornada/${enrolled.journey_instance_id}`;

  const eligible = await journeyRuntime.listEligibleJourneys(actorUserAccountId);
  const target = eligible.find((journey) => normalized(journey.title).includes("chatgpt"));
  if (!target) return null;

  const key = `openai-entry:${randomUUID()}`;
  const enrollment = await journeyRuntime.selfEnroll(actorUserAccountId, target.journey_version_id, key);
  const journeyInstanceId = enrollment.data.journey_instance_id;

  let state = await journeyRuntime.getParticipantState(actorUserAccountId, journeyInstanceId);
  if (state.journey_status === "available") {
    await journeyRuntime.startJourney(
      actorUserAccountId,
      journeyInstanceId,
      state.journey_aggregate_version,
      `${key}:start`,
    );
    state = await journeyRuntime.getParticipantState(actorUserAccountId, journeyInstanceId);
  }
  if (!state.s?.step_instance_id) {
    await journeyRuntime.ensureDefaultPath(actorUserAccountId, journeyInstanceId, `${key}:default-path`);
  }

  return `/empreendedor/jornada/${journeyInstanceId}`;
}
