export type InterfaceContentValue = {
  text?: string;
  title?: string;
  body?: string;
  href?: string;
  button_text?: string;
  image_url?: string;
  mobile_image_url?: string;
  image_file_object_id?: string;
  mobile_image_file_object_id?: string;
  alt?: string;
  image_position?: string;
  overlay_opacity?: number;
  max_items?: number;
  layout_variant?: string;
  tone?: string;
  visible?: boolean;
  order?: number;
  _area?: string;
  _page?: string;
  _element_name?: string;
  _element_type?: string;
  _route_pattern?: string | null;
  _placement?: string;
  _group_name?: string | null;
  [key: string]: unknown;
};

export type InterfaceContentMap = Record<string, InterfaceContentValue>;

export type AdminInterfaceContentEntry = {
  id: string;
  content_key: string;
  area: "shared" | "public" | "participant" | "admin";
  page: string;
  element_name: string;
  element_type: "text" | "textarea" | "navigation" | "button" | "link" | "image" | "notice" | "section" | "element";
  description: string;
  route_pattern: string | null;
  placement: "navigation" | "header" | "before_content" | "content" | "after_content" | "footer";
  group_name: string | null;
  editor_schema: Record<string, unknown>;
  can_delete: boolean;
  default_value: InterfaceContentValue;
  draft_value: InterfaceContentValue | null;
  published_value: InterfaceContentValue | null;
  has_pending_changes: boolean;
  updated_at: string;
  published_at: string | null;
};

export type AdminInterfaceContentWorkspace = {
  organization_id: string;
  locale: string;
  entries: AdminInterfaceContentEntry[];
};

export function resolvedInterfaceValue(entry: AdminInterfaceContentEntry): InterfaceContentValue {
  return { ...entry.default_value, ...(entry.published_value ?? {}), ...(entry.draft_value ?? {}) };
}

export function interfaceText(content: InterfaceContentMap, key: string, fallback: string): string {
  const value = content[key]?.text;
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function interfaceString(content: InterfaceContentMap, key: string, field: string, fallback = "") {
  const value = content[key]?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function interfaceVisible(content: InterfaceContentMap, key: string, fallback = true): boolean {
  const value = content[key]?.visible;
  return typeof value === "boolean" ? value : fallback;
}

export function interfaceOrder(content: InterfaceContentMap, key: string, fallback: number): number {
  const value = content[key]?.order;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function interfaceHref(content: InterfaceContentMap, key: string, fallback: string) {
  const value = content[key]?.href;
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.startsWith("/") || value.startsWith("https://") ? value : fallback;
}

export function interfaceTemplate(
  content: InterfaceContentMap,
  key: string,
  fallback: string,
  variables: Record<string, string | number>,
): string {
  return Object.entries(variables).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    interfaceText(content, key, fallback),
  );
}

function routeMatches(pattern: string | null | undefined, pathname: string) {
  if (!pattern) return false;
  if (pattern === pathname) return true;
  if (!pattern.endsWith("/*")) return false;
  const base = pattern.slice(0, -2);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function interfaceEntriesForRoute(
  content: InterfaceContentMap,
  input: { area: "admin" | "participant" | "public" | "shared"; pathname: string; placement: string },
) {
  return Object.entries(content)
    .filter(([, value]) => value._area === input.area || value._area === "shared")
    .filter(([, value]) => value._placement === input.placement)
    .filter(([, value]) => routeMatches(typeof value._route_pattern === "string" ? value._route_pattern : null, input.pathname))
    .filter(([key]) => interfaceVisible(content, key))
    .sort(([keyA], [keyB]) => interfaceOrder(content, keyA, 9999) - interfaceOrder(content, keyB, 9999))
    .map(([key, value]) => ({ key, value }));
}

export function pageHeaderCmsPrefix(pathname: string) {
  const area = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/empreendedor") ? "participant" : "public";
  const rest = pathname
    .replace(/^\/(admin|empreendedor)/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => (/^[0-9a-f-]{20,}$/i.test(segment) ? "detail" : segment.replace(/[^a-z0-9_-]+/gi, "-")))
    .join(".") || "overview";
  return `${area}.page.${rest}.header`;
}
