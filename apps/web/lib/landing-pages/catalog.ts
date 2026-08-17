export const LANDING_PAGE_VERSIONS = [
  {
    value: "classic_2026_08_15",
    label: "Versão anterior (clássica)",
    description: "Landing publicada antes do redesign visual de 16 de agosto de 2026.",
  },
  {
    value: "boost_2026_08_16",
    label: "Versão atual preservada (Boost)",
    description: "Landing aprovada em 16 de agosto de 2026, preservada para publicação futura.",
  },
] as const;

export type LandingPageVersion = (typeof LANDING_PAGE_VERSIONS)[number]["value"];

export const DEFAULT_LANDING_PAGE_VERSION: LandingPageVersion = "classic_2026_08_15";

export function normalizeLandingPageVersion(value: unknown): LandingPageVersion {
  return LANDING_PAGE_VERSIONS.some((version) => version.value === value)
    ? (value as LandingPageVersion)
    : DEFAULT_LANDING_PAGE_VERSION;
}
