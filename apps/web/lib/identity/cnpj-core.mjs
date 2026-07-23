const CNPJ_DIGITS = 14;
const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCnpj(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function checkDigit(digits, weights) {
  const sum = digits.reduce((total, digit, index) => total + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value) {
  const normalized = normalizeCnpj(value);
  if (normalized.length !== CNPJ_DIGITS || /^(\d)\1{13}$/.test(normalized)) return false;
  const digits = [...normalized].map(Number);
  const firstDigit = checkDigit(digits.slice(0, 12), FIRST_WEIGHTS);
  const secondDigit = checkDigit(digits.slice(0, 13), SECOND_WEIGHTS);
  return firstDigit === digits[12] && secondDigit === digits[13];
}
