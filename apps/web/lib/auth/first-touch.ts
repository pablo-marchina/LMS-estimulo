export const FIRST_TOUCH_COOKIE = "estimulo_first_touch";

export type FirstTouchAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_path: string;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const MAX_UTM_LENGTH = 200;
const MAX_PATH_LENGTH = 500;

function clean(value: string | null, maxLength: number): string | null {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/gu, "") ?? "";
  return normalized ? normalized.slice(0, maxLength) : null;
}

function landingPath(value: string | null): string {
  const normalized = clean(value, MAX_PATH_LENGTH);
  return normalized?.startsWith("/") ? normalized : "/cadastro";
}

function stringProperty(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === "string" ? value[key] : null;
}

export function hasUtmParameters(url: URL): boolean {
  return UTM_KEYS.some((key) => Boolean(clean(url.searchParams.get(key), MAX_UTM_LENGTH)));
}

export function firstTouchFromUrl(url: URL): FirstTouchAttribution {
  return {
    utm_source: clean(url.searchParams.get("utm_source"), MAX_UTM_LENGTH),
    utm_medium: clean(url.searchParams.get("utm_medium"), MAX_UTM_LENGTH),
    utm_campaign: clean(url.searchParams.get("utm_campaign"), MAX_UTM_LENGTH),
    utm_content: clean(url.searchParams.get("utm_content"), MAX_UTM_LENGTH),
    utm_term: clean(url.searchParams.get("utm_term"), MAX_UTM_LENGTH),
    landing_path: landingPath(url.pathname),
  };
}

export function firstTouchFromUnknown(value: unknown): FirstTouchAttribution | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    utm_source: clean(stringProperty(record, "utm_source"), MAX_UTM_LENGTH),
    utm_medium: clean(stringProperty(record, "utm_medium"), MAX_UTM_LENGTH),
    utm_campaign: clean(stringProperty(record, "utm_campaign"), MAX_UTM_LENGTH),
    utm_content: clean(stringProperty(record, "utm_content"), MAX_UTM_LENGTH),
    utm_term: clean(stringProperty(record, "utm_term"), MAX_UTM_LENGTH),
    landing_path: landingPath(stringProperty(record, "landing_path")),
  };
}

export function encodeFirstTouch(value: FirstTouchAttribution): string {
  const params = new URLSearchParams({ version: "1", landing_path: landingPath(value.landing_path) });
  for (const key of UTM_KEYS) {
    if (value[key]) params.set(key, value[key]);
  }
  return params.toString();
}

export function decodeFirstTouch(value: string | undefined): FirstTouchAttribution | null {
  if (!value) return null;
  const params = new URLSearchParams(value);
  if (params.get("version") !== "1") return null;
  return {
    utm_source: clean(params.get("utm_source"), MAX_UTM_LENGTH),
    utm_medium: clean(params.get("utm_medium"), MAX_UTM_LENGTH),
    utm_campaign: clean(params.get("utm_campaign"), MAX_UTM_LENGTH),
    utm_content: clean(params.get("utm_content"), MAX_UTM_LENGTH),
    utm_term: clean(params.get("utm_term"), MAX_UTM_LENGTH),
    landing_path: landingPath(params.get("landing_path")),
  };
}
