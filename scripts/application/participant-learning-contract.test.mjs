import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  activityPage,
  journeyPage,
  catalogPage,
  navigation,
  quickCheck,
  journeyActions,
  diagnosticActions,
  videoViewer,
  progressNav,
  autoAdvance,
  signInAction,
  signupCompletionAction,
  libraryAction,
  phoneField,
  supabaseServer,
] = await Promise.all([
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8"),
  readFile("apps/web/lib/journey-runtime/navigation.ts", "utf8"),
  readFile("apps/web/components/quick-check-form.tsx", "utf8"),
  readFile("apps/web/app/actions/journey.ts", "utf8"),
  readFile("apps/web/app/empreendedor/diagnostico/actions.ts", "utf8"),
  readFile("apps/web/components/content-asset-viewer.tsx", "utf8"),
  readFile("apps/web/components/journey-progress-nav.tsx", "utf8"),
  readFile("apps/web/components/lesson-auto-advance.tsx", "utf8"),
  readFile("apps/web/app/entrar/actions.ts", "utf8"),
  readFile("apps/web/app/cadastro/concluir/actions.ts", "utf8"),
  readFile("apps/web/app/actions/library.ts", "utf8"),
  readFile("apps/web/components/phone-field.tsx", "utf8"),
  readFile("apps/web/lib/supabase/server.ts", "utf8"),
]);

test("completion and assessment failures are not disguised as content-not-found", () => {
  assert.doesNotMatch(journeyPage, /catch\s*\{\s*notFound\(\)/u);
  assert.match(activityPage, /completionMessages/u);
  assert.match(activityPage, /assessmentMessages/u);
  assert.match(activityPage, /conclusao/u);
});

test("optional lesson sidecars cannot take down the learning content", () => {
  assert.match(activityPage, /listActivityComments[\s\S]*\.catch\(\(\) =>/u);
  assert.match(activityPage, /practiceRuntime\.listParticipant[\s\S]*\.catch\(\(\) =>/u);
  assert.match(activityPage, /utilityRatingRuntime\.get[\s\S]*\.catch\(\(\) =>/u);
  assert.match(activityPage, /Comentários temporariamente indisponíveis/u);
  assert.match(activityPage, /A nota desta aula está temporariamente indisponível/u);
});

test("journey navigation always reopens the journey instead of sending completed participants to profile or result", () => {
  assert.match(navigation, /return `\/empreendedor\/jornada\/\$\{encodeURIComponent\(state\.journey_instance_id\)\}`/u);
  assert.doesNotMatch(navigation, /\/empreendedor\/(?:perfil|resultado)/u);
});

test("verification options do not receive a correct-answer selection before submission", () => {
  assert.doesNotMatch(quickCheck, /correct_answer|is_correct|correctOption|defaultChecked/u);
  assert.match(quickCheck, /name=\{name\} value=\{option\.code\}/u);
});

test("verification prevents duplicate submission and recovers from stale state conflicts", () => {
  assert.match(quickCheck, /PendingSubmitButton/u);
  assert.match(quickCheck, /Enviando verificação/u);
  assert.match(journeyActions, /function isStateConflict/u);
  assert.match(journeyActions, /error\.code === "23505"/u);
  assert.match(journeyActions, /avaliacao=resposta_pendente/u);
  assert.match(journeyActions, /avaliacao=indisponivel/u);
});

test("diagnostic autosave treats already-persisted concurrent writes as success", () => {
  assert.match(diagnosticActions, /function isStateConflict/u);
  assert.match(diagnosticActions, /error\.code === "23505"/u);
  assert.match(diagnosticActions, /persisted !== parsed\.optionCode/u);
  assert.match(diagnosticActions, /latest\.state\.d\?\.status !== "completed"/u);
});

test("embedded and native videos remain responsive on mobile", () => {
  assert.match(videoViewer, /relative aspect-video w-full min-w-0 max-w-full overflow-hidden/u);
  assert.match(videoViewer, /absolute inset-0 block h-full w-full max-w-full border-0/u);
  assert.match(videoViewer, /aspect-video w-full min-w-0 max-w-full bg-black object-contain/u);
});

test("lessons without media present an actionable completion state instead of a missing-material warning", () => {
  assert.doesNotMatch(activityPage, /Nenhum material anexado/u);
  assert.match(activityPage, /Pronto para avançar/u);
  assert.match(activityPage, /Etapa concluída/u);
});

test("empty recommendation shelf stays hidden until there is an actual recommendation", () => {
  assert.match(catalogPage, /\{recommended\.length \? <JourneySection/u);
});

test("partial participant catalog failures are surfaced instead of silently hiding journeys", () => {
  assert.match(catalogPage, /skipped_invalid_journeys/u);
  assert.match(catalogPage, /skippedJourneys > 0/u);
});

test("completed media can open the next available lesson automatically", () => {
  assert.match(progressNav, /data-next-lesson-form/u);
  assert.match(autoAdvance, /estimulo:asset-progress/u);
  assert.match(autoAdvance, /lessonCompleted/u);
  assert.match(autoAdvance, /router\.refresh\(\)/u);
  assert.match(autoAdvance, /requestSubmit\(\)/u);
  assert.match(autoAdvance, /AUTO_ADVANCE_SECONDS = 3/u);
});

test("OpenAI campaign attribution survives auth and routes into the ChatGPT journey", () => {
  for (const source of [signInAction, signupCompletionAction]) {
    assert.match(source, /isOpenAiCampaign/u);
    assert.match(source, /resolveOpenAiJourneyDestination/u);
  }
});

test("library publishing revalidates the draft and its authoritative content hash", () => {
  assert.match(libraryAction, /libraryRuntime\.listOperator/u);
  assert.match(libraryAction, /estimated_minutes/u);
  assert.match(libraryAction, /draft\.content_hash/u);
  assert.doesNotMatch(libraryAction, /publish\([^\n]*contentHash/u);
});

test("phone field starts as an example instead of a fake prefilled number", () => {
  assert.match(phoneField, /placeholder="\(00\) 00000-0000"/u);
  assert.doesNotMatch(phoneField, /defaultValue="\(00\)/u);
});

test("parallel participant RPCs reuse one request-scoped Supabase client", () => {
  assert.match(supabaseServer, /import \{ cache \} from "react"/u);
  assert.match(supabaseServer, /export const createSessionClient = cache\(createRequestSessionClient\)/u);
});
