import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { browserE2EEnabled, browserE2EStateFile } from "@/lib/browser-e2e/config";

const IDS = {
  actor: "11111111-1111-4111-8111-111111111111",
  entrepreneur: "22222222-2222-4222-8222-222222222222",
  organization: "33333333-3333-4333-8333-333333333333",
  journeyVersion: "44444444-4444-4444-8444-444444444444",
  journey: "55555555-5555-4555-8555-555555555555",
  diagnosticVersion: "66666666-6666-4666-8666-666666666666",
  diagnosticSession: "77777777-7777-4777-8777-777777777777",
  step: "88888888-8888-4888-8888-888888888888",
  activityVersion: "99999999-9999-4999-8999-999999999999",
  activitySession: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  assessmentQuestion: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
} as const;

const DIAGNOSTIC_ITEMS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    code: "synthetic_q1",
    prompt: "Com que frequência você usa ferramentas digitais no negócio?",
    item_type: "single_choice",
    position: 1,
    is_required: true,
    options: [
      { id: "11000000-0000-4000-8000-000000000001", code: "o0", label: "Raramente", position: 1 },
      { id: "11000000-0000-4000-8000-000000000002", code: "o2", label: "Com frequência", position: 2 }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    code: "synthetic_q2",
    prompt: "Você revisa resultados antes de aplicá-los?",
    item_type: "single_choice",
    position: 2,
    is_required: true,
    options: [
      { id: "12000000-0000-4000-8000-000000000001", code: "o0", label: "Ainda não", position: 1 },
      { id: "12000000-0000-4000-8000-000000000002", code: "o2", label: "Sim, sempre", position: 2 }
    ]
  }
] as const;

const ACTIVITY_SECTIONS = [
  { code: "input", heading: "Defina a entrada", body: "Explique ao ChatGPT qual informação será usada." },
  { code: "rule", heading: "Declare a regra", body: "Descreva o que deve ser feito com a informação." },
  { code: "output", heading: "Peça um resultado", body: "Indique o formato esperado para a resposta." },
  { code: "human_validation", heading: "Revise antes de usar", body: "Confirme fatos, linguagem e adequação ao contexto." }
] as const;

type SyntheticState = {
  journeyStatus: "available" | "in_progress" | "completed";
  journeyAggregateVersion: number;
  diagnosticStatus: null | "in_progress" | "completed";
  diagnosticAggregateVersion: number;
  diagnosticResponses: Record<string, { option_code: string; revision: number }>;
  activityStatus: null | "available" | "in_progress" | "completed";
  activityAggregateVersion: number;
  activitySessionId: string | null;
  acceptedSections: string[];
  attempt: null | {
    id: string;
    attempt_number: number;
    status: "in_progress" | "failed" | "passed";
    aggregate_version: number;
    answer: string | null;
    score: number | null;
    passed: boolean | null;
  };
  comments: Array<{ id: string; body: string; created_at: string }>;
  submissions: Array<{
    id: string;
    upload_intent_id: string;
    file_object_id: string | null;
    object_key: string;
    original_filename: string;
    content_type: string;
    size_bytes: number | null;
    allow_public_use: boolean;
    status: "upload_pending" | "processing";
    submitted_at: string;
  }>;
  badges: Array<Record<string, unknown>>;
  certificates: Array<Record<string, unknown>>;
  idempotency: Record<string, { fingerprint: string; envelope: Record<string, unknown> }>;
};

function initialState(): SyntheticState {
  return {
    journeyStatus: "available",
    journeyAggregateVersion: 0,
    diagnosticStatus: null,
    diagnosticAggregateVersion: 0,
    diagnosticResponses: {},
    activityStatus: null,
    activityAggregateVersion: 0,
    activitySessionId: null,
    acceptedSections: [],
    attempt: null,
    comments: [],
    submissions: [],
    badges: [],
    certificates: [],
    idempotency: {}
  };
}

async function loadState(): Promise<SyntheticState> {
  const file = browserE2EStateFile();
  try {
    return JSON.parse(await readFile(file, "utf8")) as SyntheticState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const state = initialState();
    await saveState(state);
    return state;
  }
}

async function saveState(state: SyntheticState): Promise<void> {
  const file = browserE2EStateFile();
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), "utf8");
  await rename(temporary, file);
}

function assertActor(args: Record<string, unknown>): void {
  const actor = String(args.p_actor_user_account_id ?? "");
  if (actor && actor !== IDS.actor) throw new Error("FORBIDDEN");
}

function journeyState(state: SyntheticState) {
  const passed = state.attempt?.status === "passed";
  return {
    journey_instance_id: IDS.journey,
    journey_code: "synthetic_openai_journey",
    journey_version_number: 1,
    journey_version_id: IDS.journeyVersion,
    journey_content_hash: "synthetic-browser-e2e-content-hash-00000000000000000000000000000000",
    journey_status: state.journeyStatus,
    journey_aggregate_version: state.journeyAggregateVersion,
    enrollment_status: "active",
    entrepreneur_id: IDS.entrepreneur,
    organization_id: IDS.organization,
    progress: passed ? 1 : 0,
    completed_required_steps: passed ? 1 : 0,
    total_required_steps: 1,
    journey_title: "Jornada sintética OpenAI",
    journey_description: "Fluxo técnico isolado para validar a experiência completa no navegador.",
    journey_slug: "jornada-sintetica-openai",
    d: state.diagnosticStatus ? {
      session_id: IDS.diagnosticSession,
      status: state.diagnosticStatus,
      aggregate_version: state.diagnosticAggregateVersion,
      result_id: state.diagnosticStatus === "completed" ? "13000000-0000-4000-8000-000000000001" : null,
      path_code: state.diagnosticStatus === "completed" ? "standard" : null,
      low_confidence: false
    } : null,
    s: state.activityStatus ? {
      step_instance_id: IDS.step,
      status: state.activityStatus,
      aggregate_version: state.activityAggregateVersion,
      version_id: IDS.activityVersion,
      accepted_sections: state.acceptedSections.length,
      session_id: state.activitySessionId
    } : null,
    q: state.attempt ? {
      attempt_id: state.attempt.id,
      attempt_number: state.attempt.attempt_number,
      status: state.attempt.status,
      aggregate_version: state.attempt.aggregate_version,
      score: state.attempt.score,
      passed: state.attempt.passed
    } : null,
    p: { balance: passed ? 7 : 0, ledger_count: passed ? 2 : 0, ledger_sum: passed ? 7 : 0 }
  };
}

function experience(state: SyntheticState) {
  return {
    state: journeyState(state),
    journey: {
      title: "Jornada sintética OpenAI",
      description: "Fluxo técnico isolado para validar a experiência completa no navegador.",
      purpose: "browser_e2e"
    },
    diagnostic: {
      version_id: IDS.diagnosticVersion,
      items: DIAGNOSTIC_ITEMS.map((item) => ({
        ...item,
        options: item.options.map((option) => ({ ...option })),
        response: state.diagnosticResponses[item.id] ?? null
      }))
    },
    activity: state.diagnosticStatus === "completed" ? {
      version_id: IDS.activityVersion,
      title: "Estruture uma solicitação para o ChatGPT",
      description: "Atividade sintética para validar conteúdo, comentário, prática e avaliação.",
      estimated_minutes: 15,
      sections: ACTIVITY_SECTIONS.map((section) => ({ ...section }))
    } : null,
    assessment: state.diagnosticStatus === "completed" ? {
      passing_score: 100,
      max_attempts: 3,
      questions: [{
        id: IDS.assessmentQuestion,
        code: "synthetic_check",
        prompt: "Qual prática deve acontecer antes de usar uma resposta gerada por IA?",
        question_type: "single_choice",
        position: 1,
        options: [
          { id: "14000000-0000-4000-8000-000000000001", code: "a", label: "Usar imediatamente", position: 1 },
          { id: "14000000-0000-4000-8000-000000000002", code: "b", label: "Revisar e validar", position: 2 }
        ],
        response: state.attempt?.status === "in_progress" && state.attempt.answer
          ? { option_code: state.attempt.answer }
          : null
      }]
    } : null
  };
}

function fingerprint(name: string, args: Record<string, unknown>): string {
  return JSON.stringify([name, args], Object.keys(args).sort());
}

async function mutate(
  name: string,
  args: Record<string, unknown>,
  key: string,
  operation: (state: SyntheticState) => unknown
): Promise<Record<string, unknown>> {
  const state = await loadState();
  const requestFingerprint = fingerprint(name, args);
  const previous = state.idempotency[key];
  if (previous) {
    if (previous.fingerprint !== requestFingerprint) throw new Error("IDEMPOTENCY_KEY_REUSED");
    return { ...previous.envelope, replayed: true };
  }
  const envelope = {
    request_id: randomUUID(),
    idempotency_key: key,
    replayed: false,
    data: operation(state)
  };
  state.idempotency[key] = { fingerprint: requestFingerprint, envelope };
  await saveState(state);
  return envelope;
}

let serial = Promise.resolve<unknown>(undefined);

export function syntheticIdentity() {
  return {
    user_account_id: IDS.actor,
    entrepreneur_id: IDS.entrepreneur,
    organizations: [{
      organization_id: IDS.organization,
      display_name: "Estímulo E2E",
      roles: ["participant"],
      permissions: ["journey.participate"]
    }]
  };
}

export function invokeSyntheticRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!browserE2EEnabled()) return Promise.reject(new Error("BROWSER_E2E_DISABLED"));
  const run = serial.then(async () => {
    assertActor(args);
    const state = await loadState();
    switch (name) {
      case "e14_list_participant_journeys":
        return { actor_user_account_id: IDS.actor, entrepreneur_id: IDS.entrepreneur, journeys: [journeyState(state)] };
      case "e14_get_participant_state":
        return journeyState(state);
      case "e14_get_participant_experience":
        return experience(state);
      case "e14_start_journey":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          draft.journeyStatus = "in_progress";
          draft.journeyAggregateVersion += 1;
          return journeyState(draft);
        });
      case "e14_start_diagnostic":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          draft.diagnosticStatus = "in_progress";
          draft.diagnosticAggregateVersion += 1;
          return { session_id: IDS.diagnosticSession, status: "in_progress" };
        });
      case "e14_record_diagnostic_response":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          draft.diagnosticResponses[String(args.p_item_id)] = {
            option_code: String(args.p_option_code),
            revision: Number(args.p_revision)
          };
          draft.diagnosticAggregateVersion += 1;
          return { recorded: true };
        });
      case "e14_complete_diagnostic":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          draft.diagnosticStatus = "completed";
          draft.diagnosticAggregateVersion += 1;
          draft.activityStatus = "available";
          return { status: "completed", path_code: "standard" };
        });
      case "e14_start_activity":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          draft.activityStatus = "in_progress";
          draft.activitySessionId = IDS.activitySession;
          draft.activityAggregateVersion += 1;
          return { status: "in_progress", session_id: IDS.activitySession };
        });
      case "e14_acknowledge_section":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          const section = String(args.p_section_code);
          if (!draft.acceptedSections.includes(section)) draft.acceptedSections.push(section);
          draft.activityAggregateVersion += 1;
          return { section_code: section, acknowledged: true };
        });
      case "list_activity_comments":
        return {
          step_instance_id: IDS.step,
          comments: state.comments.map((comment) => ({
            id: comment.id,
            step_instance_id: IDS.step,
            author_name: "Participante sintético",
            body: comment.body,
            status: "visible",
            created_at: comment.created_at,
            is_own: true
          }))
        };
      case "create_activity_comment":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          const comment = { id: randomUUID(), body: String(args.p_body), created_at: new Date().toISOString() };
          draft.comments.push(comment);
          return {
            ...comment,
            step_instance_id: IDS.step,
            author_name: "Participante sintético",
            status: "visible",
            is_own: true
          };
        });
      case "list_practice_submissions":
        return {
          step_instance_id: IDS.step,
          practice: {
            enabled: true,
            submission_mode: "file",
            allowed_evidence_types: ["file"],
            max_submissions: 3,
            review_required: true,
            terms_version: "synthetic-e2e-v1",
            upload_profile_code: "practice_evidence_v1"
          },
          submissions: state.submissions.map((submission, index) => ({
            id: submission.id,
            step_instance_id: IDS.step,
            submission_number: index + 1,
            status: submission.status,
            security_status: submission.status === "processing" ? "scan_pending" : null,
            file_object_id: submission.file_object_id,
            original_filename: submission.original_filename,
            content_type: submission.content_type,
            size_bytes: submission.size_bytes,
            allow_public_use: submission.allow_public_use,
            submitted_at: submission.submitted_at,
            can_download: false,
            review_status: null,
            review_feedback: null,
            reviewed_at: null
          }))
        };
      case "create_practice_upload_intent":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          const submission = {
            id: randomUUID(),
            upload_intent_id: randomUUID(),
            file_object_id: null,
            object_key: `quarantine/${randomUUID()}`,
            original_filename: String(args.p_original_filename).trim(),
            content_type: String(args.p_expected_content_type),
            size_bytes: null,
            allow_public_use: Boolean(args.p_allow_public_use),
            status: "upload_pending" as const,
            submitted_at: new Date().toISOString()
          };
          draft.submissions.push(submission);
          return {
            submission_id: submission.id,
            upload_intent_id: submission.upload_intent_id,
            journey_instance_id: IDS.journey,
            step_instance_id: IDS.step,
            activity_version_id: IDS.activityVersion,
            submission_number: draft.submissions.length,
            status: "upload_pending",
            bucket: String(args.p_bucket),
            object_key: submission.object_key,
            original_filename: submission.original_filename,
            expected_content_type: submission.content_type,
            max_size_bytes: 6291456,
            expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
            allow_public_use: submission.allow_public_use,
            terms_version: "synthetic-e2e-v1"
          };
        });
      case "confirm_practice_upload":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          const submission = draft.submissions.find((item) => item.id === String(args.p_submission_id));
          if (!submission) throw new Error("PRACTICE_SUBMISSION_NOT_FOUND");
          submission.status = "processing";
          submission.file_object_id = randomUUID();
          submission.size_bytes = Number(args.p_actual_size_bytes);
          submission.content_type = String(args.p_actual_content_type);
          return {
            submission_id: submission.id,
            file_object_id: submission.file_object_id,
            status: "processing",
            security_status: "scan_pending",
            original_filename: submission.original_filename,
            content_type: submission.content_type,
            size_bytes: submission.size_bytes,
            allow_public_use: submission.allow_public_use,
            submitted_at: submission.submitted_at
          };
        });
      case "abort_practice_upload":
        return mutate(name, args, String(args.p_idempotency_key), () => ({
          submission_id: String(args.p_submission_id), status: "failed", failure_code: String(args.p_failure_code)
        }));
      case "e14_start_quick_check":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          const attemptNumber = (draft.attempt?.attempt_number ?? 0) + 1;
          draft.attempt = {
            id: randomUUID(), attempt_number: attemptNumber, status: "in_progress",
            aggregate_version: 0, answer: null, score: null, passed: null
          };
          return { attempt_id: draft.attempt.id, attempt_number: attemptNumber };
        });
      case "e14_record_quick_check_answer":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          if (!draft.attempt) throw new Error("ASSESSMENT_ATTEMPT_NOT_AVAILABLE");
          draft.attempt.answer = String(args.p_option_code);
          draft.attempt.aggregate_version += 1;
          return { recorded: true };
        });
      case "e14_submit_quick_check":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          if (!draft.attempt) throw new Error("ASSESSMENT_ATTEMPT_NOT_AVAILABLE");
          const passed = draft.attempt.answer === "b";
          draft.attempt.status = passed ? "passed" : "failed";
          draft.attempt.score = passed ? 100 : 0;
          draft.attempt.passed = passed;
          draft.attempt.aggregate_version += 1;
          if (passed) {
            draft.activityStatus = "completed";
            draft.journeyStatus = "completed";
            draft.journeyAggregateVersion += 1;
          }
          return { status: draft.attempt.status, score: draft.attempt.score, passed };
        });
      case "issue_learning_credentials":
        return mutate(name, args, String(args.p_idempotency_key), (draft) => {
          if (draft.journeyStatus !== "completed") throw new Error("JOURNEY_NOT_COMPLETED");
          if (!draft.badges.length) {
            draft.badges.push(
              {
                award_id: "d1000000-0000-4000-8000-000000000001",
                badge_version_id: "d2000000-0000-4000-8000-000000000001",
                title: "Atividade sintética concluída",
                description: "Selo técnico usado apenas no Browser E2E.",
                status: "active",
                awarded_at: new Date().toISOString(),
                journey_instance_id: IDS.journey,
                step_instance_id: IDS.step,
                journey_title: "Jornada sintética OpenAI"
              },
              {
                award_id: "d1000000-0000-4000-8000-000000000002",
                badge_version_id: "d2000000-0000-4000-8000-000000000002",
                title: "Jornada sintética concluída",
                description: "Selo técnico usado apenas no Browser E2E.",
                status: "active",
                awarded_at: new Date().toISOString(),
                journey_instance_id: IDS.journey,
                step_instance_id: null,
                journey_title: "Jornada sintética OpenAI"
              }
            );
          }
          if (!draft.certificates.length) {
            draft.certificates.push({
              issuance_id: "e1000000-0000-4000-8000-000000000001",
              certificate_version_id: "e2000000-0000-4000-8000-000000000001",
              certificate_name: "Certificado sintético de jornada",
              journey_instance_id: IDS.journey,
              journey_title: "Jornada sintética OpenAI",
              display_name: "Participante sintético",
              verification_code: "EST-SYNTHETIC0000000001",
              status: "active",
              issued_at: new Date().toISOString(),
              expires_at: null,
              valid: true
            });
          }
          return { badges: draft.badges, certificates: draft.certificates, journey_completed: true, required_assessments_passed: true };
        });
      case "list_participant_credentials":
        return { entrepreneur_id: IDS.entrepreneur, badges: state.badges, certificates: state.certificates };
      case "verify_certificate": {
        const certificate = state.certificates.find((item) => item.verification_code === String(args.p_verification_code));
        if (!certificate) return { valid: false, reason: "not_found" };
        return { ...certificate, valid: true, reason: "valid" };
      }
      default:
        throw new Error(`BROWSER_E2E_RPC_NOT_IMPLEMENTED:${name}`);
    }
  });
  serial = run.catch(() => undefined);
  return run as Promise<T>;
}

export const browserE2EIds = IDS;
