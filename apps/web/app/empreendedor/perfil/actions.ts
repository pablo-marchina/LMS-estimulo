"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

const objectiveSchema = z.string().trim().min(5).max(500);

function objectiveErrorPath(error: unknown) {
  if (error instanceof ServerRpcError && /INVALID_OBJECTIVE|22023/u.test(`${error.code}:${error.message}`)) {
    return "/empreendedor/perfil?erro=objetivo_invalido";
  }
  return "/empreendedor/perfil?erro=objetivo_indisponivel";
}

function diagnosticErrorPath(error: unknown) {
  if (error instanceof ServerRpcError && /DIAGNOSTIC_NOT_AVAILABLE|not_configured/u.test(`${error.code}:${error.message}`)) {
    return "/empreendedor/perfil?erro=diagnostico_nao_configurado";
  }
  return "/empreendedor/perfil?erro=diagnostico_indisponivel";
}

export async function saveApplicationObjectiveAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const parsed = objectiveSchema.safeParse(formData.get("application_objective"));
  if (!parsed.success) redirect("/empreendedor/perfil?erro=objetivo_invalido");

  let destination = "/empreendedor/perfil?sucesso=objetivo_salvo";
  try {
    await invokeServerRpc("set_participant_application_objective", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_objective: parsed.data,
      p_idempotency_key: randomUUID(),
    });
  } catch (error) {
    destination = objectiveErrorPath(error);
  }
  redirect(destination);
}

export async function startProfileDiagnosticAction() {
  const auth = await requireParticipantContext();
  let destination = "/empreendedor/perfil?erro=diagnostico_indisponivel";

  try {
    const entry = await participantDiagnosticRuntime.resolveEntry(auth.identity.user_account_id);

    if (entry.status === "completed" || entry.status === "in_progress") {
      destination = entry.next_path;
    } else if (entry.status === "journey_required") {
      destination = "/empreendedor/jornadas?aviso=diagnostico_requer_jornada";
    } else if (entry.status === "not_configured") {
      destination = "/empreendedor/perfil?erro=diagnostico_nao_configurado";
    } else if (entry.status === "available" && entry.journey_instance_id && entry.diagnostic_version_id) {
      if (entry.journey_status === "available") {
        await journeyRuntime.startJourney(
          auth.identity.user_account_id,
          entry.journey_instance_id,
          entry.journey_aggregate_version ?? 0,
          randomUUID(),
        );
      }
      await journeyRuntime.startDiagnostic(
        auth.identity.user_account_id,
        entry.journey_instance_id,
        entry.diagnostic_version_id,
        randomUUID(),
      );
      destination = entry.next_path;
    }
  } catch (error) {
    destination = diagnosticErrorPath(error);
  }

  redirect(destination);
}
