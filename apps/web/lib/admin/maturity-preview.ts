import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type MaturityPreviewOption = {
  id: string;
  code: string;
  label: string;
  value: { score: number; level: string };
  position: number;
};

export type MaturityPreviewDimension = {
  id: string;
  code: string;
  name: string;
  description: string;
  position: number;
  item: {
    id: string;
    code: string;
    prompt: string;
    required: boolean;
    options: MaturityPreviewOption[];
  };
};

export type MaturityDraftWorkspace = {
  definition: {
    id: string;
    code: string;
    name: string;
    purpose: string;
    status: string;
  };
  version: {
    id: string;
    version_number: number;
    status: string;
    content_hash: string;
    configuration: {
      activation_allowed: boolean;
      methodology_status: string;
      credit_use: string;
      crm_policy: string;
      publication_blockers: string[];
      purpose: string;
    };
  };
  dimensions: MaturityPreviewDimension[];
  rule: {
    definition_id: string;
    version_id: string;
    status: string;
    language: string;
    expression: Record<string, unknown>;
    input_schema: Record<string, unknown>;
    output_schema: Record<string, unknown>;
  };
  segments: Array<{
    definition_id: string;
    version_id: string;
    code: string;
    name: string;
    description: string;
    status: string;
    published_at: string | null;
  }>;
  assignment_count: number;
};

export const maturityPreviewRuntime = {
  get: (actorUserAccountId: string, organizationId: string) =>
    invokeServerRpc<MaturityDraftWorkspace>("get_business_maturity_draft", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    }),
};
