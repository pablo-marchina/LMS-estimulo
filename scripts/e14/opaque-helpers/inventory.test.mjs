import test from "node:test";
import assert from "node:assert/strict";
import { buildOpaqueInventory, parseE14Functions } from "./inventory.mjs";

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
