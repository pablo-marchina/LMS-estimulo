export type LegacyRpcArguments = Record<string, unknown>;

export const legacyRpcNames = {
  getParticipantState: "e14_get_participant_state"
} as const;

type CompleteDiagnosticInput = {
  actorUserAccountId: string;
  sessionId: string;
  expectedAggregateVersion: number;
  idempotencyKey: string;
};

type StartActivityInput = {
  actorUserAccountId: string;
  stepInstanceId: string;
  expectedAggregateVersion: number;
  idempotencyKey: string;
};

type AcknowledgeSectionInput = {
  actorUserAccountId: string;
  activitySessionId: string;
  sectionCode: string;
  acknowledged: boolean;
  idempotencyKey: string;
};

type StartQuickCheckInput = {
  actorUserAccountId: string;
  stepInstanceId: string;
  idempotencyKey: string;
};

type RecordQuickCheckAnswerInput = {
  actorUserAccountId: string;
  attemptId: string;
  questionId: string;
  optionCode: string;
  idempotencyKey: string;
};

type SubmitQuickCheckInput = {
  actorUserAccountId: string;
  attemptId: string;
  expectedAggregateVersion: number;
  idempotencyKey: string;
};

type ParticipantStateInput = {
  actorUserAccountId: string;
  journeyInstanceId: string;
};

type OperatorResultInput = {
  actorUserAccountId: string;
  organizationId: string;
  journeyInstanceId: string;
};

/**
 * Compatibility boundary for eight frozen public RPCs whose PostgreSQL argument
 * names are legacy one-letter aliases. No other application file may construct
 * these aliases directly. Remove each mapper only after the corresponding RPC
 * receives a semantically named replacement without changing behavior.
 */
export const legacyRpcArguments = {
  completeDiagnostic(input: CompleteDiagnosticInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.sessionId,
      c: input.expectedAggregateVersion,
      d: input.idempotencyKey
    };
  },

  startActivity(input: StartActivityInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.stepInstanceId,
      c: input.expectedAggregateVersion,
      d: input.idempotencyKey
    };
  },

  acknowledgeSection(input: AcknowledgeSectionInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.activitySessionId,
      c: input.sectionCode,
      d: input.acknowledged,
      e: input.idempotencyKey
    };
  },

  startQuickCheck(input: StartQuickCheckInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.stepInstanceId,
      c: input.idempotencyKey
    };
  },

  recordQuickCheckAnswer(input: RecordQuickCheckAnswerInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.attemptId,
      c: input.questionId,
      d: input.optionCode,
      e: input.idempotencyKey
    };
  },

  submitQuickCheck(input: SubmitQuickCheckInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.attemptId,
      c: input.expectedAggregateVersion,
      d: input.idempotencyKey
    };
  },

  getParticipantState(input: ParticipantStateInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.journeyInstanceId
    };
  },

  getOperatorResult(input: OperatorResultInput): LegacyRpcArguments {
    return {
      a: input.actorUserAccountId,
      b: input.organizationId,
      c: input.journeyInstanceId
    };
  }
} as const;
