import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

export const dynamic = "force-dynamic";

type AuthorizedContext = {
  actor: string;
  organizationId: string;
};

type AuthorizationResult =
  | { ok: true; context: AuthorizedContext }
  | { ok: false; status: 401 | 403; message: string };

type ProgramFailure = {
  status: number;
  code: string;
  message: string;
};

function slug(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 54);
  return /^[a-z]/.test(normalized) ? normalized : `programa_${normalized || "novo"}`;
}

async function authorize(): Promise<AuthorizationResult> {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return { ok: false, status: 401, message: "Sua sessão expirou. Entre novamente para continuar." };
  }
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) {
    return { ok: false, status: 403, message: "Você não possui permissão para alterar programas." };
  }
  return {
    ok: true,
    context: { actor: auth.identity.user_account_id, organizationId: organization.organization_id },
  };
}

function programFailure(error: unknown): ProgramFailure {
  if (!(error instanceof ServerRpcError)) {
    return { status: 500, code: "PROGRAM_SAVE_FAILED", message: "Não foi possível salvar o programa." };
  }

  const code = error.code;
  if (["AUTHENTICATED_SESSION_REQUIRED", "VERIFIED_SESSION_REQUIRED"].includes(code)) {
    return { status: 401, code, message: "Sua sessão expirou. Entre novamente para salvar o programa." };
  }
  if (["ACTOR_MISMATCH", "42501"].includes(code)) {
    return { status: 403, code, message: "Você não possui permissão para alterar programas." };
  }
  if (code === "INTERFACE_PREVIEW_WRITE_BLOCKED") {
    return { status: 409, code, message: "A pré-visualização é somente leitura. Saia da prévia para alterar programas." };
  }
  if (code === "23503") {
    return { status: 409, code, message: "Este programa ainda possui jornadas. Mova as jornadas antes de arquivá-lo." };
  }
  if (code === "23505") {
    return { status: 409, code, message: "Já existe um programa com esta identificação. Atualize a lista e tente novamente." };
  }
  if (["22023", "23502", "23514"].includes(code)) {
    return { status: 400, code, message: "Os dados do programa são inválidos. Revise o nome e tente novamente." };
  }
  if (code === "RATE_LIMITED") {
    return { status: 429, code, message: "Muitas alterações foram enviadas em sequência. Aguarde um instante e tente novamente." };
  }
  if (code === "RPC_GATEWAY_TIMEOUT") {
    return { status: 504, code, message: "O serviço demorou para responder. Tente salvar novamente." };
  }
  if (["RPC_GATEWAY_UNAVAILABLE", "RPC_GATEWAY_OVERLOADED", "RPC_GATEWAY_QUEUE_TIMEOUT", "RPC_GATEWAY_INVALID_RESPONSE"].includes(code)) {
    return { status: 503, code, message: "O serviço de programas está temporariamente indisponível. Tente novamente." };
  }
  return { status: 500, code, message: "Não foi possível salvar o programa." };
}

function jsonResponse(body: Record<string, unknown>, status: number, requestId: string) {
  return NextResponse.json(body, { status, headers: { "x-request-id": requestId } });
}

export async function GET() {
  const authorization = await authorize();
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  const context = authorization.context;

  const workspace = await getAdminProductWorkspace(context.actor, context.organizationId);
  const journeys = workspace.journeys.filter((journey) => journey.status !== "retired");
  const programs = workspace.programs.filter((program) => program.status !== "retired").map((program) => ({
    id: program.id,
    name: program.name,
    status: program.status,
    journey_count: journeys.filter((journey) => String(journey.program_id ?? "") === program.id).length,
  }));
  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
  const authorization = await authorize();
  if (!authorization.ok) {
    return jsonResponse({ error: authorization.message, code: authorization.status === 401 ? "AUTHENTICATED_SESSION_REQUIRED" : "FORBIDDEN", request_id: requestId }, authorization.status, requestId);
  }
  const context = authorization.context;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const id = String(body.id ?? "").trim();
  const status = body.status === "retired" ? "retired" : "active";
  if (name.length < 2) {
    return jsonResponse({ error: "Informe o nome do programa.", code: "PROGRAM_NAME_REQUIRED", request_id: requestId }, 400, requestId);
  }

  const code = `${slug(name)}_${(id || randomUUID()).replaceAll("-", "").slice(0, 8)}`.slice(0, 79);

  try {
    const result = await invokeServerRpc<Record<string, unknown>>("save_admin_product_resource", {
      p_actor_user_account_id: context.actor,
      p_organization_id: context.organizationId,
      p_resource_type: "program",
      p_payload: { id: id || null, code, name, status },
      p_idempotency_key: randomUUID(),
    });
    return jsonResponse({ program: result, request_id: requestId }, 200, requestId);
  } catch (error) {
    const failure = programFailure(error);
    console.error(JSON.stringify({
      level: "error",
      event: "admin_program_save_failed",
      component: "admin_programs_api",
      request_id: requestId,
      code: failure.code,
      status: failure.status,
      error_name: error instanceof Error ? error.name : "unknown",
    }));
    return jsonResponse({ error: failure.message, code: failure.code, request_id: requestId }, failure.status, requestId);
  }
}