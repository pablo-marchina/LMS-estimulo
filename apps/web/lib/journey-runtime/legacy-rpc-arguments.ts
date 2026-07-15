export type LegacyRpcArguments = Record<string, unknown>;

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

/**
 * The production client must send the frozen aliases unchanged. The isolated
 * browser E2E adapter, however, consumes semantic names so its state machine is
 * readable and cannot spread opaque aliases. This normalizer is called only by
 * the explicitly gated synthetic path.
 */
export function normalizeLegacyRpcArgumentsForSynthetic(
  rpcName: string,
  args: LegacyRpcArguments
): LegacyRpcArguments {
  switch (rpcName) {
    case "e14_complete_diagnostic":
      return {
        p_actor_user_account_id: args.a,
        p_session_id: args.b,
        p_expected_aggregate_version: args.c,
        p_idempotency_key: args.d
      };
    case "e14_start_activity":
      return {
        p_actor_user_account_id: args.a,
        p_step_instance_id: args.b,
        p_expected_aggregate_version: args.c,
        p_idempotency_key: args.d
      };
    case "e14_acknowledge_section":
      return {
        p_actor_user_account_id: args.a,
        p_activity_session_id: args.b,
        p_section_code: args.c,
        p_acknowledged: args.d,
        p_idempotency_key: args.e
      };
    case "e14_start_quick_check":
      return {
        p_actor_user_account_id: args.a,
        p_step_instance_id: args.b,
        p_idempotency_key: args.c
      };
    case "e14_record_quick_check_answer":
      return {
        p_actor_user_account_id: args.a,
        p_attempt_id: args.b,
        p_question_id: args.c,
        p_option_code: args.d,
        p_idempotency_key: args.e
      };
    case "e14_submit_quick_check":
      return {
        p_actor_user_account_id: args.a,
        p_attempt_id: args.b,
        p_expected_aggregate_version: args.c,
        p_idempotency_key: args.d
      };
    case "e14_get_participant_state":
      return {
        p_actor_user_account_id: args.a,
        p_journey_instance_id: args.b
      };
    case "e14_get_operator_result":
      return {
        p_actor_user_account_id: args.a,
        p_organization_id: args.b,
        p_journey_instance_id: args.c
      };
    default:
      return args;
  }
}
