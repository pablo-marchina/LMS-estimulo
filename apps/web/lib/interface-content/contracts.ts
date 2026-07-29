export type InterfaceContentValue = {
  text?: string;
  visible?: boolean;
  order?: number;
  [key: string]: unknown;
};

export type InterfaceContentMap = Record<string, InterfaceContentValue>;

export type AdminInterfaceContentEntry = {
  id: string;
  content_key: string;
  area: "shared" | "public" | "participant" | "admin";
  page: string;
  element_name: string;
  element_type: "text" | "navigation" | "element";
  description: string;
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
  return {
    ...entry.default_value,
    ...(entry.published_value ?? {}),
    ...(entry.draft_value ?? {}),
  };
}

export function interfaceText(content: InterfaceContentMap, key: string, fallback: string): string {
  const value = content[key]?.text;
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
