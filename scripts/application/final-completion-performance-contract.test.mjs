import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const completionAction = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/completion-action.ts", "utf8");
const completionRuntime = await readFile("apps/web/lib/journey-runtime/completion-runtime.ts", "utf8");
const outlineRuntime = await readFile("apps/web/lib/journey-runtime/outline-runtime.ts", "utf8");
const openJourney = await readFile("apps/web/app/actions/open-journey.ts", "utf8");
const migration = await readFile("supabase/migrations/20260816230537_structured_participant_activity_completion.sql", "utf8");

test("normal completion blockers are structured results, not RPC failures", () => {
  assert.match(migration, /'status','blocked'/u);
  assert.match(migration, /'code','REQUIRED_CONTENT_INCOMPLETE'/u);
  assert.match(migration, /'code','ASSESSMENT_NOT_PASSED'/u);
  assert.match(migration, /'code','PRACTICE_COMPLETION_MANAGED_BY_REVIEW'/u);
  assert.doesNotMatch(migration, /raise exception 'REQUIRED_CONTENT_INCOMPLETE'/u);
  assert.doesNotMatch(migration, /raise exception 'ASSESSMENT_NOT_PASSED'/u);
  assert.doesNotMatch(migration, /raise exception 'PRACTICE_COMPLETION_MANAGED_BY_REVIEW'/u);
  assert.match(completionRuntime, /status: "completed" \| "blocked"/u);
  assert.match(completionAction, /completionCode/u);
  assert.match(completionAction, /outcome = result\.code/u);
  const tryBlock = completionAction.match(/try \{([\s\S]*?)\} catch/u)?.[1] ?? "";
  assert.doesNotMatch(tryBlock, /redirect\(/u);
  assert.match(completionAction, /ok: "concluir-aula"/u);
  assert.match(completionAction, /conteudo_pendente: "conteudo"/u);
  assert.match(completionAction, /avaliacao_pendente: "avaliacao"/u);
  assert.match(completionAction, /pratica_pendente: "pratica"/u);
  assert.match(completionAction, /falha: "concluir-aula"/u);
  assert.match(completionAction, /redirect\(`\/empreendedor\/jornada\/\$\{journey\}\?conteudo=\$\{step\}&conclusao=\$\{outcome\}#\$\{completionAnchor\[outcome\]\}`\)/u);
});

test("journey outline is a single cached read and path reconciliation happens on journey entry", () => {
  assert.match(outlineRuntime, /cache\(\(actorUserAccountId/u);
  assert.equal((outlineRuntime.match(/get_participant_journey_outline/gu) ?? []).length, 1);
  assert.doesNotMatch(outlineRuntime, /ensure_participant_open_paths/u);
  assert.doesNotMatch(outlineRuntime, /randomUUID/u);
  assert.match(openJourney, /state\.journey_status !== "completed"/u);
  assert.match(openJourney, /ensureDefaultPath/u);
  assert.match(openJourney, /`\$\{key\}:paths`/u);
});
