import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { assertParticipantMutationAllowed } from "@/lib/auth/participant-context";
import { triggerDeliveryGrading } from "@/lib/extensions/delivery-grading";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import {
  deliveryEvidenceBucket,
  removeDeliveryEvidence,
  uploadDeliveryEvidence,
  validateDeliveryEvidenceFile,
} from "@/lib/storage/delivery-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

function code(error: unknown) {
  const raw = error instanceof Error ? error.message : "DELIVERY_SUBMISSION_FAILED";
  const parsed = raw.split(":", 1)[0]?.trim() || "DELIVERY_SUBMISSION_FAILED";
  return /^[A-Z0-9_]+$/u.test(parsed) ? parsed : "DELIVERY_SUBMISSION_FAILED";
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = String(value ?? "").trim();
  if (!path.startsWith("/empreendedor/") || path.startsWith("//")) return "/empreendedor/perfil#materiais-enviados";
  try {
    const parsed = new URL(path, "https://local.invalid");
    return `${parsed.pathname}${parsed.hash}`;
  } catch {
    return "/empreendedor/perfil#materiais-enviados";
  }
}

function redirectTo(request: NextRequest, returnTo: string, state: "success" | "error", error?: string) {
  const [pathname, hash = ""] = returnTo.split("#", 2);
  const url = new URL(pathname || "/empreendedor/perfil", request.url);
  url.searchParams.set(state === "success" ? "sucesso" : "erro", error ?? "delivery_submit");
  if (hash) url.hash = hash;
  return NextResponse.redirect(url, 303);
}

function evidenceType(contentType: string) {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.includes("spreadsheet") || contentType === "text/csv") return "spreadsheet";
  if (contentType.includes("zip")) return "zip";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("text/") || contentType === "application/json") return "code_or_text";
  return "document";
}

async function extractSafeText(file: File) {
  const textLike = file.type.startsWith("text/") || file.type === "application/json" || file.type === "application/xml";
  if (!textLike || file.size > 1_000_000) return null;
  return (await file.text()).slice(0, 200_000);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);

  const bucket = deliveryEvidenceBucket();
  const uploadedObjects: string[] = [];
  let returnTo = "/empreendedor/perfil#materiais-enviados";
  try {
    await assertParticipantMutationAllowed();
    const formData = await request.formData();
    returnTo = safeReturnTo(formData.get("return_to"));
    const configurationId = String(formData.get("delivery_configuration_id") ?? "").trim();
    if (!/^[0-9a-f-]{36}$/iu.test(configurationId)) throw new Error("DELIVERY_CONFIGURATION_INVALID");
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length > 20) throw new Error("DELIVERY_FILE_COUNT_INVALID");

    const payloadFiles: Array<Record<string, unknown>> = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      validateDeliveryEvidenceFile(file);
      const objectKey = `${auth.identity.user_account_id}/${randomUUID()}`;
      const uploaded = await uploadDeliveryEvidence({ bucket, objectKey, file });
      uploadedObjects.push(objectKey);
      payloadFiles.push({
        storage_provider: "supabase_storage",
        bucket,
        object_key: objectKey,
        content_type: file.type,
        size_bytes: file.size,
        sha256: uploaded.sha256,
        provider_object_version: uploaded.providerObjectVersion,
        etag: uploaded.etag,
        original_filename: file.name,
        evidence_type: evidenceType(file.type),
        position: index + 1,
        extracted_content: await extractSafeText(file),
        metadata: { source: "participant_delivery", static_analysis_only: evidenceType(file.type) === "zip" || evidenceType(file.type) === "code_or_text" },
      });
    }

    const result = await extensionsRuntime.performParticipant({
      actorUserAccountId: auth.identity.user_account_id,
      action: "delivery_submit",
      payload: {
        delivery_configuration_id: configurationId,
        text_content: String(formData.get("text_content") ?? "").trim(),
        external_link: String(formData.get("external_link") ?? "").trim(),
        files: payloadFiles,
      },
      idempotencyKey: String(formData.get("idempotency_key") ?? "").trim() || randomUUID(),
    });

    const submissionId = typeof result.submission_id === "string" ? result.submission_id : null;
    if (submissionId && result.status === "processing") await triggerDeliveryGrading(submissionId).catch(() => undefined);
    return redirectTo(request, returnTo, "success");
  } catch (error) {
    await Promise.all(uploadedObjects.map((objectKey) => removeDeliveryEvidence(bucket, objectKey).catch(() => undefined)));
    return redirectTo(request, returnTo, "error", code(error));
  }
}
