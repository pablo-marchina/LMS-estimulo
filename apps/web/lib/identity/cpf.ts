import "server-only";
import { createCipheriv, createHmac, randomBytes } from "node:crypto";

const CPF_DIGITS = 11;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const KEY_VERSION = 1;

export type ProtectedCpf = {
  lookupHmac: string;
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
  keyVersion: number;
};

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function checkDigit(digits: readonly number[], factor: number): number {
  const total = digits.reduce((sum, digit, index) => sum + digit * (factor - index), 0);
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: string): boolean {
  const normalized = normalizeCpf(value);
  if (normalized.length !== CPF_DIGITS || /^(\d)\1{10}$/.test(normalized)) return false;
  const digits = [...normalized].map(Number);
  return checkDigit(digits.slice(0, 9), 10) === digits[9]
    && checkDigit(digits.slice(0, 10), 11) === digits[10];
}

function environmentKey(name: "CPF_ENCRYPTION_KEY" | "CPF_LOOKUP_HMAC_KEY"): Buffer {
  const encoded = process.env[name]?.trim();
  if (!encoded) throw new Error(`${name}_REQUIRED`);
  let key: Buffer;
  try {
    key = Buffer.from(encoded, "base64");
  } catch {
    throw new Error(`${name}_INVALID`);
  }
  if (key.length !== KEY_BYTES || key.toString("base64").replace(/=+$/u, "") !== encoded.replace(/=+$/u, "")) {
    throw new Error(`${name}_INVALID`);
  }
  return key;
}

export function protectCpf(value: string, userAccountId: string): ProtectedCpf {
  const normalized = normalizeCpf(value);
  if (!isValidCpf(normalized)) throw new Error("CPF_INVALID");
  const accountId = userAccountId.trim();
  if (!/^[0-9a-f-]{36}$/iu.test(accountId)) throw new Error("USER_ACCOUNT_ID_INVALID");

  const encryptionKey = environmentKey("CPF_ENCRYPTION_KEY");
  const lookupKey = environmentKey("CPF_LOOKUP_HMAC_KEY");
  const initializationVector = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, initializationVector);
  cipher.setAAD(Buffer.from(`estimulo:cpf:v${KEY_VERSION}:${accountId}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();
  const lookupHmac = createHmac("sha256", lookupKey)
    .update(`estimulo:cpf:v${KEY_VERSION}:`)
    .update(normalized)
    .digest("hex");

  return {
    lookupHmac,
    ciphertext: ciphertext.toString("base64"),
    initializationVector: initializationVector.toString("base64"),
    authenticationTag: authenticationTag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}
