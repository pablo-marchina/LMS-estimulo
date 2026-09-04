export type PublicApplicationOriginInput = {
  environment?: string;
  requestOrigin?: string;
  appUrl?: string;
  siteUrl?: string;
  vercelEnv?: string;
  vercelBranchUrl?: string;
  vercelUrl?: string;
  nextPublicVercelUrl?: string;
  port?: string;
};

export function resolvePublicApplicationOrigin(input?: PublicApplicationOriginInput): string;
export function resolveParticipantApplicationOrigin(input?: PublicApplicationOriginInput): string;
