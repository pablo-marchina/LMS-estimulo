import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const auditUrl = new URL('../../docs/implementation/e14-context-source-audit-v0.1.json', import.meta.url);
const audit = JSON.parse(await readFile(auditUrl, 'utf8'));

assert.equal(audit.artifact, 'e14_context_source_audit');
assert.equal(audit.status, 'reviewed_before_step_3');
assert.equal(audit.source_priority[0], 'current explicit project decisions');
assert.equal(audit.source_priority[1], 'private operational repository and connected Supabase');
assert.ok(audit.frontend_findings.private_repository.includes('no Next.js app'));
assert.ok(audit.frontend_findings.public_foundation.includes('executable Next.js'));
assert.ok(audit.frontend_findings.lovable_prototype.includes('prototype'));
assert.ok(audit.corrections.some((item) => item.includes('Step 0 remains PARTIAL')));
for (const classification of ['KEEP', 'REFACTOR', 'REPLACE', 'REMOVE_FROM_RUNTIME']) {
  assert.ok(audit.step_3_requires.some((item) => item.includes(classification)));
}

console.log(JSON.stringify({
  status: 'ok',
  artifact: audit.artifact,
  source_levels: audit.source_priority.length,
  frontend_sources: Object.keys(audit.frontend_findings).length,
  corrections: audit.corrections.length,
  ready_for_step_3_audit: true
}, null, 2));
