import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [signup, signupAction, preview, globals, legacyMotion, participantShell, adminShell, adminHome, product, library, diagnostic, points, gateway, announcementAdmin, announcementCarousel, announcementRoute] = await Promise.all([
  read("apps/web/app/cadastro/page.tsx"),
  read("apps/web/app/cadastro/actions.ts"),
  read("apps/web/components/file-upload-preview.tsx"),
  read("apps/web/app/globals.css"),
  read("apps/web/app/brand-motion.css"),
  read("apps/web/components/participant-shell.tsx"),
  read("apps/web/components/admin-shell.tsx"),
  read("apps/web/app/admin/page.tsx"),
  read("apps/web/app/admin/produto/page.tsx"),
  read("apps/web/app/capacitacao/biblioteca/page.tsx"),
  read("apps/web/app/admin/diagnostico/page.tsx"),
  read("apps/web/app/empreendedor/engajamento/page.tsx"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("apps/web/app/admin/engajamento/page.tsx"),
  read("apps/web/components/announcement-carousel.tsx"),
  read("apps/web/app/api/announcement-banner-uploads/route.ts"),
]);

test("initial signup collects protected identity and contact data", () => {
  assert.match(signup, /name="cpf"/u);
  assert.match(signup, /name="telefone"/u);
  assert.match(signup, /name="cnpj"/u);
  assert.match(signupAction, /protectCpf/u);
  assert.match(signupAction, /signup_cpf_encrypted/u);
  assert.match(signupAction, /toE164Br/u);
});

test("upload fields provide image PDF and generic previews", () => {
  assert.match(preview, /URL\.createObjectURL/u);
  assert.match(preview, /type="application\/pdf"/u);
  assert.match(preview, /clearSelection/u);
});

test("brand system avoids multicolor decorative gradients", () => {
  assert.doesNotMatch(globals, /conic-gradient/u);
  assert.doesNotMatch(globals, /linear-gradient\([^;\n]*(?:magenta|cyan)[^;\n]*(?:green|gold)|linear-gradient\([^;\n]*(?:green|gold)[^;\n]*(?:magenta|cyan)/iu);
  assert.doesNotMatch(legacyMotion, /linear-gradient|conic-gradient/u);
  assert.match(globals, /background-color:\s*var\(--color-primary\)/u);
});

test("participant navigation is compact and admin navigation is a collapsible sidebar", () => {
  assert.match(participantShell, /sticky top-0/u);
  assert.match(participantShell, /min-h-16/u);
  assert.match(adminShell, /<aside/u);
  assert.match(adminShell, /collapsed/u);
  assert.match(adminShell, /Recolher menu/u);
  assert.match(adminShell, /lg:hidden/u);
});

test("admin home and builders use Estimulo context without organization selectors", () => {
  assert.match(adminHome, /administrativeOrganization/u);
  assert.doesNotMatch(adminHome, /name="organization"/u);
  assert.match(product, /1\. Jornada/u);
  assert.match(product, /2\. Trilhas/u);
  assert.match(product, /3\. Aulas/u);
  assert.match(product, /4\. Publicar/u);
  assert.doesNotMatch(diagnostic, /name="organization"/u);
});

test("library explains paths belong to journeys and points follow admin rules", () => {
  assert.match(library, /Trilhas e aulas ficam na área Jornadas/u);
  assert.match(points, /Como ganhar pontos/u);
  assert.match(points, /participantPointRules/u);
});

test("announcement banners have upload guidance preview and disappear when empty", () => {
  assert.match(announcementAdmin, /1600 × 600 px/u);
  assert.match(announcementAdmin, /FileUploadPreview/u);
  assert.match(announcementAdmin, /image_only/u);
  assert.match(announcementRoute, /uploadAnnouncementBanner/u);
  assert.match(announcementCarousel, /if \(!slides\.length\) return null/u);
  assert.match(announcementCarousel, /image_file_object_id/u);
});

test("authenticated runtime allows journey discovery self enrollment diagnostic and banner operations", () => {
  assert.match(gateway, /"e14_list_eligible_journeys"/u);
  assert.match(gateway, /"e14_self_enroll"/u);
  assert.match(gateway, /"get_participant_experience_with_default_diagnostic"/u);
  assert.match(gateway, /"create_announcement_banner_upload_intent"/u);
  assert.match(gateway, /"confirm_announcement_banner_upload"/u);
  assert.match(gateway, /"get_announcement_banner_download"/u);
});

test("admin publishing identity resolution and library uploads use the gateway", () => {
  assert.match(gateway, /"publish_admin_journey_version"/u);
  assert.match(gateway, /"create_library_upload_intent"/u);
  assert.match(gateway, /"confirm_library_upload"/u);
  assert.match(gateway, /"get_library_file_download"/u);
  assert.match(gateway, /"list_admin_identity_resolution_cases"/u);
  assert.match(gateway, /"resolve_admin_identity_resolution_case"/u);
});
