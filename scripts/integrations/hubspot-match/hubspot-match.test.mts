import assert from "node:assert/strict";
import test from "node:test";
import { resolveIdentityMatch } from "../../../apps/web/lib/identity/hubspot-match.js";

const subject = { cpfLookupHmac: "hmac-a", emailNormalized: "maria@example.com", phoneE164: "+5511912345678" };

test("no candidates share any signal -> no_match_create", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-z", emailNormalized: "outro@example.com", phoneE164: null } },
  ]);
  assert.deepEqual(result, { state: "no_match_create" });
});

test("exactly one candidate shares CPF -> single_match", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-a", emailNormalized: null, phoneE164: null } },
  ]);
  assert.equal(result.state, "single_match");
  assert.equal(result.candidateId, "c1");
  assert.deepEqual(result.matchedOn, ["cpf"]);
});

test("exactly one candidate shares phone only -> single_match", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-z", emailNormalized: null, phoneE164: "+5511912345678" } },
  ]);
  assert.equal(result.state, "single_match");
  assert.deepEqual(result.matchedOn, ["phone"]);
});

test("email matches but CPF differs -> conflict_blocked, never an automatic match", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-different", emailNormalized: "maria@example.com", phoneE164: null } },
  ]);
  assert.deepEqual(result, { state: "conflict_blocked", candidateId: "c1", reason: "email_matches_but_cpf_differs" });
});

test("email alone matching, with no CPF or phone on either side, is not enough to auto-match", () => {
  const result = resolveIdentityMatch(
    { cpfLookupHmac: null, emailNormalized: "maria@example.com", phoneE164: null },
    [{ candidateId: "c1", signals: { cpfLookupHmac: null, emailNormalized: "maria@example.com", phoneE164: null } }],
  );
  assert.equal(result.state, "multiple_matches_manual_resolution");
  assert.deepEqual(result.candidateIds, ["c1"]);
});

test("two or more candidates match by CPF/phone -> multiple_matches_manual_resolution, never auto-linked", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-a", emailNormalized: null, phoneE164: null } },
    { candidateId: "c2", signals: { cpfLookupHmac: null, emailNormalized: null, phoneE164: "+5511912345678" } },
  ]);
  assert.equal(result.state, "multiple_matches_manual_resolution");
  assert.deepEqual(result.candidateIds.sort(), ["c1", "c2"]);
});

test("no candidates at all -> no_match_create", () => {
  assert.deepEqual(resolveIdentityMatch(subject, []), { state: "no_match_create" });
});
