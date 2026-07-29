import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [
  rootLayout,
  navigationFeedback,
  pendingButton,
  participantError,
  home,
  profile,
  profileActions,
  diagnosis,
  journeys,
  achievements,
  issuerFields,
  uploadRoute,
  signupCompletion,
  participantCopy,
  credentialRuntime,
  engagementRuntime,
  diagnosticRuntime,
  gateway,
  migration,
] = await Promise.all([
  read("apps/web/app/layout.tsx"),
  read("apps/web/components/navigation-feedback.tsx"),
  read("apps/web/components/pending-submit-button.tsx"),
  read("apps/web/components/participant-route-error.tsx"),
  read("apps/web/app/empreendedor/page.tsx"),
  read("apps/web/app/empreendedor/perfil/page.tsx"),
  read("apps/web/app/empreendedor/perfil/actions.ts"),
  read("apps/web/app/empreendedor/diagnostico/page.tsx"),
  read("apps/web/app/empreendedor/jornadas/page.tsx"),
  read("apps/web/app/empreendedor/conquistas/page.tsx"),
  read("apps/web/components/external-credential-issuer-fields.tsx"),
  read("apps/web/app/api/external-credential-uploads/route.ts"),
  read("apps/web/app/cadastro/concluir/page.tsx"),
  read("apps/web/lib/content/participant-copy.ts"),
  read("apps/web/lib/credentials/extended-runtime.ts"),
  read("apps/web/lib/engagement/runtime.ts"),
  read("apps/web/lib/diagnostics/participant-runtime.ts"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("supabase/migrations/20260728170000_structural_homolog_user_experience.sql"),
]);

test("navigation and form submissions expose immediate loading feedback", () => {
  assert.match(rootLayout, /NavigationFeedback/u);
  assert.match(navigationFeedback, /document\.addEventListener\("click"/u);
  assert.match(navigationFeedback, /Carregando próxima página/u);
  assert.match(pendingButton, /useFormStatus/u);
  for (const source of [home, profile, diagnosis, journeys, achievements, signupCompletion]) {
    assert.match(source, /PendingSubmitButton/u);
  }
  assert.match(participantError, /Seus dados continuam salvos/u);
});

test("diagnostic entry is canonical and independent from hardcoded journey ids or titles", () => {
  assert.match(profileActions, /participantDiagnosticRuntime\.resolveEntry/u);
  assert.doesNotMatch(profileActions, /OPENAI_JOURNEY_VERSION_ID|a4ffebde|\/openai\/i/u);
  assert.match(diagnosticRuntime, /resolve_participant_diagnostic_entry/u);
  assert.match(diagnosticRuntime, /get_participant_experience_with_default_diagnostic/u);
  assert.match(migration, /e14_active_profile_diagnostic_version/u);
  assert.match(migration, /coalesce\(nullif\(version\.configuration->>'diagnostic_version_id'/u);
  assert.match(migration, /diagnostics\.archetype_assignments/u);
  assert.match(gateway, /resolve_participant_diagnostic_entry/u);
  assert.match(diagnosis, /requireParticipantContext/u);
});

test("objective persistence reads the saved value and does not depend on the layout boundary", () => {
  assert.match(profileActions, /requireParticipantContext/u);
  assert.match(profileActions, /set_participant_application_objective/u);
  assert.match(engagementRuntime, /get_participant_profile_summary/u);
  assert.match(profile, /defaultValue=\{profileSummary\?\.application_objective/u);
  assert.match(migration, /profile_data->>'application_objective'/u);
});

test("external credential wallet distinguishes zero from unavailable and shares one projection", () => {
  assert.match(achievements, /Promise\.allSettled/u);
  assert.match(achievements, /externalUnavailable \? "—" : external\?\.count/u);
  assert.doesNotMatch(achievements, /listExternal[\s\S]*catch\(\(\) => \(\{ items: \[\] \}\)\)/u);
  assert.match(credentialRuntime, /count: number/u);
  assert.match(credentialRuntime, /download_available/u);
  assert.match(migration, /left join core\.file_objects/u);
  assert.match(migration, /'count',coalesce\(v_count,0\)/u);
  assert.match(migration, /'storage_status'/u);
});

test("external credential institutions come from a database catalog and confirmed files are never compensated", () => {
  assert.match(migration, /catalog\.external_credential_issuers/u);
  assert.match(migration, /Aliança Empreendedora/u);
  assert.match(migration, /Be\.labs/u);
  assert.match(migration, /Emperifa/u);
  assert.match(issuerFields, /issuer_code/u);
  assert.match(issuerFields, /issuer_other/u);
  assert.match(uploadRoute, /listIssuers/u);
  assert.match(uploadRoute, /credentialConfirmed/u);
  assert.match(uploadRoute, /if \(!credentialConfirmed\)/u);
  assert.match(uploadRoute, /EXTERNAL_CREDENTIAL_PROJECTION_INCONSISTENT/u);
  assert.match(gateway, /list_external_credential_issuers/u);
});

test("reviewed participant copy is centralized and obsolete language is absent", () => {
  assert.match(participantCopy, /Todos os seus certificados em um só lugar/u);
  assert.match(participantCopy, /Recomendadas para você/u);
  assert.match(participantCopy, /Jornadas disponíveis para todos/u);
  assert.match(participantCopy, /Disponível para todos/u);
  assert.match(participantCopy, /Quando concluir uma jornada, ela aparecerá aqui/u);
  for (const source of [home, journeys]) {
    assert.doesNotMatch(source, /atividades obrigatórias|Aberta para todos|Caminhos abertos para todos/u);
  }
  assert.match(achievements, /participantCopy\.certificates\.fields\.courseName/u);
  assert.match(achievements, /participantCopy\.certificates\.submit/u);
});

test("CPF explanation states purpose and protection without exposing the number", () => {
  assert.match(participantCopy, /confirmar sua identidade/u);
  assert.match(participantCopy, /evitar cadastros duplicados/u);
  assert.match(participantCopy, /criptografado/u);
  assert.match(signupCompletion, /participantCopy\.cpf\.protectedDescription/u);
  assert.match(signupCompletion, /participantCopy\.cpf\.inputDescription/u);
});
