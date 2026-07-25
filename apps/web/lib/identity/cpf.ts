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

export function protectCpf(value: string, userAccountId: string): ProtectedCpf {
  return protectCpfWithKeys(
    value,
    userAccountId,
    process.env.CPF_ENCRYPTION_KEY ?? "",
    process.env.CPF_LOOKUP_HMAC_KEY ?? "",
  );
}

export function unprotectCpf(value: ProtectedCpf, userAccountId: string): string {
  return unprotectCpfWithKeys(
    value,
    userAccountId,
    process.env.CPF_ENCRYPTION_KEY ?? "",
  );
}