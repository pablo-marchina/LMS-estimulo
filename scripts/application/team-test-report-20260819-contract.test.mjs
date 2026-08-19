import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  diagnostic,
  quickCheck,
  completionAction,
  activityPage,
  journeyProgress,
  phoneField,
  journeysPage,
  profileDiagnostic,
  participantShell,
  participantShellRuntime,
  contentViewer,
  rewardPage,
  badgePopup,
  confirmationPage,
  confirmationSubmit,
  confirmationTemplate,
  landingPage,
  migration,
] = await Promise.all([
  readFile("apps/web/components/diagnostic-stepper.tsx", "utf8"),
  readFile("apps/web/components/quick-check-form.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/completion-action.ts", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/components/journey-progress-nav.tsx", "utf8"),
  readFile("apps/web/components/phone-field.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/diagnostico/page.tsx", "utf8"),
  readFile("apps/web/components/participant-shell.tsx", "utf8"),
  readFile("apps/web/lib/extensions/participant-shell-runtime.ts", "utf8"),
  readFile("apps/web/components/content-asset-viewer.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/recompensas/page.tsx", "utf8"),
  readFile("apps/web/components/badge-acquisition-popup.tsx", "utf8"),
  readFile("apps/web/app/auth/confirm/page.tsx", "utf8"),
  readFile("apps/web/components/email-confirmation-submit.tsx", "utf8"),
  readFile("supabase/templates/confirmation.html", "utf8"),
  readFile("apps/web/app/_landing-pages/boost-2026-08-16.tsx", "utf8"),
  readFile("supabase/migrations/20260819193557_team_test_report_structural_fixes.sql", "utf8"),
]);

test("diagnostic advances immediately after choosing an alternative", () => {
  assert.match(diagnostic, /function selectAnswer\(itemId: string, optionCode: string\)/u);
  assert.match(diagnostic, /onChange=\{\(\) => selectAnswer\(current\.id, option\.code\)\}/u);
  assert.match(diagnostic, /setCurrentIndex\(\(index\) => Math\.min\(items\.length - 1, index \+ 1\)\)/u);
  assert.match(diagnostic, /localStorage\.setItem\(draftKey/u);
});

test("verification choices never preselect an answer", () => {
  assert.doesNotMatch(quickCheck, /\sdefaultChecked=/u);
  assert.doesNotMatch(quickCheck, /\schecked=/u);
});

test("lesson completion remains on a resolvable activity route", () => {
  assert.match(completionAction, /\/empreendedor\/atividade\/\$\{step\}\?journey=\$\{journey\}&conclusao=\$\{outcome\}/u);
  assert.doesNotMatch(completionAction, /redirect\(`\/empreendedor\/jornada\/\$\{journey\}/u);
  assert.equal((activityPage.match(/id="concluir-aula"/gu) ?? []).length, 1);
  assert.match(activityPage, /Nenhum material adicional necessário/u);
  assert.match(activityPage, /eventuais selos liberados/u);
});

test("lesson navigation emphasizes progress and the next lesson", () => {
  assert.match(journeyProgress, /Progresso da jornada/u);
  assert.match(journeyProgress, /Próxima aula/u);
  assert.match(journeyProgress, /variant=\{next \? "primary" : "secondary"\}/u);
});

test("signup phone starts empty and uses an example placeholder", () => {
  assert.match(phoneField, /prefill = false/u);
  assert.match(phoneField, /prefill \? formatBrazilianPhone\(defaultValue\) : ""/u);
  assert.match(phoneField, /placeholder="\(00\) 00000-0000"/u);
});

test("empty recommendation, optional-diagnostic and library surfaces are data gated", () => {
  assert.match(journeysPage, /\{recommended\.length \? <JourneySection/u);
  assert.match(profileDiagnostic, /\{optionalDiagnostics\.length \? <section/u);
  assert.match(participantShell, /participant\.nav\.library" \|\| hasLibraryContent/u);
  assert.match(participantShellRuntime, /has_library_content: boolean/u);
  assert.match(participantShellRuntime, /library_item_count: number/u);
});

test("lesson video playback prefers private managed storage and remains responsive", () => {
  assert.match(contentViewer, /managed_storage_object_key/u);
  assert.match(contentViewer, /managedStorageBucket === "lesson-videos"/u);
  assert.match(contentViewer, /autoplayNextNativeVideo/u);
  assert.match(contentViewer, /aspect-video w-full min-w-0 max-w-full/u);
});

test("reward redemption and badge acquisition retain explicit feedback", () => {
  assert.match(rewardPage, /Recompensa resgatada com sucesso!/u);
  assert.match(badgePopup, /badge/u);
});

test("email confirmation is app-owned and token-hash based", () => {
  assert.match(confirmationTemplate, /\.RedirectTo/u);
  assert.match(confirmationTemplate, /token_hash=\{\{ \.TokenHash \}\}&type=email/u);
  assert.doesNotMatch(confirmationTemplate, /\.ConfirmationURL/u);
  assert.match(confirmationPage, /EmailConfirmationSubmit/u);
  assert.match(confirmationSubmit, /requestSubmit\(\)/u);
});

test("public site and platform share signup and login entry points", () => {
  assert.match(landingPage, /href="\/cadastro"/u);
  assert.match(landingPage, /href="\/entrar"/u);
});

test("database migration authorizes managed lesson videos and data-driven library availability", () => {
  assert.match(migration, /managed_storage_bucket/u);
  assert.match(migration, /lesson-videos/u);
  assert.match(migration, /create or replace function public\.get_activity_asset_download/u);
  assert.match(migration, /create or replace function public\.get_participant_shell_context/u);
  assert.match(migration, /has_library_content/u);
});
