import "server-only";
import {
  isValidCpf,
  normalizeCpf,
  protectCpfWithKeys,
  unprotectCpfWithKeys,
  type ProtectedCpf,
} from "./cpf-core.mjs";

export { isValidCpf, normalizeCpf };
export type { ProtectedCpf };

const CPF_PROBE_VALUE = "52998224725";
const CPF_PROBE_ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";

function protectionKeys() {
  return {
    encryptionKey: process.env.CPF_ENCRYPTION_KEY ?? "",
    lookupKey: process.env.CPF_LOOKUP_HMAC_KEY ?? "",
  };
}

export function protectCpf(value: string, userAccountId: string): ProtectedCpf {
  const keys = protectionKeys();
  return protectCpfWithKeys(value, userAccountId, keys.encryptionKey, keys.lookupKey);
}

export function unprotectCpf(value: ProtectedCpf, userAccountId: string): string {
  return unprotectCpfWithKeys(value, userAccountId, protectionKeys().encryptionKey);
}

export function assertCpfProtectionReady(): void {
  const keys = protectionKeys();
  const protectedValue = protectCpfWithKeys(
    CPF_PROBE_VALUE,
    CPF_PROBE_ACCOUNT_ID,
    keys.encryptionKey,
    keys.lookupKey,
    Buffer.alloc(12, 7),
  );
  const recovered = unprotectCpfWithKeys(protectedValue, CPF_PROBE_ACCOUNT_ID, keys.encryptionKey);
  if (recovered !== CPF_PROBE_VALUE || protectedValue.lookupHmac.length !== 64) {
    throw new Error("CPF_PROTECTION_SELF_TEST_FAILED");
  }
}
