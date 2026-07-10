import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const manifestPath = path.join(
  repositoryRoot,
  'docs/implementation/public-rpc-contracts-v1.json',
);
const inventorySqlPath = path.join(repositoryRoot, 'scripts/database/public-rpc-contracts/inventory.sql');

function runInventory(databaseUrl) {
  const result = spawnSync(
    'psql',
    [
      '--dbname',
      databaseUrl,
      '--no-psqlrc',
      '--set',
      'ON_ERROR_STOP=1',
      '--quiet',
      '--tuples-only',
      '--no-align',
      '--file',
      inventorySqlPath,
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PGOPTIONS: '-c client_min_messages=warning',
      },
    },
  );

  if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `public RPC inventory failed with status ${result.status}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim(),
    );
  }

  const lines = String(result.stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length !== 1) throw new Error(`expected one public RPC inventory row, received ${lines.length}`);
  return JSON.parse(lines[0]);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function parseGrantSet(value) {
  return sortedUnique(String(value).split(',').map((item) => item.trim()).filter(Boolean));
}

export function validateDatabaseContract(manifest, actual) {
  const expected = manifest.database_contract;
  assert.equal(actual.rpc_count, expected.rpc_count, 'public RPC count differs');
  assert.equal(actual.contract_sha256, expected.contract_sha256, 'public RPC fingerprint differs');
  assert.deepEqual(actual.signatures, expected.signatures, 'public RPC signatures differ');
  assert.equal(actual.rpcs.length, expected.rpc_count, 'public RPC detail inventory is incomplete');

  const expectedGrants = sortedUnique(expected.required_grantees.map((grantee) => `${grantee}:EXECUTE`));
  for (const rpc of actual.rpcs) {
    assert.equal(rpc.security_definer, expected.required_security_definer, `${rpc.signature} security mode differs`);
    assert.equal(rpc.config, expected.required_search_path, `${rpc.signature} search_path differs`);
    assert.deepEqual(parseGrantSet(rpc.grants), expectedGrants, `${rpc.signature} grants differ`);
    assert.match(rpc.definition_sha256, /^[0-9a-f]{64}$/, `${rpc.signature} definition hash is invalid`);
    for (const forbidden of expected.forbidden_grantees) {
      assert.ok(!rpc.grants.includes(`${forbidden}:`), `${rpc.signature} is executable by forbidden grantee ${forbidden}`);
    }
  }
}

function findMethodBlock(source, method, nextMethod) {
  const marker = `\n  ${method}:`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `application method ${method} is missing`);
  const end = nextMethod ? source.indexOf(`\n  ${nextMethod}:`, start + marker.length) : source.lastIndexOf('\n};');
  assert.notEqual(end, -1, `application method ${method} has no deterministic boundary`);
  return source.slice(start, end);
}

export function validateApplicationContract(manifest, source) {
  const contract = manifest.application_contract;
  const mappings = Object.entries(contract.method_to_rpc);
  assert.equal(mappings.length, contract.rpc_count ?? manifest.database_contract.rpc_count);

  const expectedRpcNames = sortedUnique(mappings.map(([, rpc]) => rpc));
  const referencedRpcNames = sortedUnique(
    [...source.matchAll(/"(e14_[a-z0-9_]+)"/g)].map((match) => match[1]),
  );
  assert.deepEqual(referencedRpcNames, expectedRpcNames, 'application RPC references differ from the frozen map');

  mappings.forEach(([method, rpc], index) => {
    const nextMethod = mappings[index + 1]?.[0];
    const block = findMethodBlock(source, method, nextMethod);
    assert.ok(block.includes(`"${rpc}"`), `${method} no longer calls ${rpc}`);

    if (contract.command_methods.includes(method)) {
      assert.ok(block.includes('RpcEnvelope<'), `${method} no longer expects the command envelope`);
      assert.match(block, /\bkey\b/, `${method} no longer supplies an idempotency key`);
    }
    if (contract.query_methods.includes(method)) {
      assert.ok(!block.includes('RpcEnvelope<'), `${method} unexpectedly uses a command envelope`);
    }
  });

  assert.ok(source.includes('if (error) throw new JourneyRpcError(error.code ?? "JOURNEY_RPC_ERROR", error.message);'), 'database error code propagation changed');
  assert.deepEqual(
    sortedUnique([
      ...contract.command_methods,
      ...contract.query_methods,
      ...contract.identity_methods,
    ]),
    sortedUnique(mappings.map(([method]) => method)),
    'application method classification is incomplete',
  );
}

export async function validatePublicContracts(databaseUrl) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const applicationSource = await readFile(
    path.join(repositoryRoot, manifest.application_contract.source_file),
    'utf8',
  );
  const actual = runInventory(databaseUrl);

  assert.equal(manifest.schema_version, '1.0');
  assert.equal(manifest.artifact, 'public_rpc_contracts');
  validateDatabaseContract(manifest, actual);
  validateApplicationContract(manifest, applicationSource);

  return {
    status: 'frozen',
    rpc_count: actual.rpc_count,
    contract_sha256: actual.contract_sha256,
    application_methods: Object.keys(manifest.application_contract.method_to_rpc).length,
    observed_error_codes: manifest.observed_error_codes,
    behavioral_replay_required: manifest.status.behavioral_replay_required,
  };
}

async function main() {
  const result = await validatePublicContracts(process.env.DATABASE_URL);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
