import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [
  authContext,
  currentIdentity,
  gateway,
  participantLayout,
  capacityLayout,
  participantHome,
  participantShell,
  rootLoading,
  participantLoading,
  capacityLoading,
  libraryAlias,
  libraryContentAlias,
  libraryShared,
  migration,
] = await Promise.all([
  read("apps/web/lib/auth/context.ts"),
  read("apps/web/lib/auth/current-identity.ts"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("apps/web/app/empreendedor/layout.tsx"),
  read("apps/web/app/capacitacao/layout.tsx"),
  read("apps/web/app/empreendedor/page.tsx"),
  read("apps/web/components/participant-shell.tsx"),
  read("apps/web/app/loading.tsx"),
  read("apps/web/app/empreendedor/loading.tsx"),
  read("apps/web/app/capacitacao/loading.tsx"),
  read("apps/web/app/empreendedor/biblioteca/page.tsx"),
  read("apps/web/app/empreendedor/biblioteca/[slug]/page.tsx"),
  read("apps/web/components/participant-library-page.tsx"),
  read("supabase/migrations/20260727194500_update_openai_journey_copy.sql"),
]);

test("authenticated accounts without an entrepreneur profile resume onboarding", () => {
  for (const layout of [participantLayout, capacityLayout]) {
    assert.match(layout, /!auth\.identity\.entrepreneur_id/u);
    assert.match(layout, /redirect\("\/cadastro\/concluir"\)/u);
    assert.doesNotMatch(layout, /Perfil empreendedor não disponível/u);
  }
  assert.match(participantHome, /redirect\("\/cadastro\/concluir"\)/u);
  assert.doesNotMatch(participantHome, /Perfil empreendedor não disponível/u);
});

test("one verified gateway request resolves and memoizes navigation identity", () => {
  assert.match(authContext, /cache\(async/u);
  assert.match(authContext, /resolveCurrentIdentity/u);
  assert.doesNotMatch(authContext, /auth\.getUser/u);
  assert.doesNotMatch(authContext, /auth\.getClaims/u);
  assert.match(currentIdentity, /authenticated_email/u);
  assert.match(currentIdentity, /authenticated_provider/u);
  assert.match(gateway, /authenticated_email: email/u);
  assert.match(gateway, /authenticated_provider: provider/u);
});

test("route loading preserves participant context instead of a centered white card", () => {
  assert.doesNotMatch(rootLoading, /<Card/u);
  assert.doesNotMatch(rootLoading, /place-items-center/u);
  assert.match(rootLoading, /bg-background/u);
  assert.match(participantLoading, /ParticipantRouteLoading/u);
  assert.match(capacityLoading, /ParticipantRouteLoading/u);
});

test("library navigation stays under the entrepreneur layout", () => {
  assert.match(participantShell, /href: "\/empreendedor\/biblioteca"/u);
  assert.match(libraryAlias, /basePath="\/empreendedor\/biblioteca"/u);
  assert.match(libraryContentAlias, /basePath="\/empreendedor\/biblioteca"/u);
  assert.match(libraryShared, /basePath/u);
  assert.match(libraryShared, /`\$\{basePath\}\/\$\{item\.slug\}`/u);
});

test("journey public copy changes without mutating published curriculum versions", () => {
  assert.match(migration, /IA na prática para impulsionar o seu negócio/u);
  assert.match(migration, /OpenAI \(ChatGPT\)/u);
  assert.doesNotMatch(migration, /update catalog\.journey_versions/u);
  assert.match(migration, /coalesce\(nullif\(definition\.name,''\),version\.title\)/u);
  assert.match(migration, /coalesce\(definition\.purpose,version\.description\)/u);
});
