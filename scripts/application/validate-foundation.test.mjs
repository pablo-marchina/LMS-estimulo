import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (file) => readFile(resolve(root, file), 'utf8');

async function findMigration(suffix) {
  const names = (await readdir(resolve(root, 'supabase/migrations')))
    .filter((name) => name.endsWith(suffix))
    .sort();
  assert.equal(names.length, 1, `expected one migration ending with ${suffix}`);
  return `supabase/migrations/${names[0]}`;
}

const applicationMigration = await findMigration('_m14_step5_application_read_surfaces.sql');
const operatorMigration = await findMigration('_m14b_step5_operator_workspace.sql');

test('workspace contém aplicação Next.js real em apps/web', async () => {
  const rootPackage = JSON.parse(await read('package.json'));
  const webPackage = JSON.parse(await read('apps/web/package.json'));
  assert.deepEqual(rootPackage.workspaces, ['apps/*']);
  assert.equal(webPackage.dependencies.next, '16.2.10');
});

test('rotas centrais e credenciais existem', async () => {
  for (const file of [
    'entrar/page.tsx',
    'cadastro/page.tsx',
    'empreendedor/page.tsx',
    'empreendedor/diagnostico/page.tsx',
    'empreendedor/atividade/[stepInstanceId]/page.tsx',
    'empreendedor/resultado/page.tsx',
    'empreendedor/credenciais/page.tsx',
    'credenciais/[verificationCode]/page.tsx',
    'admin/page.tsx',
  ]) {
    assert.ok((await read(`apps/web/app/${file}`)).length > 50);
  }
});

test('service role permanece server-only', async () => {
  const admin = await read('apps/web/lib/supabase/admin.ts');
  const actions = await read('apps/web/app/actions/journey.ts');
  const credentials = await read('apps/web/lib/credentials/runtime.ts');
  assert.ok(admin.includes('import "server-only"'));
  assert.ok(credentials.includes('import "server-only"'));
  assert.ok(!actions.includes('SUPABASE_SERVICE_ROLE_KEY'));
  assert.ok(!credentials.includes('SUPABASE_SERVICE_ROLE_KEY'));
});

test('todos os comandos da jornada são acessados pela camada tipada', async () => {
  const rpc = await read('apps/web/lib/journey-runtime/rpc.ts');
  for (const name of [
    'publishVertical',
    'createEnrollment',
    'startJourney',
    'startDiagnostic',
    'recordDiagnosticResponse',
    'completeDiagnostic',
    'startActivity',
    'acknowledgeSection',
    'startQuickCheck',
    'recordQuickCheckAnswer',
    'submitQuickCheck',
    'getParticipantState',
    'getOperatorResult',
  ]) {
    assert.ok(rpc.includes(name));
  }
});

test('descoberta multi-jornada não depende de UUID hardcoded', async () => {
  const home = await read('apps/web/app/empreendedor/page.tsx');
  const migration = await read(applicationMigration);
  assert.ok(home.includes('listParticipantJourneys'));
  assert.ok(migration.includes('e14_list_participant_journeys'));
  assert.ok(!home.includes('runtime_validation_journey'));
});

test('conteúdo versionado vem do backend e não vaza resposta correta', async () => {
  const migration = await read(applicationMigration);
  assert.ok(migration.includes('content_sections'));
  assert.ok(migration.includes('assessment.answer_options'));
  assert.ok(!migration.includes("'is_correct'"));
});

test('migration operacional é localizada por nome sem timestamp hardcoded', async () => {
  const migration = await read(operatorMigration);
  assert.ok(migration.includes('e14_get_operator_workspace'));
});

test('resultados pedagógicos não são apresentados como decisão de crédito', async () => {
  const result = await read('apps/web/app/empreendedor/resultado/page.tsx');
  assert.ok(result.includes('não os apresenta como score, risco ou decisão de crédito'));
});

test('admin não exige UUIDs digitados manualmente', async () => {
  const source = await read('apps/web/app/admin/page.tsx');
  assert.ok(source.includes('workspace.journey_versions'));
  assert.ok(source.includes('workspace.participants'));
  assert.ok(!source.includes('ID do empreendedor'));
  assert.ok(!source.includes('ID da versão da jornada'));
});

test('cadastro público real e cadastro sintético permanecem separados', async () => {
  const login = await read('apps/web/app/entrar/page.tsx');
  const signup = await read('apps/web/app/cadastro/page.tsx');
  const testSignup = await read('apps/web/app/cadastro/teste/page.tsx');
  const gate = await read('apps/web/lib/auth/test-public-signup.ts');
  assert.ok(login.includes('href="/cadastro"'));
  assert.ok(login.includes('href="/cadastro/teste"'));
  assert.ok(signup.includes('createPublicAccountAction'));
  assert.ok(signup.includes('Acesso público'));
  assert.ok(testSignup.includes('notFound()'));
  assert.ok(gate.includes('PUBLIC_SIGNUP_TEST_MODE'));
  assert.ok(gate.includes('process.env.NODE_ENV !== "production"'));
  assert.ok(gate.includes('ALLOWED_APP_ENVIRONMENTS.has'));
});

test('login direciona participante e operador conforme identidade interna', async () => {
  const action = await read('apps/web/app/entrar/actions.ts');
  assert.ok(action.includes('auth.identity.entrepreneur_id'));
  assert.ok(action.includes('/admin?organization='));
});

test('atividade renderiza o heading real do conteúdo versionado', async () => {
  const activity = await read('apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx');
  assert.ok(activity.includes('section.heading'));
});

test('avaliação registra todas as questões versionadas', async () => {
  const activity = await read('apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx');
  const actions = await read('apps/web/app/actions/journey.ts');
  assert.ok(activity.includes('assessment.questions.map'));
  assert.ok(activity.includes('answer_${question.id}'));
  assert.ok(actions.includes('for (const question of assessment.questions)'));
  assert.ok(actions.includes(':answer:${question.id}'));
});

test('tentativa reprovada retorna para revisão da atividade', async () => {
  const actions = await read('apps/web/app/actions/journey.ts');
  assert.ok(actions.includes('updated.state.q?.passed'));
  assert.ok(actions.includes('/empreendedor/atividade/${step}'));
});

test('aprovação processa credenciais pela camada server-only', async () => {
  const actions = await read('apps/web/app/actions/journey.ts');
  const runtime = await read('apps/web/lib/credentials/runtime.ts');
  assert.ok(actions.includes('credentialRuntime.issue'));
  assert.ok(runtime.includes('issue_learning_credentials'));
  assert.ok(runtime.includes('verify_certificate'));
});

test('área operacional mantém consulta quando gestão não está disponível', async () => {
  const admin = await read('apps/web/app/admin/page.tsx');
  assert.ok(admin.includes('Promise.allSettled'));
  assert.ok(admin.includes('Consulta disponível'));
});

test('painel consolida próxima ação, progresso, pontos e credenciais', async () => {
  const home = await read('apps/web/app/empreendedor/page.tsx');
  assert.ok(home.includes('participantNextActionLabel'));
  assert.ok(home.includes('participantJourneyPriority'));
  assert.ok(home.includes('credentialRuntime.listParticipant'));
  assert.ok(home.includes('dashboard-next'));
  assert.ok(home.includes('Pontos registrados'));
});

test('diagnóstico, atividade e resultado compartilham orientação de etapas', async () => {
  const files = [
    'apps/web/app/empreendedor/diagnostico/page.tsx',
    'apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx',
    'apps/web/app/empreendedor/resultado/page.tsx'
  ];
  for (const file of files) assert.ok((await read(file)).includes('JourneyProgressNav'));
  const navigation = await read('apps/web/components/journey-progress-nav.tsx');
  assert.ok(navigation.includes('aria-current'));
  assert.ok(navigation.includes('journey-progress-step--locked'));
});

test('shell oferece salto para conteúdo e navegação de painel', async () => {
  const shell = await read('apps/web/components/app-shell.tsx');
  assert.ok(shell.includes('Pular para o conteúdo'));
  assert.ok(shell.includes('id="conteudo-principal"'));
  assert.ok(shell.includes('{ href: "/empreendedor", label: "Painel" }'));
});
