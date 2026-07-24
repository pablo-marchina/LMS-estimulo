import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = await readFile("apps/web/components/participant-shell.tsx", "utf8");
const profile = await readFile("apps/web/app/empreendedor/perfil/page.tsx", "utf8");
const profileAction = await readFile("apps/web/app/empreendedor/perfil/actions.ts", "utf8");
const progress = await readFile("apps/web/components/journey-progress-nav.tsx", "utf8");
const catalog = await readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8");
const resilienceMigration = await readFile("supabase/migrations/20260724011100_participant_journey_listing_resilience.sql", "utf8");
const diagnosticMigration = await readFile("supabase/migrations/20260724011500_openai_default_diagnostic.sql", "utf8");
const gateway = await readFile("supabase/functions/authenticated-rpc/index.ts", "utf8");

 test("participant navigation keeps journeys, deliveries, achievements and profile", () => {
  assert.match(shell, /label:\s*"Jornadas"/u);
  assert.match(shell, /label:\s*"Entregas"/u);
  assert.match(shell, /label:\s*"Conquistas"/u);
  assert.match(shell, /label:\s*"Perfil"/u);
});

test("profile creates or reuses a journey and opens the diagnostic directly", () => {
  assert.match(profile, /Fazer diagnóstico agora/u);
  assert.match(profile, /startProfileDiagnosticAction/u);
  assert.match(profileAction, /selfEnroll/u);
  assert.match(profileAction, /startJourney/u);
  assert.match(profileAction, /\/empreendedor\/diagnostico\?journey=/u);
});

test("activity stage tabs were replaced by compact journey context", () => {
  assert.match(progress, /Contexto de/u);
  assert.match(progress, /Voltar à jornada/u);
  assert.doesNotMatch(progress, /Painel/u);
});

test("OpenAI journey remains prominent before and after enrollment", () => {
  assert.match(catalog, /eligibleOpenAI/u);
  assert.match(catalog, /enrolledOpenAI/u);
  assert.match(catalog, /Minhas jornadas/u);
  assert.match(catalog, /Começar jornada OpenAI/u);
  assert.match(resilienceMigration, /internal_test_only/u);
  assert.match(resilienceMigration, /exception[\s\S]*when others/u);
});

test("OpenAI experience uses the official 12-question diagnostic through the authenticated gateway", () => {
  assert.match(diagnosticMigration, /entrepreneur_archetype_diagnostic/u);
  assert.match(diagnosticMigration, /capacitacao_ia_mei_openai/u);
  assert.match(diagnosticMigration, /diagnostics\.items/u);
  assert.match(gateway, /get_participant_experience_with_default_diagnostic/u);
});
