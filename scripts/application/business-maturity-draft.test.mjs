import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile("supabase/migrations/20260720183000_business_maturity_draft.sql", "utf8");

test("business maturity reuses canonical diagnostic and segment tables", () => {
  assert.match(migration, /diagnostics\.diagnostic_definitions/u);
  assert.match(migration, /diagnostics\.diagnostic_versions/u);
  assert.match(migration, /diagnostics\.dimensions/u);
  assert.match(migration, /diagnostics\.items/u);
  assert.match(migration, /diagnostics\.item_options/u);
  assert.match(migration, /diagnostics\.segment_definitions/u);
  assert.match(migration, /diagnostics\.segment_versions/u);
  assert.doesNotMatch(migration, /create table .*maturity/iu);
});

test("business maturity remains draft, educational and fail closed", () => {
  assert.match(migration, /'activation_allowed',false/u);
  assert.match(migration, /'methodology_status','awaiting_methodology_approval'/u);
  assert.match(migration, /'credit_use','forbidden'/u);
  assert.match(migration, /'crm_policy','not_synced_until_governance_approval'/u);
  assert.match(migration, /'methodology_owner_approval'/u);
  assert.match(migration, /'fairness_and_bias_review'/u);
  assert.doesNotMatch(migration, /insert into diagnostics\.segment_assignments/iu);
});

test("business maturity has six dimensions, five options and three distinct segments", () => {
  for (const code of ["strategy", "financial_management", "sales", "digital", "operations", "continuous_improvement"]) {
    assert.match(migration, new RegExp(`'${code}'`, "u"));
  }
  for (const score of [0, 1, 2, 3, 4]) {
    assert.match(migration, new RegExp(`'score',${score}`, "u"));
  }
  for (const code of ["base", "traction", "evolution"]) {
    assert.match(migration, new RegExp(`'${code}'`, "u"));
  }
  assert.match(migration, /'minimum_score',0,'maximum_score',39/u);
  assert.match(migration, /'minimum_score',40,'maximum_score',71/u);
  assert.match(migration, /'minimum_score',72,'maximum_score',100/u);
});

test("maturity axis stays separate from the official four-archetype instrument", () => {
  assert.match(migration, /separado do diagnóstico oficial de arquétipos/u);
  assert.doesNotMatch(migration, /diagnostics\.archetype_definitions/u);
  assert.doesNotMatch(migration, /fazedor|batalhador|construtor|navegador/iu);
});
