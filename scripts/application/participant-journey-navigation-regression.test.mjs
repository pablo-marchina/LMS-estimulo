import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = await readFile("apps/web/components/participant-shell.tsx", "utf8");
const profile = await readFile("apps/web/app/empreendedor/perfil/page.tsx", "utf8");
const profileAction = await readFile("apps/web/app/empreendedor/perfil/actions.ts", "utf8");
const diagnosticRuntime = await readFile("apps/web/lib/diagnostics/participant-runtime.ts", "utf8");
const progress = await readFile("apps/web/components/journey-progress-nav.tsx", "utf8");
const catalog = await readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8");
const copy = await readFile("apps/web/lib/content/participant-copy.ts", "utf8");
const resilienceMigration = await readFile("supabase/migrations/20260724011100_participant_journey_listing_resilience.sql", "utf8");
const diagnosticMigration = await readFile("supabase/migrations/20260728170000_structural_homolog_user_experience.sql", "utf8");
const gateway = await readFile("supabase/functions/authenticated-rpc/index.ts", "utf8");

test("participant navigation keeps journeys, deliveries, achievements and profile", () => {
  assert.match(shell, /label:\s*"Jornadas"/u);
  assert.match(shell, /label:\s*"Entregas"/u);
  assert.match(shell, /label:\s*"Conquistas"/u);
  assert.match(shell, /label:\s*"Perfil"/u);
});

test("profile resolves and resumes the active diagnostic without hardcoded journey versions", () => {
  assert.match(profile, /Fazer diagnóstico agora/u);
  assert.match(profile, /startProfileDiagnosticAction/u);
  assert.match(profileAction, /participantDiagnosticRuntime\.resolveEntry/u);
  assert.match(profileAction, /startDiagnostic/u);
  assert.doesNotMatch(profileAction, /OPENAI_JOURNEY_VERSION_ID|\/openai\/i/u);
  assert.match(diagnosticRuntime, /resolve_participant_diagnostic_entry/u);
  assert.match(diagnosticRuntime, /get_participant_experience_with_default_diagnostic/u);
});

test("activity stage tabs were replaced by lesson-specific context", () => {
  assert.match(progress, /Contexto de/u);
  assert.match(progress, /Voltar à jornada/u);
  assert.match(progress, /activityTitle/u);
  assert.doesNotMatch(progress, /Diagnóstico concluído|Diagnóstico pendente/u);
});

test("featured journey and catalog sections are driven by published presentation data and reviewed language", () => {
  assert.match(catalog, /presentation\.featured/u);
  assert.match(catalog, /featured_rank/u);
  assert.match(catalog, /Em andamento/u);
  assert.match(catalog, /participantCopy\.journeys\.recommendedTitle/u);
  assert.match(catalog, /Outras jornadas/u);
  assert.match(catalog, /Concluídas/u);
  assert.match(copy, /Recomendadas para você/u);
  assert.match(copy, /Disponível para todos/u);
  assert.doesNotMatch(catalog, /atividades obrigatórias|Aberta para todos/u);
  assert.doesNotMatch(catalog, /eligibleOpenAI|enrolledOpenAI/u);
  assert.match(resilienceMigration, /internal_test_only/u);
  assert.match(resilienceMigration, /exception[\s\S]*when others/u);
});

test("active profile diagnostic is resolved structurally through the authenticated gateway", () => {
  assert.match(diagnosticMigration, /e14_active_profile_diagnostic_version/u);
  assert.match(diagnosticMigration, /entrepreneur_archetype_diagnostic/u);
  assert.match(diagnosticMigration, /resolve_participant_diagnostic_entry/u);
  assert.match(diagnosticMigration, /get_participant_experience_with_default_diagnostic/u);
  assert.match(gateway, /resolve_participant_diagnostic_entry/u);
  assert.match(gateway, /get_participant_experience_with_default_diagnostic/u);
});
