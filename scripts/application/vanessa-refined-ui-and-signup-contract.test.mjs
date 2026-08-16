import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  shell,
  navItem,
  pageHeader,
  card,
  home,
  rewardsPage,
  rewards,
  profileLayout,
  profileTabs,
  lessonNav,
  signupProvisioning,
  diagnosticJourneyMigration,
  legalReadMigration,
  migrationBoundary,
] = await Promise.all([
  readFile("apps/web/components/participant-shell.tsx", "utf8"),
  readFile("apps/web/components/ui/nav-item.tsx", "utf8"),
  readFile("apps/web/components/ui/page-header.tsx", "utf8"),
  readFile("apps/web/components/ui/card.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/recompensas/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/recompensas/rewards-experience.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/layout.tsx", "utf8"),
  readFile("apps/web/components/participant-profile-tabs.tsx", "utf8"),
  readFile("apps/web/components/journey-progress-nav.tsx", "utf8"),
  readFile("apps/web/lib/auth/public-signup-provisioning.ts", "utf8"),
  readFile("supabase/migrations/20260816050000_fix_diagnostic_presentation_and_journey_track_order.sql", "utf8"),
  readFile("supabase/migrations/20260816120000_public_signup_legal_documents_anon_read.sql", "utf8"),
  readFile("scripts/database/migration-history/active-release-boundary.mjs", "utf8"),
]);

test("participant navigation follows the refined Lovable information architecture", () => {
  assert.match(shell, /h-14 w-full max-w-\[1200px\]/u);
  assert.doesNotMatch(shell, /brand-logo-capsule/u);
  assert.doesNotMatch(shell, /participant\.nav\.profile/u);
  assert.match(shell, /function UserMenu/u);
  assert.match(shell, /Meu perfil/u);
  assert.match(navItem, /border-b-2/u);
  assert.match(navItem, /border-primary !text-primary/u);
});

test("participant page chrome is flat, neutral and compact", () => {
  assert.match(pageHeader, /const hasMedia = !participant/u);
  assert.match(pageHeader, /border-b border-slate-200 pb-6/u);
  assert.match(pageHeader, /text-\[26px\].*text-primary/u);
  assert.doesNotMatch(card, /brand-card brand-float-card/u);
  assert.match(card, /border-slate-200 bg-white p-5/u);
});

test("home prioritizes the next learning action instead of decorative metrics", () => {
  assert.match(home, /Continuar aprendendo/u);
  assert.match(home, /Ver recompensas/u);
  assert.match(home, /Novidades para você/u);
  assert.match(home, /Em andamento/u);
  assert.doesNotMatch(home, /brand-points-card/u);
  assert.doesNotMatch(home, /brand-recognition-strip/u);
});

test("rewards opens on the catalog without redundant summary blocks", () => {
  assert.match(rewardsPage, /max-w-\[1200px\]/u);
  assert.match(rewardsPage, /title="Recompensas"/u);
  assert.doesNotMatch(rewards, /Pontos prontos para usar/u);
  assert.doesNotMatch(rewards, /Crédito automático/u);
  assert.doesNotMatch(rewards, /Central de recompensas/u);
  assert.doesNotMatch(rewards, /Transforme seu progresso em conquistas/u);
  assert.match(rewards, /Recompensas disponíveis/u);
});

test("profile uses the same restrained canvas and flat tabs as the refined reference", () => {
  assert.match(profileLayout, /max-w-\[1200px\]/u);
  assert.match(profileTabs, /border-b border-slate-200/u);
  assert.match(profileTabs, /border-b-2/u);
  assert.doesNotMatch(profileTabs, /rounded-2xl border border-border bg-white p-2 shadow-sm/u);
  assert.doesNotMatch(profileTabs, /bg-primary text-white shadow-sm/u);
});

test("lesson navigation mirrors the refined compact lesson hierarchy", () => {
  assert.match(lessonNav, /Voltar para a jornada/u);
  assert.match(lessonNav, /text-\[22px\].*sm:text-\[28px\]/u);
  assert.match(lessonNav, /border-b border-slate-200 pb-5/u);
  assert.match(lessonNav, /Próxima aula/u);
  assert.doesNotMatch(lessonNav, /brand-activity-context/u);
  assert.doesNotMatch(lessonNav, /rounded-2xl border border-primary/u);
});

test("public legal document reads do not require service-role credentials", () => {
  assert.match(signupProvisioning, /const client = await createSessionClient\(\)/u);
  assert.match(signupProvisioning, /client\.rpc\("get_signup_legal_documents"/u);
  assert.match(signupProvisioning, /createPrivilegedClient\(\)\.rpc\("stage_public_signup_legal_snapshot"/u);
  assert.match(legalReadMigration, /grant execute on function public\.get_signup_legal_documents\(uuid\[\]\) to anon, authenticated, service_role/u);
});

test("post-video product fixes are part of the same release boundary", () => {
  assert.match(diagnosticJourneyMigration, /v_presentation_configuration/u);
  assert.match(diagnosticJourneyMigration, /order by template\.position,template\.id/u);
  assert.match(migrationBoundary, /20260816050000_fix_diagnostic_presentation_and_journey_track_order\.sql/u);
  assert.match(migrationBoundary, /20260816120000_public_signup_legal_documents_anon_read\.sql/u);
  assert.match(migrationBoundary, /20260816170000_complete_review_remediation\.sql/u);
  assert.match(migrationBoundary, /20260816180000_reconcile_participant_navigation_registry\.sql/u);
  assert.match(migrationBoundary, /20260816190000_normalize_internal_announcement_destinations\.sql/u);
  assert.match(migrationBoundary, /20260816220130_retire_unimplemented_application_objective_point_rule\.sql/u);
  assert.match(migrationBoundary, /20260816220438_participant_shell_context\.sql/u);
  assert.match(migrationBoundary, /expectedLastMigration = '20260816230537_structured_participant_activity_completion\.sql'/u);
});
