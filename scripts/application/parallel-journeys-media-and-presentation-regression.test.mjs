import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [home, journeys, copy, outline, outlineAction, activity, quickCheck, contextNav, adminPage, journeyAction, adminActions, adminRuntime, gateway, motion] = await Promise.all([
  read("apps/web/app/empreendedor/page.tsx"),
  read("apps/web/app/empreendedor/jornadas/page.tsx"),
  read("apps/web/lib/content/participant-copy.ts"),
  read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
  read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts"),
  read("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx"),
  read("apps/web/components/quick-check-panel.tsx"),
  read("apps/web/components/journey-progress-nav.tsx"),
  read("apps/web/app/admin/produto/page.tsx"),
  read("apps/web/app/admin/produto/journey-action.ts"),
  read("apps/web/app/admin/produto/actions.ts"),
  read("apps/web/lib/admin/product-management.ts"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("apps/web/app/brand-motion.css"),
]);

test("participant home ends with future rewards rather than a achievements recap", () => {
  assert.match(home, /O que você pode ganhar/u);
  assert.doesNotMatch(home, /Suas conquistas/u);
  assert.match(home, /pendingRewards/u);
});

test("journey catalog supports featured, active, recommended, open and completed sections", () => {
  assert.match(journeys, /presentation\.featured/u);
  assert.match(journeys, /Em andamento/u);
  assert.match(journeys, /participantCopy\.journeys\.recommendedTitle/u);
  assert.match(copy, /Recomendadas para você/u);
  assert.match(journeys, /Outras jornadas/u);
  assert.match(journeys, /Concluídas/u);
  assert.doesNotMatch(journeys, /a4ffebde-f7de-4a76-af6a-221a2c398dd6/u);
});

test("all available, active and completed lessons can be opened independently", () => {
  assert.match(outlineAction, /z\.enum\(\["available", "in_progress", "completed"\]\)/u);
  assert.match(outlineAction, /focusActivity/u);
  assert.match(outline, /todas disponíveis/u);
  assert.match(outline, /Rever atividade/u);
  assert.doesNotMatch(outline, /Bloquead/u);
});

test("activity context is lesson-specific and contains rating and quick check", () => {
  assert.match(contextNav, /activityTitle/u);
  assert.doesNotMatch(contextNav, /Diagnóstico concluído/u);
  assert.doesNotMatch(contextNav, /Diagnóstico pendente/u);
  assert.match(activity, /Como foi esta aula/u);
  assert.match(activity, /QuickCheckPanel/u);
  assert.match(quickCheck, /Verificação rápida/u);
});

test("journey feature and track behavior are configurable by administrators", () => {
  assert.match(adminPage, /presentation_featured/u);
  assert.match(adminPage, /presentation_tone/u);
  assert.match(adminPage, /presentation_tags/u);
  assert.match(adminPage, /is_required/u);
  assert.match(journeyAction, /featured_rank/u);
  assert.match(adminActions, /configureAdminPathTemplate/u);
  assert.match(adminRuntime, /configure_admin_path_template/u);
  assert.match(gateway, /configure_admin_path_template/u);
});

test("visual layer keeps lively solid-color motion with reduced-motion support", () => {
  assert.match(motion, /brand-featured-journey/u);
  assert.match(motion, /brand-media-card/u);
  assert.match(motion, /brand-rating-card/u);
  assert.match(motion, /prefers-reduced-motion/u);
  assert.doesNotMatch(motion, /linear-gradient|conic-gradient/u);
});
