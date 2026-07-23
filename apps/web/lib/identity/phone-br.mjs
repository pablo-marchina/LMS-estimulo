const COUNTRY_CODE = "55";

export function normalizePhoneBr(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith(COUNTRY_CODE) && digits.length > 11) {
    return digits.slice(COUNTRY_CODE.length);
  }
  return digits;
}

export function isValidPhoneBr(value) {
  const normalized = normalizePhoneBr(value);
  if (normalized.length === 10) return true;
  if (normalized.length === 11) return normalized[2] === "9";
  return false;
}

export function toE164Br(value) {
  if (!isValidPhoneBr(value)) throw new Error("PHONE_INVALID");
  return `+${COUNTRY_CODE}${normalizePhoneBr(value)}`;
}
