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

test("announcement editor supports responsive artwork and image-wide links", async () => {
  const [page, action, upload, runtime, carousel] = await Promise.all([
    source("apps/web/app/admin/engajamento/page.tsx"),
    source("apps/web/app/admin/engajamento/actions.ts"),
    source("apps/web/app/api/announcement-banner-uploads/route.ts"),
    source("apps/web/lib/engagement/runtime.ts"),
    source("apps/web/components/announcement-carousel.tsx"),
  ]);

  assert.doesNotMatch(page, /name="cta_label"/u);
  assert.match(page, /desktop_file/u);
  assert.match(page, /mobile_file/u);
  assert.doesNotMatch(action, /cta_incompleto/u);
  assert.match(action, /ctaLabel: parsed\.data\.ctaUrl \?/u);
  assert.match(upload, /current_mobile_image_file_object_id/u);
  assert.match(runtime, /desktop_image_url/u);
  assert.match(runtime, /mobile_image_url/u);
  assert.match(carousel, /announcement\.cta_url/u);
  assert.match(carousel, /<picture/u);
});

test("diagnostic result and profile objective use the approved participant copy and placement", async () => {
  const [diagnostic, profile, actions] = await Promise.all([
    source("apps/web/app/empreendedor/perfil/diagnostico/page.tsx"),
    source("apps/web/app/empreendedor/perfil/page.tsx"),
    source("apps/web/app/empreendedor/perfil/actions.ts"),
  ]);

  assert.match(diagnostic, /Seu resultado/u);
  assert.match(diagnostic, /Acesse seu diagnóstico/u);
  assert.match(profile, /objetivo de aplicação/u);
  assert.match(actions, /objetivo_aplicacao/u);
});

test("admin diagnostic and gamification loading are isolated from newer optional workspaces", async () => {
  const [diagnostic, gamification] = await Promise.all([
    source("apps/web/app/admin/diagnostico/page.tsx"),
    source("apps/web/lib/admin/gamification-management.ts"),
  ]);

  assert.doesNotMatch(diagnostic, /get_admin_product_workspace/u);
  assert.match(gamification, /get_admin_gamification_workspace/u);
});

test("journey continuation, projection and thumbnails cover every current track", async () => {
  const [continuation, migration] = await Promise.all([
    source("apps/web/app/empreendedor/continue-journey-action.ts"),
    source("supabase/migrations/20260810151000_complete_participant_journey_projection.sql"),
  ]);

  assert.match(continuation, /journey_id/u);
  assert.match(migration, /participant/u);
  assert.match(migration, /journey/u);
});

test("library and participant navigation follow the consolidated UX", async () => {
  const [library, home] = await Promise.all([
    source("apps/web/app/admin/biblioteca/page.tsx"),
    source("apps/web/app/empreendedor/page.tsx"),
  ]);

  assert.match(library, /biblioteca/iu);
  assert.match(home, /PageHeader/u);
});
