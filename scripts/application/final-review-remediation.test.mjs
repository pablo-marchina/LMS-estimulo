import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [announcementRoute, engagementPage, certificateAlias, optionalDiagnosticAlias, gamificationPage, uploadPreview, table, visualCapture, visualWorkflow, migration, outlineRuntime, carousel, bannerImageRoute, bannerStorage, journeyCoverRoute, thumbnailRoute, certificatePreviewRoute, authenticatedRpc] = await Promise.all([
  readFile("apps/web/app/api/announcement-banner-uploads/route.ts", "utf8"),
  readFile("apps/web/app/admin/engajamento/page.tsx", "utf8"),
  readFile("apps/web/app/admin/certificados/page.tsx", "utf8"),
  readFile("apps/web/app/admin/diagnosticos-opcionais/page.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/page.tsx", "utf8"),
  readFile("apps/web/components/file-upload-preview.tsx", "utf8"),
  readFile("apps/web/components/ui/table.tsx", "utf8"),
  readFile("scripts/e2e/production-visual-capture.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
  readFile("supabase/migrations/20260816170000_complete_review_remediation.sql", "utf8"),
  readFile("apps/web/lib/journey-runtime/outline-runtime.ts", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("apps/web/app/api/announcements/[announcementId]/image/route.ts", "utf8"),
  readFile("apps/web/lib/storage/announcement-banners.ts", "utf8"),
  readFile("apps/web/app/api/journey-covers/[journeyVersionId]/[variant]/route.ts", "utf8"),
  readFile("apps/web/app/api/activity-thumbnails/[stepInstanceId]/route.ts", "utf8"),
  readFile("apps/web/app/api/certificate-template-previews/[fileObjectId]/route.ts", "utf8"),
  readFile("supabase/functions/authenticated-rpc/index.ts", "utf8"),
]);

test("global announcements reject participant-private runtime destinations", () => {
  assert.match(announcementRoute, /privateParticipantDestination/u);
  assert.match(announcementRoute, /ANNOUNCEMENT_PRIVATE_DESTINATION_NOT_ALLOWED/u);
  assert.match(announcementRoute, /validatedAnnouncementDestination\(nullable\(formData\.get\("cta_url"\)\), request\)/u);
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

test("visual workflow validates pull requests without auditing stale production", () => {
  assert.match(visualWorkflow, /Validate visual capture tooling/u);
  assert.match(visualWorkflow, /github\.event_name == 'pull_request'/u);
  assert.match(visualWorkflow, /node --check scripts\/e2e\/production-visual-capture\.mjs/u);
  assert.match(visualWorkflow, /github\.event_name == 'workflow_dispatch'/u);
  assert.match(visualWorkflow, /Capture desktop and mobile visual evidence/u);
});

test("participant journey reading survives auxiliary reconcile failures", () => {
  assert.match(outlineRuntime, /const currentOutline = await loadOutline/u);
  assert.match(outlineRuntime, /ensure_participant_open_paths/u);
  assert.match(outlineRuntime, /catch \{\s*return currentOutline;/u);
  assert.ok((authenticatedRpc.match(/ensure_participant_open_paths/gu) ?? []).length >= 2, "open-path reconcile must be allowlisted and participant-scoped");
});

test("image-only announcements preserve the uploaded artwork without a text overlay", () => {
  assert.match(carousel, /const imageOnly = announcement\.display_mode === "image_only"/u);
  assert.match(carousel, /\{!imageOnly \? <>/u);
  assert.doesNotMatch(carousel, /imageOnly \? "!bg-/u);
  assert.match(carousel, /loading=\{priority \? "eager" : "lazy"\}/u);
  assert.match(carousel, /fetchPriority=\{priority \? "high" : "auto"\}/u);
});

test("private participant media reuses signed redirects instead of reauthenticating on every render", () => {
  assert.match(bannerStorage, /ANNOUNCEMENT_BANNER_SIGNED_URL_SECONDS = 900/u);
  for (const route of [bannerImageRoute, journeyCoverRoute, thumbnailRoute, certificatePreviewRoute]) {
    assert.match(route, /private, max-age=300/u);
  }
  assert.match(journeyCoverRoute, /SIGNED_URL_SECONDS = 900/u);
  assert.match(thumbnailRoute, /SIGNED_URL_SECONDS = 900/u);
  assert.match(certificatePreviewRoute, /SIGNED_URL_SECONDS = 900/u);
});

test("certificate template preview avoids the redundant extensions gateway while retaining SQL authorization", () => {
  assert.match(certificatePreviewRoute, /createPrivilegedClient\(\)\.rpc\("get_admin_certificate_template_preview_download"/u);
  assert.match(certificatePreviewRoute, /p_actor_user_account_id: auth\.identity\.user_account_id/u);
  assert.doesNotMatch(certificatePreviewRoute, /extensionsRuntime/u);
});
