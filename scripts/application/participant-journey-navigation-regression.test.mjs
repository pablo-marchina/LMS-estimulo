import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = await readFile("apps/web/components/participant-shell.tsx", "utf8");
const profile = await readFile("apps/web/app/empreendedor/perfil/page.tsx", "utf8");
const progress = await readFile("apps/web/components/journey-progress-nav.tsx", "utf8");
const catalog = await readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8");
const migration = await readFile("supabase/migrations/20260724011100_participant_journey_listing_resilience.sql", "utf8");

test("participant navigation keeps journeys, deliveries, achievements and profile", () => {
  assert.match(shell, /label:\s*"Jornadas"/u);
  assert.match(shell, /label:\s*"Entregas"/u);
  assert.match(shell, /label:\s*"Conquistas"/u);
  assert.match(shell, /label:\s*"Perfil"/u);
});

test("profile sends a participant to the pending diagnostic", () => {
  assert.match(profile, /Faça seu diagnóstico/u);
  assert.match(profile, /Responder diagnóstico agora/u);
  assert.match(profile, /\/empreendedor\/diagnostico\?journey=/u);
});

test("activity stage tabs were replaced by compact journey context", () => {
  assert.match(progress, /Contexto de/u);
  assert.match(progress, /Voltar à jornada/u);
  assert.doesNotMatch(progress, /Painel/u);
});

test("OpenAI journey is prominent and technical enrollments cannot hide it", () => {
  assert.match(catalog, /OPENAI_JOURNEY_VERSION_ID/u);
  assert.match(catalog, /Começar jornada OpenAI/u);
  assert.match(migration, /internal_test_only/u);
  assert.match(migration, /exception[\s\S]*when others/u);
});
