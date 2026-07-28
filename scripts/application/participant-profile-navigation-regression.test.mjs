import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [
  authContext,
  currentIdentity,
  participantContext,
  gateway,
  participantLayout,
  capacityLayout,
  participantHome,
  signupCompletion,
  signupCompletionAction,
  participantShell,
  rootLoading,
  participantLoading,
  capacityLoading,
  libraryAlias,
  libraryContentAlias,
  libraryShared,
  copyMigration,
  accessMigration,
] = await Promise.all([
  read("apps/web/lib/auth/context.ts"),
  read("apps/web/lib/auth/current-identity.ts"),
  read("apps/web/lib/auth/participant-context.ts"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("apps/web/app/empreendedor/layout.tsx"),
  read("apps/web/app/capacitacao/layout.tsx"),
  read("apps/web/app/empreendedor/page.tsx"),
  read("apps/web/app/cadastro/concluir/page.tsx"),
  read("apps/web/app/cadastro/concluir/actions.ts"),
  read("apps/web/components/participant-shell.tsx"),
  read("apps/web/app/loading.tsx"),
  read("apps/web/app/empreendedor/loading.tsx"),
  read("apps/web/app/capacitacao/loading.tsx"),
  read("apps/web/app/empreendedor/biblioteca/page.tsx"),
  read("apps/web/app/empreendedor/biblioteca/[slug]/page.tsx"),
  read("apps/web/components/participant-library-page.tsx"),
  read("supabase/migrations/20260727194500_update_openai_journey_copy.sql"),
  read("supabase/migrations/20260728133000_definitive_participant_access_boundary.sql"),
]);

test("participant routes use one canonical access boundary", () => {
  assert.match(participantContext, /requireParticipantContext/u);
  assert.match(participantContext, /access_mode === "administrative"/u);
  assert.match(participantContext, /onboarding_required/u);
  assert.match(participantContext, /redirect\(auth\.identity\.next_path/u);
  for (const route of [participantLayout, capacityLayout, participantHome]) {
    assert.match(route, /requireParticipantContext/u);
    assert.doesNotMatch(route, /Perfil empreendedor não disponível/u);
  }
});

test("administrative identities cannot enter or submit participant onboarding", () => {
  for (const source of [signupCompletion, signupCompletionAction]) {
    assert.match(source, /access_mode === "administrative"/u);
    assert.match(source, /auth\.identity\.next_path \|\| "\/admin"/u);
  }
});

test("gateway classifies identities and blocks participant RPCs before database execution", () => {
  assert.match(currentIdentity, /access_mode/u);
  assert.match(currentIdentity, /next_path/u);
  assert.match(gateway, /participantOnlyRpcs/u);
  assert.match(gateway, /ADMINISTRATIVE_ACCESS_REQUIRED/u);
  assert.match(gateway, /PARTICIPANT_PROFILE_REQUIRED/u);
  assert.match(gateway, /participant_profile_required/u);
  assert.match(gateway, /if \(participantOnlyRpcs\.has\(name\) && accessMode !== "participant"\)/u);
  assert.ok(gateway.indexOf("participantOnlyRpcs.has(name)") < gateway.lastIndexOf("admin.rpc(name, args)"));
});

test("database identity exposes canonical access mode and participant fallbacks do not raise generic errors", () => {
  assert.match(accessMigration, /'access_mode',v_access_mode/u);
  assert.match(accessMigration, /'next_path',v_next_path/u);
  assert.match(accessMigration, /when 'administrative' then '\/admin'/u);
  assert.match(accessMigration, /'participant_status','profile_required'/u);
  assert.doesNotMatch(accessMigration, /raise exception 'PARTICIPANT_NOT_FOUND'/u);
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
  assert.match(copyMigration, /IA na prática para impulsionar o seu negócio/u);
  assert.match(copyMigration, /OpenAI \(ChatGPT\)/u);
  assert.doesNotMatch(copyMigration, /update catalog\.journey_versions/u);
  assert.match(copyMigration, /coalesce\(nullif\(definition\.name,''\),version\.title\)/u);
  assert.match(copyMigration, /coalesce\(definition\.purpose,version\.description\)/u);
});
