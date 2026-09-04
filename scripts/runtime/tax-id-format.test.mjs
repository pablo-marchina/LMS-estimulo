import assert from "node:assert/strict";
import test from "node:test";
import { formatCnpj, formatCpf } from "../../apps/web/lib/identity/tax-id-format-core.mjs";

test("CPF mask formats exactly eleven digits", () => {
  assert.equal(formatCpf("52998224725"), "529.982.247-25");
  assert.equal(formatCpf("529.982.247-25"), "529.982.247-25");
  assert.equal(formatCpf("529982247259999"), "529.982.247-25");
});

test("CPF mask remains usable while typing", () => {
  assert.equal(formatCpf("5299"), "529.9");
  assert.equal(formatCpf("5299822"), "529.982.2");
  assert.equal(formatCpf("5299822472"), "529.982.247-2");
});

test("CNPJ mask formats exactly fourteen digits", () => {
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(formatCnpj("11.222.333/0001-81"), "11.222.333/0001-81");
  assert.equal(formatCnpj("112223330001819999"), "11.222.333/0001-81");
});

test("CNPJ mask remains usable while typing", () => {
  assert.equal(formatCnpj("112"), "11.2");
  assert.equal(formatCnpj("112223"), "11.222.3");
  assert.equal(formatCnpj("112223330"), "11.222.333/0");
  assert.equal(formatCnpj("1122233300018"), "11.222.333/0001-8");
});
