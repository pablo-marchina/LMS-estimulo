export const FIRST_TOUCH_COOKIE = "estimulo_first_touch";

export type FirstTouchAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_path: string;
};

const MAX_UTM_LENGTH = 200;
const MAX_PATH_LENGTH = 500;

function clean(value: string | null, maxLength: number): string | null {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/gu, "") ?? "";
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function firstTouchFromUrl(url: URL): FirstTouchAttribution {
  return {
    utm_source: clean(url.searchParams.get("utm_source"), MAX_UTM_LENGTH),
    utm_medium: clean(url.searchParams.get("utm_medium"), MAX_UTM_LENGTH),
    utm_campaign: clean(url.searchParams.get("utm_campaign"), MAX_UTM_LENGTH),
    utm_content: clean(url.searchParams.get("utm_content"), MAX_UTM_LENGTH),
    utm_term: clean(url.searchParams.get("utm_term"), MAX_UTM_LENGTH),
    landing_path: clean(url.pathname, MAX_PATH_LENGTH) ?? "/cadastro",
  };
}

export function encodeFirstTouch(value: FirstTouchAttribution): string {
  const params = new URLSearchParams({ version: "1", landing_path: value.landing_path });
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
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
    landing_path: clean(params.get("landing_path"), MAX_PATH_LENGTH) ?? "/cadastro",
  };
}
