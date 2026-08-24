import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [participantContext, quickCheckAction] = await Promise.all([
  readFile("apps/web/lib/auth/participant-context.ts", "utf8"),
  readFile("apps/web/app/actions/quick-check.ts", "utf8"),
]);

test("transient identity gateway failures do not force participant logout", () => {
  assert.match(participantContext, /reason\.startsWith\("RPC_GATEWAY_"\)/u);
  assert.match(participantContext, /PARTICIPANT_IDENTITY_TEMPORARILY_UNAVAILABLE/u);
  assert.match(participantContext, /if \(auth\.status === "anonymous"\) redirect\("\/entrar"\)/u);
  assert.doesNotMatch(participantContext, /auth\.status !== "authenticated"[^\n]*redirect\("\/entrar"\)/u);
});

test("quick check reuses participant auth semantics instead of treating infrastructure errors as logout", () => {
  assert.match(quickCheckAction, /requireParticipantContext/u);
  assert.match(quickCheckAction, /const auth = await requireParticipantContext\(\)/u);
  assert.doesNotMatch(quickCheckAction, /auth\.status !== "authenticated"[^\n]*redirect\("\/entrar"\)/u);
});

test("quick check retries transient state refresh failures before surfacing an error", () => {
  assert.match(quickCheckAction, /RPC_GATEWAY_TIMEOUT/u);
  assert.match(quickCheckAction, /RPC_GATEWAY_UNAVAILABLE/u);
  assert.match(quickCheckAction, /RPC_GATEWAY_QUEUE_TIMEOUT/u);
  assert.match(quickCheckAction, /QUICK_CHECK_REFRESH_RETRY/u);
  assert.match(quickCheckAction, /attempt <= 2/u);
  assert.match(quickCheckAction, /setTimeout\(resolve, 150\)/u);
});
