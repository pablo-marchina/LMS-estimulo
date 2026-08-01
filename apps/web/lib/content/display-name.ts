const machineIdentifier = /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/iu;

export function displayContentName(value: string | null | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (!machineIdentifier.test(candidate)) return candidate;

  const normalized = candidate
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

  return normalized.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
}
