import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpaqueInventory,
  parseE14Functions,
  validateApprovedSemanticReplacements,
} from "./inventory.mjs";

test("detects one-letter arguments and maps final consumers", () => {
  const sql = `
    create or replace function app_private.e14_emit_a(a uuid,b text)
    returns uuid language sql as $$ select a $$;

    create or replace function app_private.e14_semantic(p_actor uuid)
    returns uuid language sql as $$ select app_private.e14_emit_a(p_actor, 'x') $$;

    create or replace function public.e14_command(a uuid,b text)
    returns uuid language sql as $$ select app_private.e14_semantic(a) $$;
  `;

  const inventory = buildOpaqueInventory(parseE14Functions(sql, "synthetic.sql"));
  assert.equal(inventory.legacy_function_count, 2);
  assert.equal(inventory.legacy_private_helper_count, 1);
  assert.equal(inventory.legacy_public_rpc_count, 1);

  const helper = inventory.functions.find((entry) => entry.name === "e14_emit_a");
  assert.deepEqual(helper?.argument_names, ["a", "b"]);
  assert.deepEqual(helper?.consumers, ["app_private.e14_semantic(uuid)"]);
});

test("keeps only the final definition for the same signature", () => {
  const sql = `
    create or replace function app_private.e14_prepare_a(a uuid)
    returns text language sql as $$ select 'old' $$;

    create or replace function app_private.e14_prepare_a(p_actor uuid)
    returns text language sql as $$ select 'new' $$;
  `;

  const inventory = buildOpaqueInventory(parseE14Functions(sql, "synthetic.sql"));
  assert.equal(inventory.legacy_function_count, 0);
});

test("removes a dropped opaque function from the final inventory", () => {
  const sql = `
    create or replace function app_private.e14_old_helper(a uuid)
    returns void language sql as $$ select null $$;

    drop function app_private.e14_old_helper(uuid);
  `;

  const inventory = buildOpaqueInventory(parseE14Functions(sql, "synthetic.sql"));
  assert.equal(inventory.legacy_function_count, 0);
});

test("does not classify semantic arguments as opaque", () => {
  const sql = `
    create or replace function app_private.e14_request_hash(p_payload jsonb)
    returns text language sql as $$ select p_payload::text $$;
  `;

  const inventory = buildOpaqueInventory(parseE14Functions(sql, "synthetic.sql"));
  assert.equal(inventory.legacy_function_count, 0);
});

function fixtureInventory(functions) {
  return {
    schema_version: "1.0",
    artifact: "opaque_helper_baseline",
    detection_rule: "final E14 function definitions with one-letter argument names",
    migration_source: "supabase/migrations",
    legacy_function_count: functions.length,
    legacy_private_helper_count: functions.filter((entry) => entry.schema === "app_private").length,
    legacy_public_rpc_count: functions.filter((entry) => entry.schema === "public").length,
    inventory_sha256: "fixture",
    functions,
  };
}

const legacyEntry = {
  key: "app_private.e14_complete_progress(uuid)",
  schema: "app_private",
  name: "e14_complete_progress",
  argument_names: ["a"],
  argument_types: ["uuid"],
  definition_path: "supabase/migrations/legacy.sql",
  consumers: ["app_private.e14_i1_state(jsonb,uuid)"],
};

const semanticApproval = {
  schema_version: "1.0",
  artifact: "opaque_helper_semantic_replacements",
  replacements: [
    {
      key: legacyEntry.key,
      reason: "Correct the foreign-key target while preserving the frozen helper surface.",
      from_definition_path: "supabase/migrations/legacy.sql",
      to_definition_path: "supabase/migrations/replacement.sql",
    },
  ],
};

test("accepts only the documented definition-path replacement", () => {
  const expected = fixtureInventory([legacyEntry]);
  const actual = fixtureInventory([{ ...legacyEntry, definition_path: "supabase/migrations/replacement.sql" }]);

  assert.deepEqual(validateApprovedSemanticReplacements(expected, actual, semanticApproval), {
    approved_replacements: 1,
    changed_keys: [legacyEntry.key],
  });
});

test("rejects hidden surface changes inside an approved replacement", () => {
  const expected = fixtureInventory([legacyEntry]);
  const actual = fixtureInventory([{
    ...legacyEntry,
    definition_path: "supabase/migrations/replacement.sql",
    consumers: [],
  }]);

  assert.throws(
    () => validateApprovedSemanticReplacements(expected, actual, semanticApproval),
    /changed more than definition_path/,
  );
});

test("rejects added or removed opaque helpers", () => {
  const expected = fixtureInventory([legacyEntry]);
  const added = {
    ...legacyEntry,
    key: "app_private.e14_new_helper(uuid)",
    name: "e14_new_helper",
    definition_path: "supabase/migrations/new.sql",
  };
  const actual = fixtureInventory([legacyEntry, added]);

  assert.throws(
    () => validateApprovedSemanticReplacements(expected, actual, semanticApproval),
    /cannot authorize added or removed legacy functions/,
  );
});

test("rejects stale semantic replacement approvals", () => {
  const expected = fixtureInventory([legacyEntry]);
  const actual = fixtureInventory([legacyEntry]);

  assert.throws(
    () => validateApprovedSemanticReplacements(expected, actual, semanticApproval),
    /stale semantic replacement approval/,
  );
});
