import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [
  announcements,
  announcementForm,
  home,
  shell,
  profileTabs,
  rewards,
  journeys,
  journeyOutline,
  lessonBuilder,
  upload,
  header,
  cms,
  certificateIssuer,
  certificatePdf,
  migration,
  lessonUnlockMigration,
  gateway,
] = await Promise.all([
  read("apps/web/components/announcement-carousel.tsx"),
  read("apps/web/app/admin/engajamento/page.tsx"),
  read("apps/web/app/empreendedor/page.tsx"),
  read("apps/web/components/participant-shell.tsx"),
  read("apps/web/components/participant-profile-tabs.tsx"),
  read("apps/web/app/empreendedor/recompensas/rewards-experience.tsx"),
  read("apps/web/app/empreendedor/jornadas/page.tsx"),
  read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
  read("apps/web/app/admin/produto/trilha-aula-builder.tsx"),
  read("apps/web/components/file-upload-preview.tsx"),
  read("apps/web/components/ui/page-header.tsx"),
  read("apps/web/app/admin/experiencia/page.tsx"),
  read("apps/web/app/admin/gamificacao/certificate-issuer-manager.tsx"),
  read("apps/web/lib/credentials/pdf.ts"),
  read("supabase/migrations/20260806023000_definitive_platform_content_progress_certificates.sql"),
  read("supabase/migrations/20260814011000_restore_completion_unlock_trigger.sql"),
  read("supabase/functions/authenticated-rpc/index.ts"),
]);

test("announcements use responsive artwork, same-tab destinations and preserve the carousel", () => {
  assert.match(announcementForm, /name="desktop_file"/u);
  assert.match(announcementForm, /name="mobile_file"/u);
  assert.match(announcementForm, /1600 × 600 px/u);
  assert.match(announcementForm, /800 × 1000 px/u);
  assert.match(announcements, /variant=mobile/u);
  assert.doesNotMatch(announcements, /target="_blank"/u);
  assert.match(announcements, /brand-carousel-viewport/u);
});

test("participant home and profile follow the consolidated navigation contract", () => {
  assert.ok(home.indexOf("<PageHeader") < home.indexOf("<AnnouncementCarousel"));
  assert.ok(home.indexOf("<AnnouncementCarousel") < home.indexOf("<form action={continueJourneyAction}"));
  assert.match(profileTabs, /href: "\/empreendedor\/perfil\/diagnostico", label: "Perfil empreendedor"/u);
  assert.match(profileTabs, /href: "\/empreendedor\/perfil", label: "Minha conta"/u);
  assert.match(profileTabs, /href: "\/empreendedor\/perfil\/entregas", label: "Entregas"/u);
  assert.match(profileTabs, /href: "\/empreendedor\/perfil\/conquistas", label: "Certificados"/u);
  assert.doesNotMatch(shell, /\/empreendedor\/pontuacao/u);
  assert.doesNotMatch(shell, /\/empreendedor\/entregas/u);
});

test("rewards, journeys and lesson continuation expose the requested behavior", () => {
  assert.match(rewards, /Como conseguir pontos/u);
  assert.match(rewards, /pointRules/u);
  assert.match(journeys, /inProgress/u);
  assert.doesNotMatch(journeys, /!featuredIds\.has/u);
  assert.match(home, /continueJourneyAction/u);
  assert.match(journeyOutline, /activity-thumbnails/u);
  assert.match(lessonBuilder, /continue_thumbnail_file/u);
});

test("lesson completion always unlocks newly eligible following content", () => {
  assert.match(lessonUnlockMigration, /reconcile_participant_step_availability/u);
  assert.match(lessonUnlockMigration, /step_instance\.status = 'locked'/u);
  assert.match(lessonUnlockMigration, /previous_step\.is_required/u);
  assert.match(lessonUnlockMigration, /previous_instance\.status, 'locked'\) <> 'completed'/u);
  assert.match(lessonUnlockMigration, /create constraint trigger trg_reconcile_after_step_completion/u);
  assert.match(lessonUnlockMigration, /deferrable initially deferred/u);
  assert.match(lessonUnlockMigration, /new\.status = 'completed'/u);
  assert.match(lessonUnlockMigration, /refresh_participant_journey_progress/u);
  assert.match(lessonUnlockMigration, /for v_journey_instance_id in/u);
});

test("CMS and uploads expose responsive media and explicit validation guidance", () => {
  assert.match(header, /mobile_image_file_object_id/u);
  assert.match(header, /overlay_opacity/u);
  assert.match(cms, /Imagem desktop/u);
  assert.match(cms, /Imagem mobile/u);
  assert.match(upload, /recommendedDimensions/u);
  assert.match(upload, /recommendedAspectRatio/u);
  assert.match(upload, /maxSizeBytes/u);
  assert.match(upload, /existingPreviewUrl/u);
});

test("certificate identity, numbering, rendering and participant repair are executable", () => {
  assert.match(certificateIssuer, /CNPJ/u);
  assert.match(certificateIssuer, /Representante/u);
  assert.match(certificatePdf, /certificate_number/u);
  assert.match(certificatePdf, /qrCommands/u);
  assert.match(migration, /certificate_number_sequence/u);
  assert.match(migration, /ensure_estimulo_membership_for_entrepreneur/u);
  assert.match(migration, /sync_live_path_step_instances/u);
  assert.match(migration, /home_badge_highlights/u);
  for (const rpc of [
    "get_admin_certificate_issuer",
    "get_admin_home_badge_highlights",
    "get_participant_featured_badges",
    "get_participant_lesson_thumbnail_download",
  ]) assert.match(gateway, new RegExp(`\\b${rpc}\\b`, "u"));
});
