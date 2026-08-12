import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

// This suite protects the participant/admin remediation requested in the consolidated audit.

test("announcement editor supports responsive artwork and image-wide links", async () => {
  const [page, runtime, carousel] = await Promise.all([
    source("apps/web/app/admin/engajamento/page.tsx"),
    source("apps/web/lib/engagement/runtime.ts"),
    source("apps/web/components/announcement-carousel.tsx"),
  ]);
  assert.match(page, /Imagem para desktop/u);
  assert.match(page, /Imagem para celular/u);
  assert.match(page, /1200 × 360 px/u);
  assert.match(page, /720 × 480 px/u);
  assert.match(page, /cta_url/u);
  assert.doesNotMatch(page, /Texto do botão/u);
  assert.match(runtime, /mobileImageFileObjectId/u);
  assert.match(runtime, /ANNOUNCEMENT_MOBILE_SCHEMA_REQUIRED/u);
  assert.match(carousel, /className="absolute inset-0 z-20"/u);
  assert.match(carousel, /max-\[720px\]:!max-h-\[40svh\]/u);
  assert.match(carousel, /variant=mobile/u);
});

test("diagnostic result and profile objective use the approved participant copy and placement", async () => {
  const [diagnostic, resultDashboard, chart, profile, actions] = await Promise.all([
    source("apps/web/app/empreendedor/perfil/diagnostico/page.tsx"),
    source("apps/web/components/diagnostic-result-dashboard.tsx"),
    source("apps/web/components/diagnostic-dimension-chart.tsx"),
    source("apps/web/app/empreendedor/perfil/page.tsx"),
    source("apps/web/app/empreendedor/perfil/actions.ts"),
  ]);

  assert.match(diagnostic, /Um olhar mais de perto/u);
  assert.match(resultDashboard, /Seu nível de maturidade/u);
  assert.match(resultDashboard, /Seu mapa de maturidade/u);
  assert.match(resultDashboard, /Seus próximos três movimentos/u);
  assert.match(resultDashboard, /Pontos fortes/u);
  assert.match(resultDashboard, /Seu próximo desafio/u);
  assert.match(resultDashboard, /Dica prática/u);
  assert.match(resultDashboard, /Para levar com você/u);
  assert.match(resultDashboard, /Seu resultado ajuda a personalizar sua experiência/u);
  assert.match(chart, /Veja como suas respostas se distribuem nos temas que fazem parte do seu perfil\./u);
  assert.doesNotMatch(diagnostic, /Diagnóstico empreendedor principal/u);
  assert.match(diagnostic, /Seu objetivo de aplicação/u);
  assert.match(diagnostic, /saveApplicationObjectiveAction/u);
  assert.doesNotMatch(profile, /Seu objetivo de aplicação/u);
  assert.match(actions, /\/empreendedor\/perfil\/diagnostico\?sucesso=objetivo_salvo/u);
});

test("admin diagnostic and gamification loading are isolated from newer optional workspaces", async () => {
  const [diagnostic, gamification] = await Promise.all([
    source("apps/web/app/admin/diagnostico/page.tsx"),
    source("apps/web/app/admin/gamificacao/page.tsx"),
  ]);
  assert.match(diagnostic, /getAdminProductWorkspace/u);
  assert.match(gamification, /getAdminGamificationWorkspace/u);
});

test("journey continuation, projection and thumbnails cover every current track", async () => {
  const [home, journeyPage, migration] = await Promise.all([
    source("apps/web/app/empreendedor/page.tsx"),
    source("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
    source("supabase/migrations/20260810151000_complete_participant_journey_projection.sql"),
  ]);
  assert.match(home, /continueJourneyAction/u);
  assert.match(journeyPage, /continue_thumbnail/u);
  assert.match(migration, /sync_path_assignment_step_instances/u);
});

test("library and participant navigation follow the consolidated UX", async () => {
  const [library, shell] = await Promise.all([
    source("apps/web/app/empreendedor/biblioteca/page.tsx"),
    source("apps/web/components/participant-shell.tsx"),
  ]);
  assert.match(library, /Buscar/u);
  assert.doesNotMatch(library, />Aplicar filtros</u);
  assert.match(shell, /Recompensas/u);
});
