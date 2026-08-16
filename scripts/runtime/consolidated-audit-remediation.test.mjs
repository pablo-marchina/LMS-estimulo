import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("participant home keeps the editable greeting personalized", async () => {
  const [header, home, migration] = await Promise.all([
    source("apps/web/components/ui/page-header.tsx"),
    source("apps/web/app/empreendedor/page.tsx"),
    source("supabase/migrations/20260810152000_dynamic_participant_greeting.sql"),
  ]);

  assert.match(header, /interpolateInterfaceVariables/u);
  assert.match(header, /return value\.replace\(/u);
  assert.match(header, /Object\.prototype\.hasOwnProperty\.call\(variables, key\)/u);
  assert.match(home, /eyebrow="Olá, \{\{nome\}\}!"/u);
  assert.match(home, /variables=\{\{ nome: firstName \}\}/u);
  assert.match(migration, /participant\.page\.overview\.header\.eyebrow/u);
  assert.match(migration, /Olá, \{\{nome\}\}!/u);
  assert.match(migration, /Use \{\{nome\}\}/u);
  assert.match(migration, /published_value->>'text'.*Olá!/su);
});

test("announcement editor supports responsive artwork, image-wide links and compact participant banners", async () => {
  const [page, action, upload, runtime, carousel, globals] = await Promise.all([
    source("apps/web/app/admin/engajamento/page.tsx"),
    source("apps/web/app/admin/engajamento/actions.ts"),
    source("apps/web/app/api/announcement-banner-uploads/route.ts"),
    source("apps/web/lib/engagement/runtime.ts"),
    source("apps/web/components/announcement-carousel.tsx"),
    source("apps/web/app/globals.css"),
  ]);

  assert.doesNotMatch(page, /name="cta_label"/u);
  assert.match(page, /desktop_file/u);
  assert.match(page, /mobile_file/u);
  assert.doesNotMatch(action, /cta_incompleto/u);
  assert.match(action, /ctaLabel: parsed\.data\.ctaUrl \?/u);
  assert.match(upload, /current_mobile_image_file_object_id/u);
  assert.match(upload, /uploadVariant\("desktop_file", "desktop"/u);
  assert.match(upload, /uploadVariant\("mobile_file", "mobile"/u);
  assert.match(runtime, /isMissingAnnouncementMobileSignature/u);
  assert.match(runtime, /ANNOUNCEMENT_MOBILE_SCHEMA_REQUIRED/u);
  assert.match(carousel, /className="absolute inset-0 z-20"/u);
  assert.match(carousel, /brand-carousel-slide/u);
  assert.match(globals, /\.brand-carousel-slide \{[^}]*aspect-ratio: 8 \/ 3;[^}]*min-height: 14rem;/su);
  assert.match(globals, /@media \(max-width: 720px\)[\s\S]*\.brand-carousel-slide \{[^}]*aspect-ratio: 16 \/ 10;[^}]*min-height: 0;/su);
  assert.match(carousel, /variant=mobile/u);
});

test("diagnostic result uses the configured participant copy without retired score blocks", async () => {
  const [diagnostic, dashboard, chart, profile, actions, blocks] = await Promise.all([
    source("apps/web/app/empreendedor/perfil/diagnostico/page.tsx"),
    source("apps/web/components/diagnostic-result-dashboard.tsx"),
    source("apps/web/components/diagnostic-dimension-chart.tsx"),
    source("apps/web/app/empreendedor/perfil/page.tsx"),
    source("apps/web/app/empreendedor/perfil/actions.ts"),
    source("apps/web/lib/diagnostics/result-blocks.ts"),
  ]);

  assert.match(diagnostic, /Um olhar mais de perto/u);
  assert.match(dashboard, /Seu perfil empreendedor/u);
  assert.match(dashboard, /Seu mapa de maturidade/u);
  assert.doesNotMatch(dashboard, /Seus próximos três movimentos/u);
  assert.doesNotMatch(dashboard, />\/100</u);
  assert.match(blocks, /intentionally excluded from[\s\S]*validCodes/u);
  assert.match(dashboard, /Pontos fortes/u);
  assert.match(dashboard, /Seu próximo desafio/u);
  assert.match(dashboard, /Dica prática/u);
  assert.match(dashboard, /Para levar com você/u);
  assert.match(dashboard, /Seu resultado ajuda a personalizar sua experiência/u);
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
    source("apps/web/lib/admin/gamification-management.ts"),
  ]);

  assert.match(diagnostic, /type === "opcionais"/u);
  assert.match(diagnostic, /extensionsRuntime\.adminWorkspace/u);
  assert.match(diagnostic, /\.catch\(\(\) => null\)/u);
  assert.match(gamification, /get_admin_gamification_workspace/u);
  assert.match(gamification, /getAdminProductWorkspace/u);
});

test("journey continuation, projection and thumbnails cover every current track", async () => {
  const [continueAction, migration, journeyPage, lessonBuilder] = await Promise.all([
    source("apps/web/app/empreendedor/continue-journey-action.ts"),
    source("supabase/migrations/20260810151000_complete_participant_journey_projection.sql"),
    source("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
    source("apps/web/app/admin/produto/trilha-aula-builder.tsx"),
  ]);

  assert.match(continueAction, /focusedStepInstanceId/u);
  assert.match(continueAction, /const next = focused \?\?/u);
  assert.match(migration, /partition by assignment\.path_template_id/u);
  assert.match(migration, /sync_path_assignment_step_instances/u);
  assert.match(migration, /refresh_participant_journey_progress/u);
  assert.match(migration, /module_key.*path_template_id/su);
  assert.doesNotMatch(migration, /template\.position/u);
  assert.match(journeyPage, /continue_thumbnail_file_object_id/u);
  assert.match(journeyPage, /\/api\/activity-thumbnails\/\$\{activity\.step_instance_id\}/u);
  assert.match(lessonBuilder, /recommendedDimensions="1200 × 675 px"/u);
  assert.match(lessonBuilder, /recommendedAspectRatio="16:9"/u);
});

test("library and participant navigation follow the consolidated UX", async () => {
  const [adminLibrary, participantLibrary, participantShell] = await Promise.all([
    source("apps/web/app/admin/biblioteca/page.tsx"),
    source("apps/web/components/participant-library-page.tsx"),
    source("apps/web/components/participant-shell.tsx"),
  ]);

  assert.match(adminLibrary, />BUSCAR<\/Button>/u);
  assert.match(participantLibrary, /OpenAI, ChatGPT, contabilidade ou atendimento/u);
  assert.match(participantLibrary, />BUSCAR<\/Button>/u);
  assert.doesNotMatch(participantShell, /participant\.nav\.points/u);
  assert.doesNotMatch(participantShell, /participant\.nav\.submissions/u);
  assert.match(participantShell, /participant\.nav\.rewards/u);
  assert.doesNotMatch(participantShell, /participant\.nav\.profile/u);
  assert.match(participantShell, /Meu perfil/u);
});
