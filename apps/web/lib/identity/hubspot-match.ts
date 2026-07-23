export type IdentitySignal = {
  cpfLookupHmac: string | null;
  emailNormalized: string | null;
  phoneE164: string | null;
};

export type IdentityCandidate = {
  candidateId: string;
  signals: IdentitySignal;
};

export type ConflictReason = "email_matches_but_cpf_differs" | "phone_matches_but_cpf_differs";

export type IdentityMatchState =
  | { state: "no_match_create" }
  | { state: "single_match"; candidateId: string; matchedOn: Array<"cpf" | "email" | "phone"> }
  | { state: "multiple_matches_manual_resolution"; candidateIds: string[] }
  | { state: "conflict_blocked"; candidateId: string; reason: ConflictReason };

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

// CPF is the strongest identity signal available: when both sides have it and it
// actively disagrees, that is the strongest possible evidence the two records
// belong to different real people. This must never be silently overridden by
// agreement on any other signal (phone, email), no matter how many other
// signals happen to match.
function hasCpfConflict(subject: IdentitySignal, candidate: IdentitySignal): boolean {
  return Boolean(
    subject.cpfLookupHmac && candidate.cpfLookupHmac && subject.cpfLookupHmac !== candidate.cpfLookupHmac,
  );
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
    cpfConflict: hasCpfConflict(subject, candidate.signals),
  }));

  // A candidate is only eligible to be a genuine "strong match" if it does NOT
  // actively conflict on CPF. An active CPF disagreement disqualifies a
  // candidate from single_match no matter how many other signals (phone,
  // email) happen to agree on that same candidate.
  const strongMatches = withSignals.filter(({ matched, cpfConflict }) => !cpfConflict && isStrongMatch(matched));

  if (strongMatches.length > 1) {
    return {
      state: "multiple_matches_manual_resolution",
      candidateIds: strongMatches.map(({ candidate }) => candidate.candidateId),
    };
  }

  if (strongMatches.length === 1) {
    // A conflict-free strong match is decisive on its own merits (CPF is a
    // unique-per-person key), even if some other, unrelated candidate
    // elsewhere in the list separately has an active CPF conflict -- that is a
    // data-quality problem about a different record, not evidence against
    // this one. See hasCpfConflict / conflictCandidates below for that case.
    const [{ candidate, matched }] = strongMatches;
    return { state: "single_match", candidateId: candidate.candidateId, matchedOn: matched };
  }

  // No conflict-free strong match. Check for candidates whose CPF actively
  // disagrees with the subject's while also sharing some other signal (phone
  // and/or email) -- these must never be auto-linked, regardless of which
  // other signal(s) agree.
  const conflictCandidates = withSignals.filter(({ matched, cpfConflict }) => cpfConflict && matched.length > 0);
  if (conflictCandidates.length > 0) {
    const [{ candidate, matched }] = conflictCandidates;
    return {
      state: "conflict_blocked",
      candidateId: candidate.candidateId,
      reason: matched.includes("email") ? "email_matches_but_cpf_differs" : "phone_matches_but_cpf_differs",
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
