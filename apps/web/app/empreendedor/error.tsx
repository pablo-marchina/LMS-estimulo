"use client";

import { ParticipantRouteError } from "@/components/participant-route-error";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ParticipantRouteError reset={reset} />;
}
