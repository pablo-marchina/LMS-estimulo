import assert from "node:assert/strict";
import test from "node:test";
import { isValidPhoneBr, normalizePhoneBr, toE164Br } from "../../apps/web/lib/identity/phone-br.mjs";
import { isValidCnpj, normalizeCnpj } from "../../apps/web/lib/identity/cnpj-core.mjs";

test("normalizePhoneBr strips formatting and any leading country code", () => {
  assert.equal(normalizePhoneBr("(11) 91234-5678"), "11912345678");
  assert.equal(normalizePhoneBr("+55 11 91234-5678"), "11912345678");
  assert.equal(normalizePhoneBr("1132345678"), "1132345678");
});

test("isValidPhoneBr accepts 10-digit landline and 11-digit mobile starting with 9", () => {
  assert.equal(isValidPhoneBr("(11) 3234-5678"), true);
  assert.equal(isValidPhoneBr("(11) 91234-5678"), true);
  assert.equal(isValidPhoneBr("(11) 81234-5678"), false, "11-digit number must start with 9");
  assert.equal(isValidPhoneBr("123"), false);
  assert.equal(isValidPhoneBr(""), false);
});

test("toE164Br formats a valid number and rejects an invalid one", () => {
  assert.equal(toE164Br("(11) 91234-5678"), "+5511912345678");
  assert.throws(() => toE164Br("123"), /PHONE_INVALID/);
});

test("normalizeCnpj strips formatting", () => {
  assert.equal(normalizeCnpj("11.222.333/0001-81"), "11222333000181");
});

test("isValidCnpj validates check digits and rejects repeated-digit sequences", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11.222.333/0001-82"), false, "wrong check digit must fail");
  assert.equal(isValidCnpj("11.111.111/1111-11"), false, "all-repeated digits must fail");
  assert.equal(isValidCnpj("123"), false, "wrong length must fail");
});
