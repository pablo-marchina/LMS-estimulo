import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [announcementRoute, engagementPage, certificateAlias, optionalDiagnosticAlias, gamificationPage, uploadPreview, table, visualCapture, migration] = await Promise.all([
  readFile("apps/web/app/api/announcement-banner-uploads/route.ts", "utf8"),
  readFile("apps/web/app/admin/engajamento/page.tsx", "utf8"),
  readFile("apps/web/app/admin/certificados/page.tsx", "utf8"),
  readFile("apps/web/app/admin/diagnosticos-opcionais/page.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/page.tsx", "utf8"),
  readFile("apps/web/components/file-upload-preview.tsx", "utf8"),
  readFile("apps/web/components/ui/table.tsx", "utf8"),
  readFile("scripts/e2e/production-visual-capture.mjs", "utf8"),
  readFile("supabase/migrations/20260816170000_complete_review_remediation.sql", "utf8"),
]);

test("global announcements reject participant-private runtime destinations", () => {
  assert.match(announcementRoute, /privateParticipantDestination/u);
  assert.match(announcementRoute, /ANNOUNCEMENT_PRIVATE_DESTINATION_NOT_ALLOWED/u);
  assert.match(announcementRoute, /validatedAnnouncementDestination\(nullable\(formData\.get\("cta_url"\)\)\)/u);
  assert.match(announcementRoute, /parsed\.protocol !== "https:"/u);
  assert.match(announcementRoute, /!normalized\.startsWith\("\/\/"\)/u);
  assert.match(engagementPage, /páginas compartilháveis/u);
  assert.match(migration, /update engagement\.announcements/u);
  assert.match(migration, /\/empreendedor\/jornadas/u);
});

test("legacy admin aliases render their requested workspace directly", () => {
  assert.doesNotMatch(certificateAlias, /redirect\(/u);
  assert.match(certificateAlias, /AdminGamificationPage/u);
  assert.match(certificateAlias, /tipo: "certificados"/u);
  assert.doesNotMatch(optionalDiagnosticAlias, /redirect\(/u);
  assert.match(optionalDiagnosticAlias, /AdminDiagnosticPage/u);
  assert.match(optionalDiagnosticAlias, /tipo: "opcionais"/u);
});

test("gamification labels resolve against the complete active catalog while editor choices remain assessments", () => {
  assert.match(gamificationPage, /catalogActivityTargets/u);
  assert.match(gamificationPage, /hasAssessment: Boolean\(activity\.assessment\)/u);
  assert.match(gamificationPage, /filter\(\(target\) => target\.hasAssessment\)/u);
  assert.match(gamificationPage, /targetLabel\(recurrence, catalogActivityTargets\)/u);
});

test("mobile admin content constrains intrinsic-width controls to their scroll containers", () => {
  assert.match(uploadPreview, /grid min-w-0 max-w-full gap-2/u);
  assert.match(uploadPreview, /min-w-0 w-full max-w-full rounded-xl/u);
  assert.match(table, /min-w-0 max-w-full overflow-x-auto/u);
});

test("point-rule publication is versioned with one live publication per definition", () => {
  assert.match(migration, /row_number\(\) over/u);
  assert.match(migration, /set status = 'retired'/u);
  assert.match(migration, /retire_superseded_point_rule_publications/u);
  assert.match(migration, /before insert on engagement\.point_rule_versions/u);
  assert.match(migration, /uq_point_rule_versions_single_published/u);
  assert.match(migration, /v_previous_live_edit/u);
  assert.match(migration, /coalesce\(v_previous_live_edit, 'off'\)/u);
  assert.doesNotMatch(migration, /delete from engagement\.point_rule_versions/u);
});

test("visual auditor preserves query-state coverage and rejects semantic broken pages", () => {
  assert.ok(visualCapture.includes('return `${url.pathname}${url.search}`;'));
  assert.match(visualCapture, /__q__/u);
  assert.match(visualCapture, /rendered semantic not-found state/u);
  assert.match(visualCapture, /authenticated page rendered insufficient meaningful content/u);
  assert.match(visualCapture, /finalRoute/u);
});
