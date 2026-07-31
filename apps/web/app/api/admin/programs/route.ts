import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminProductWorkspace } from "@/lib/admin/product-management";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const dynamic = "force-dynamic";

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

async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) return null;
  return { actor: auth.identity.user_account_id, organizationId: organization.organization_id };
}

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });

  const workspace = await getAdminProductWorkspace(context.actor, context.organizationId);
  const journeys = workspace.journeys.filter((journey) => journey.status !== "retired");
  const programs = workspace.programs.map((program) => ({
    ...program,
    description: typeof (program as Record<string, unknown>).description === "string"
      ? String((program as Record<string, unknown>).description)
      : "",
    journey_count: journeys.filter((journey) => String(journey.program_id ?? "") === program.id).length,
  }));

  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const id = String(body.id ?? "").trim();
  const status = body.status === "retired" ? "retired" : "active";
  if (name.length < 2) return NextResponse.json({ error: "Informe o nome do programa." }, { status: 400 });

  const code = `${slug(name)}_${(id || randomUUID()).replaceAll("-", "").slice(0, 8)}`.slice(0, 79);

  try {
    const result = await invokeServerRpc<Record<string, unknown>>("save_admin_program", {
      p_actor_user_account_id: context.actor,
      p_organization_id: context.organizationId,
      p_payload: {
        id: id || null,
        code,
        name,
        description: String(body.description ?? "").trim() || null,
        status,
      },
      p_idempotency_key: randomUUID(),
    });
    return NextResponse.json({ program: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROGRAM_SAVE_FAILED";
    const friendly = message.includes("PROGRAM_IN_USE")
      ? "Este programa ainda possui jornadas. Mova as jornadas antes de arquivá-lo."
      : message.includes("PROGRAM_NAME_REQUIRED")
        ? "Informe o nome do programa."
        : "Não foi possível salvar o programa.";
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}
