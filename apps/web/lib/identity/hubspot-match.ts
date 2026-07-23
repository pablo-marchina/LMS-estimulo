export type IdentitySignal = {
  cpfLookupHmac: string | null;
  emailNormalized: string | null;
  phoneE164: string | null;
};

export type IdentityCandidate = {
  candidateId: string;
  signals: IdentitySignal;
};

export type IdentityMatchState =
  | { state: "no_match_create" }
  | { state: "single_match"; candidateId: string; matchedOn: Array<"cpf" | "email" | "phone"> }
  | { state: "multiple_matches_manual_resolution"; candidateIds: string[] }
  | { state: "conflict_blocked"; candidateId: string; reason: "email_matches_but_cpf_differs" };

function matchedSignals(subject: IdentitySignal, candidate: IdentitySignal): Array<"cpf" | "email" | "phone"> {
  const matched: Array<"cpf" | "email" | "phone"> = [];
  if (subject.cpfLookupHmac && candidate.cpfLookupHmac && subject.cpfLookupHmac === candidate.cpfLookupHmac) {
    matched.push("cpf");
  }
  if (subject.phoneE164 && candidate.phoneE164 && subject.phoneE164 === candidate.phoneE164) {
    matched.push("phone");
  }
  if (subject.emailNormalized && candidate.emailNormalized && subject.emailNormalized === candidate.emailNormalized) {
    matched.push("email");
  }
  return matched;
}

function isStrongMatch(matched: Array<"cpf" | "email" | "phone">): boolean {
  return matched.includes("cpf") || matched.includes("phone");
}

export function resolveIdentityMatch(
  subject: IdentitySignal,
  candidates: IdentityCandidate[],
): IdentityMatchState {
  const withSignals = candidates.map((candidate) => ({
    candidate,
    matched: matchedSignals(subject, candidate.signals),
  }));

  const strongMatches = withSignals.filter(({ matched }) => isStrongMatch(matched));

  if (strongMatches.length === 1) {
    const [{ candidate, matched }] = strongMatches;
    return { state: "single_match", candidateId: candidate.candidateId, matchedOn: matched };
  }

  if (strongMatches.length > 1) {
    return {
      state: "multiple_matches_manual_resolution",
      candidateIds: strongMatches.map(({ candidate }) => candidate.candidateId),
    };
  }

  // No strong (CPF/phone) match. Check for an email-only conflict: email matches
  // but CPF disagrees on both sides -- this must never auto-link.
  const emailOnlyConflict = withSignals.find(
    ({ candidate, matched }) =>
      matched.includes("email")
      && subject.cpfLookupHmac
      && candidate.signals.cpfLookupHmac
      && subject.cpfLookupHmac !== candidate.signals.cpfLookupHmac,
  );
  if (emailOnlyConflict) {
    return {
      state: "conflict_blocked",
      candidateId: emailOnlyConflict.candidate.candidateId,
      reason: "email_matches_but_cpf_differs",
    };
  }

  // Email matches but neither side has CPF/phone to disambiguate -- ambiguous,
  // requires a human, never auto-created nor auto-linked.
  const emailOnlyMatches = withSignals.filter(({ matched }) => matched.includes("email"));
  if (emailOnlyMatches.length > 0) {
    return {
      state: "multiple_matches_manual_resolution",
      candidateIds: emailOnlyMatches.map(({ candidate }) => candidate.candidateId),
    };
  }

  return { state: "no_match_create" };
}
