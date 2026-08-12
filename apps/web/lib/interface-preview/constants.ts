export const INTERFACE_PREVIEW_COOKIE = "estimulo_interface_preview_participant";
export const INTERFACE_PREVIEW_REQUEST_HEADER = "x-estimulo-interface-preview";
export const INTERFACE_PREVIEW_PARTICIPANT_HEADER = "x-estimulo-preview-participant";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const participantPreviewRoutes = [
  "/empreendedor",
  "/empreendedor/jornadas",
  "/empreendedor/biblioteca",
  "/empreendedor/entregas",
  "/empreendedor/engajamento",
  "/empreendedor/recompensas",
  "/empreendedor/conquistas",
  "/empreendedor/credenciais",
  "/empreendedor/b2b",
  "/empreendedor/perfil",
  "/empreendedor/diagnostico",
  "/empreendedor/resultado",
] as const;

const participantPreviewRouteSet = new Set<string>(participantPreviewRoutes);

export type InterfacePreviewIdentity = {
  organizationId: string;
  participantUserAccountId: string;
};

export function serializeInterfacePreviewIdentity(value: InterfacePreviewIdentity): string {
  return `${value.organizationId}.${value.participantUserAccountId}`;
}

export function parseInterfacePreviewIdentity(raw: string | null | undefined): InterfacePreviewIdentity | null {
  if (!raw) return null;
  const [organizationId, participantUserAccountId, extra] = raw.split(".");
  if (extra || !uuidPattern.test(organizationId ?? "") || !uuidPattern.test(participantUserAccountId ?? "")) return null;
  return { organizationId, participantUserAccountId };
}

export function safeParticipantPreviewRoute(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/empreendedor";
  const url = new URL(raw, "https://preview.estimulo.local");
  return participantPreviewRouteSet.has(url.pathname) ? url.pathname : "/empreendedor";
}
