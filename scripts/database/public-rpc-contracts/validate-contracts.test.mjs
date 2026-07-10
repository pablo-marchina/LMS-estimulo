import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateApplicationContract, validateDatabaseContract } from './validate-contracts.mjs';

const manifest = JSON.parse(
  await readFile(new URL('../../../docs/implementation/public-rpc-contracts-v1.json', import.meta.url), 'utf8'),
);
const applicationSource = await readFile(
  new URL('../../../apps/web/lib/journey-runtime/rpc.ts', import.meta.url),
  'utf8',
);

function syntheticInventory() {
  const requiredGrants = manifest.database_contract.required_grantees
    .map((grantee) => `${grantee}:EXECUTE`)
    .sort()
    .join(',');
  return {
    rpc_count: manifest.database_contract.rpc_count,
    contract_sha256: manifest.database_contract.contract_sha256,
    signatures: manifest.database_contract.signatures,
    rpcs: manifest.database_contract.signatures.map((signature) => ({
      signature,
      security_definer: true,
      config: 'search_path=pg_catalog',
      grants: requiredGrants,
      definition_sha256: 'a'.repeat(64),
    })),
  };
}

test('application layer maps all frozen E14 public RPCs', () => {
  validateApplicationContract(manifest, applicationSource);
});

test('database contract accepts the exact frozen surface', () => {
  validateDatabaseContract(manifest, syntheticInventory());
});

test('database contract rejects a changed definition fingerprint', () => {
  const changed = syntheticInventory();
  changed.contract_sha256 = '0'.repeat(64);
  assert.throws(
    () => validateDatabaseContract(manifest, changed),
    /public RPC fingerprint differs/,
  );
});

test('application contract rejects an unlisted RPC reference', () => {
  assert.throws(
    () => validateApplicationContract(manifest, `${applicationSource}\nconst unexpected = "e14_unlisted_rpc";\n`),
    /application RPC references differ/,
  );
});
