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

test('seis rotas do contrato existem', async () => {
  for (const file of [
    'entrar/page.tsx',
    'empreendedor/page.tsx',
    'empreendedor/diagnostico/page.tsx',
    'empreendedor/atividade/[stepInstanceId]/page.tsx',
    'empreendedor/resultado/page.tsx',
    'admin/page.tsx',
  ]) {
    assert.ok((await read(`apps/web/app/${file}`)).length > 50);
  }
});

test('service role permanece server-only', async () => {
  const admin = await read('apps/web/lib/supabase/admin.ts');
  const actions = await read('apps/web/app/actions/journeyRuntime.ts');
  assert.ok(admin.includes('import "server-only"'));
  assert.ok(!actions.includes('SUPABASE_SERVICE_ROLE_KEY'));
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

test('cadastro público não existe', async () => {
  const login = await read('apps/web/app/entrar/page.tsx');
  assert.ok(login.includes('cadastro público não está habilitado'));
  assert.ok(!login.includes('signUp'));
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

test('tentativa reprovada retorna para revisão da atividade', async () => {
  const actions = await read('apps/web/app/actions/journeyRuntime.ts');
  assert.ok(actions.includes('updated.state.q?.passed'));
  assert.ok(actions.includes('/empreendedor/atividade/${step}'));
});

test('área operacional mantém consulta quando gestão não está disponível', async () => {
  const admin = await read('apps/web/app/admin/page.tsx');
  assert.ok(admin.includes('Promise.allSettled'));
  assert.ok(admin.includes('Consulta disponível'));
});
