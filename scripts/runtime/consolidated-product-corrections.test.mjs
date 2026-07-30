import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("participant authentication exposes password recovery and accessible visibility controls", async () => {
  const [login, signup, field, requestAction, callback, updateAction] = await Promise.all([
    source("apps/web/app/entrar/page.tsx"),
    source("apps/web/app/cadastro/page.tsx"),
    source("apps/web/components/password-field.tsx"),
    source("apps/web/app/recuperar-senha/actions.ts"),
    source("apps/web/app/auth/password-recovery/route.ts"),
    source("apps/web/app/redefinir-senha/actions.ts"),
  ]);

  assert.match(login, /href="\/recuperar-senha"/u);
  assert.match(login, /Sou da equipe Estímulo/u);
  assert.match(signup, /terms_version/u);
  assert.match(signup, /href="\/privacidade"/u);
  assert.match(field, /aria-label=\{visible \? "Ocultar senha" : "Mostrar senha"\}/u);
  assert.match(requestAction, /resetPasswordForEmail/u);
  assert.match(callback, /exchangeCodeForSession/u);
  assert.match(callback, /type: "recovery"/u);
  assert.match(updateAction, /updateUser\(\{ password:/u);
});

test("diagnostic completion persists answers, result navigation and idempotent points", async () => {
  const [page, stepper, action, result, migration] = await Promise.all([
    source("apps/web/app/empreendedor/diagnostico/page.tsx"),
    source("apps/web/components/diagnostic-stepper.tsx"),
    source("apps/web/app/empreendedor/diagnostico/actions.ts"),
    source("apps/web/app/empreendedor/resultado/page.tsx"),
    source("supabase/migrations/20260730020728_complete_diagnostic_point_rule.sql"),
  ]);

  assert.match(page, /DiagnosticStepper/u);
  assert.match(stepper, /Pergunta \{currentIndex \+ 1\} de \{items.length\}/u);
  assert.match(action, /recordDiagnosticResponse/u);
  assert.match(action, /completeDiagnostic/u);
  assert.match(action, /award_participant_action_points/u);
  assert.match(action, /p_action_code: "complete_diagnostic"/u);
  assert.match(action, /\/empreendedor\/resultado\?journey=/u);
  assert.match(result, /diagnostico === "concluido"/u);
  assert.match(migration, /'maximum', 1/u);
  assert.match(migration, /diagnostic\.session\.completed/u);
});

test("certificate wallet and templates remain discoverable after upload", async () => {
  const [upload, page, runtime, migration, editor] = await Promise.all([
    source("apps/web/app/api/external-credential-uploads/route.ts"),
    source("apps/web/app/admin/gamificacao/page.tsx"),
    source("apps/web/lib/credentials/extended-runtime.ts"),
    source("supabase/migrations/20260730021001_operator_certificate_template_catalog.sql"),
    source("apps/web/app/admin/gamificacao/certificate-editor.tsx"),
  ]);

  assert.match(upload, /waitForProjection/u);
  assert.match(upload, /\[0, 100, 250, 500\]/u);
  assert.match(runtime, /list_operator_certificate_templates/u);
  assert.match(migration, /metadata->>'category' = 'certificate_template'/u);
  assert.match(page, /Templates salvos/u);
  assert.match(editor, /Template salvo/u);
});

test("administrative destructive actions are dependency-safe", async () => {
  const [libraryAction, libraryMigration, trackAction, trackMigration, trackEditor] = await Promise.all([
    source("apps/web/app/actions/library.ts"),
    source("supabase/migrations/20260730021926_safe_library_content_archiving.sql"),
    source("apps/web/app/admin/produto/track-actions.ts"),
    source("supabase/migrations/20260730022413_safe_admin_track_archiving.sql"),
    source("apps/web/app/admin/produto/trilha-editor.tsx"),
  ]);

  assert.match(libraryAction, /archive_library_content/u);
  assert.match(libraryMigration, /LIBRARY_CONTENT_IN_USE/u);
  assert.match(trackAction, /archive_admin_track/u);
  assert.match(trackMigration, /DEFAULT_TRACK_CANNOT_BE_ARCHIVED/u);
  assert.match(trackMigration, /TRACK_HAS_ACTIVE_ASSIGNMENTS/u);
  assert.match(trackEditor, /if \(trilha\.status === "retired"\) return null/u);
});

test("gateway, help, legal and admin recovery contracts are versioned", async () => {
  const [gateway, layout, users, terms, privacy, pointEditor] = await Promise.all([
    source("supabase/functions/authenticated-rpc/index.ts"),
    source("apps/web/app/layout.tsx"),
    source("apps/web/app/admin/usuarios/actions.ts"),
    source("apps/web/app/termos/page.tsx"),
    source("apps/web/app/privacidade/page.tsx"),
    source("apps/web/app/admin/gamificacao/point-rule-editor.tsx"),
  ]);

  for (const rpc of [
    "archive_admin_interface_content",
    "archive_admin_track",
    "archive_library_content",
    "award_participant_action_points",
    "list_operator_certificate_templates",
    "register_admin_interface_content",
    "save_admin_journey",
    "save_admin_lesson",
    "save_admin_track",
  ]) {
    assert.match(gateway, new RegExp(`\\b${rpc}\\b`, "u"));
  }
  assert.match(layout, /SupportButton/u);
  assert.match(users, /sendUserPasswordRecoveryAction/u);
  assert.match(terms, /aprovação jurídica/u);
  assert.match(privacy, /responsável jurídico e de privacidade/u);
  assert.match(pointEditor, /diagnostic\.session\.completed/u);
});
