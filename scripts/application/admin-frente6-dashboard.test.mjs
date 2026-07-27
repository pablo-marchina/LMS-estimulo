import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = await readFile("apps/web/app/admin/page.tsx", "utf8");
const operation = await readFile("apps/web/app/admin/operacao/page.tsx", "utf8");
const shell = await readFile("apps/web/components/admin-shell.tsx", "utf8");

test("admin root is a task-oriented overview", () => {
  assert.match(dashboard, /Visão geral/u);
  assert.match(dashboard, /Identidades pendentes/u);
  assert.match(dashboard, /Práticas para revisar/u);
  assert.match(dashboard, /\/admin\/operacao/u);
});

test("operation remains available without a raw JSON evidence dump", () => {
  assert.match(operation, /Jornadas e evidências/u);
  assert.match(operation, /Evidência selecionada/u);
  assert.doesNotMatch(operation, /<pre/u);
  assert.doesNotMatch(operation, /JSON\.stringify/u);
});

test("admin navigation separates overview and operation", () => {
  assert.match(shell, /Visão geral/u);
  assert.match(shell, /\/admin\/operacao/u);
  assert.match(shell, /label:\s*"Operação"/u);
});
