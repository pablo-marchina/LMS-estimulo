export type ProtectedCpf = {
  lookupHmac: string;
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
  keyVersion: number;
};
export function normalizeCpf(value: string): string;
export function isValidCpf(value: string): boolean;
export function protectCpfWithKeys(
  value: string,
  userAccountId: string,
  encryptionKeyBase64: string,
  lookupKeyBase64: string,
  initializationVector?: Uint8Array,
): ProtectedCpf;
