import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [
  library, points, profile, chart, journeyMigration, adminShell, adminOverview,
  users, diagnostic, diagnosticActions, gamification, gamificationActions,
  certificatePositioning, maturity, gateway, roleMigration, pointMigration,
] = await Promise.all([
  read("apps/web/app/capacitacao/biblioteca/page.tsx"),
  read("apps/web/app/empreendedor/engajamento/page.tsx"),
  read("apps/web/app/empreendedor/perfil/page.tsx"),
  read("apps/web/components/diagnostic-dimension-chart.tsx"),
  read("supabase/migrations/20260726233001_participant_journey_and_diagnostic_summary.sql"),
  read("apps/web/components/admin-shell.tsx"),
  read("apps/web/app/admin/page.tsx"),
  read("apps/web/app/admin/usuarios/page.tsx"),
  read("apps/web/app/admin/diagnostico/page.tsx"),
  read("apps/web/app/admin/diagnostico/actions.ts"),
  read("apps/web/app/admin/gamificacao/page.tsx"),
  read("apps/web/app/admin/gamificacao/actions.ts"),
  read("apps/web/components/certificate-template-positioning.tsx"),
  read("apps/web/app/admin/maturidade/page.tsx"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("supabase/migrations/20260726233002_estimulo_readonly_and_general_admin.sql"),
  read("supabase/migrations/20260726233004_event_driven_point_rules.sql"),
]);

test("participant journey state prioritizes available steps over locked steps", () => {
  assert.match(journeyMigration, /when 'available' then 1/u);
  assert.match(journeyMigration, /available_at desc nulls last/u);
});

test("participant library no longer explains where OpenAI journeys live", () => {
  assert.doesNotMatch(library, /Procurando a jornada da OpenAI/u);
  assert.doesNotMatch(library, /A Biblioteca não lista trilhas/u);
});

test("points page contains only points history rules and ranking", () => {
  assert.doesNotMatch(points, /Nenhuma conquista ainda/u);
  assert.doesNotMatch(points, /O que você pode ganhar/u);
  assert.doesNotMatch(points, /Nenhuma entrega enviada ainda/u);
  assert.match(points, /Como ganhar pontos/u);
  assert.match(points, /Histórico de pontuação/u);
  assert.match(points, /Ranking/u);
});

test("profile removes misplaced card accent and displays five-area diagnostic chart", () => {
  assert.match(profile, /no-card-top-accent/u);
  assert.match(profile, /DiagnosticDimensionChart/u);
  assert.match(profile, /participantDiagnosticSummary/u);
  assert.match(chart, /role="meter"/u);
  assert.match(chart, /percentage/u);
});

test("admin navigation and overview omit integrations identities and comment counts", () => {
  assert.doesNotMatch(adminShell, /\/admin\/integracoes/u);
  assert.doesNotMatch(adminOverview, /Comentários para moderar/u);
  assert.doesNotMatch(adminOverview, /Identidades para resolver/u);
});

test("users page contains one general administrator role and no identity queue", () => {
  assert.match(users, /Administrador geral/u);
  assert.match(users, /Somente visualização/u);
  assert.doesNotMatch(users, /Identidades pendentes/u);
  assert.doesNotMatch(users, /HubSpot/u);
  assert.match(roleMigration, /name='Administrador geral'/u);
  assert.match(roleMigration, /status='retired'/u);
});

test("diagnostics can be safely retired by a general administrator", () => {
  assert.match(diagnostic, /Excluir diagnóstico/u);
  assert.match(diagnostic, /retireDiagnosticAction/u);
  assert.match(diagnosticActions, /retire_admin_diagnostic|diagnosticManagementRuntime\.retire/u);
  assert.match(gateway, /"retire_admin_diagnostic"/u);
});

test("published point rules require and react to real platform events", () => {
  assert.match(gamification, /Acontecimento monitorado/u);
  assert.match(gamificationActions, /trigger_event/u);
  assert.match(gamificationActions, /trigger:\s*\{ event_name/u);
  assert.match(pointMigration, /after insert on eventing\.events/u);
  assert.match(pointMigration, /award_participant_action_points/u);
  assert.doesNotMatch(gateway, /"award_participant_action_points"/u);
});

test("certificate template uses a visible positioning editor", () => {
  assert.match(gamification, /CertificateTemplatePositioning/u);
  assert.match(certificatePositioning, /NOME DO PARTICIPANTE/u);
  assert.match(certificatePositioning, /NOME DA JORNADA/u);
  assert.match(certificatePositioning, /name="name_y_percent"/u);
  assert.match(certificatePositioning, /name="journey_y_percent"/u);
});

test("business maturity no longer exposes governance review", () => {
  assert.doesNotMatch(maturity, /Governança e revisão/u);
  assert.doesNotMatch(maturity, /Pendências para homologação/u);
  assert.match(maturity, /Simulação local/u);
});
