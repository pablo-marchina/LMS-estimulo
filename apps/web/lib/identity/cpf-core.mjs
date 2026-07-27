import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const CPF_DIGITS = 11;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const KEY_VERSION = 1;

export function normalizeCpf(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function checkDigit(digits, factor) {
  const total = digits.reduce((sum, digit, index) => sum + digit * (factor - index), 0);
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value) {
  const normalized = normalizeCpf(value);
  if (normalized.length !== CPF_DIGITS || /^(\d)\1{10}$/.test(normalized)) return false;
  const digits = [...normalized].map(Number);
  return checkDigit(digits.slice(0, 9), 10) === digits[9]
    && checkDigit(digits.slice(0, 10), 11) === digits[10];
}

function decodeKey(encoded, name) {
  const value = String(encoded ?? "").trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  const key = Buffer.from(value, "base64");
  if (key.length !== KEY_BYTES || key.toString("base64").replace(/=+$/u, "") !== value.replace(/=+$/u, "")) {
    throw new Error(`${name}_INVALID`);
  }
  return key;
}

export function protectCpfWithKeys(value, userAccountId, encryptionKeyBase64, lookupKeyBase64, initializationVector) {
  const normalized = normalizeCpf(value);
  if (!isValidCpf(normalized)) throw new Error("CPF_INVALID");
  const accountId = String(userAccountId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/iu.test(accountId)) throw new Error("USER_ACCOUNT_ID_INVALID");

  const encryptionKey = decodeKey(encryptionKeyBase64, "CPF_ENCRYPTION_KEY");
  const lookupKey = decodeKey(lookupKeyBase64, "CPF_LOOKUP_HMAC_KEY");
  const iv = initializationVector === undefined ? randomBytes(IV_BYTES) : Buffer.from(initializationVector);
  if (iv.length !== IV_BYTES) throw new Error("CPF_INITIALIZATION_VECTOR_INVALID");

  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
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
    initializationVector: iv.toString("base64"),
    authenticationTag: authenticationTag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function unprotectCpfWithKeys(protectedCpf, userAccountId, encryptionKeyBase64) {
  const accountId = String(userAccountId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/iu.test(accountId)) throw new Error("USER_ACCOUNT_ID_INVALID");
  if (!protectedCpf || Number(protectedCpf.keyVersion) !== KEY_VERSION) throw new Error("CPF_KEY_VERSION_INVALID");

  const encryptionKey = decodeKey(encryptionKeyBase64, "CPF_ENCRYPTION_KEY");
  const iv = Buffer.from(String(protectedCpf.initializationVector ?? ""), "base64");
  const authenticationTag = Buffer.from(String(protectedCpf.authenticationTag ?? ""), "base64");
  const ciphertext = Buffer.from(String(protectedCpf.ciphertext ?? ""), "base64");
  if (iv.length !== IV_BYTES || authenticationTag.length !== 16 || ciphertext.length === 0) throw new Error("CPF_ENCRYPTED_PAYLOAD_INVALID");

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAAD(Buffer.from(`estimulo:cpf:v${KEY_VERSION}:${accountId}`, "utf8"));
  decipher.setAuthTag(authenticationTag);
  const normalized = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  if (!isValidCpf(normalized)) throw new Error("CPF_INVALID");
  return normalized;
}