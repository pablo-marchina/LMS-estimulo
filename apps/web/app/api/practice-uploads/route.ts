import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { assertParticipantMutationAllowed } from "@/lib/auth/participant-context";
import { practiceRuntime } from "@/lib/practice/runtime";
import {
  practiceEvidenceBucket,
  removePracticeEvidence,
  uploadPracticeEvidence,
  validatePracticeEvidenceFile
} from "@/lib/storage/practice-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function errorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : "PRACTICE_UPLOAD_FAILED";
  const code = raw.split(":", 1)[0]?.trim() || "PRACTICE_UPLOAD_FAILED";
  return /^[A-Z0-9_]+$/.test(code) ? code : "PRACTICE_UPLOAD_FAILED";
}

function activityRedirect(request: NextRequest, step: string, journey: string, state: string, code?: string) {
  const target = new URL(`/empreendedor/jornada/${journey}`, request.url);
  target.searchParams.set("conteudo", step);
  target.searchParams.set("pratica", state);
  if (code) target.searchParams.set("codigo", code);
  target.hash = "pratica";
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return NextResponse.redirect(new URL("/entrar", request.url), 303);
  }

  let step = "";
  let journey = "";
  let submissionId: string | null = null;
  let uploadIntentId: string | null = null;
  let bucket: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
  const baseKey = randomUUID();

  try {
    await assertParticipantMutationAllowed();
    const formData = await request.formData();
    step = uuid.parse(formData.get("step_instance_id"));
    journey = uuid.parse(formData.get("journey_instance_id"));
    const suppliedKey = String(formData.get("idempotency_key") ?? "").trim();
    const idempotencyKey = suppliedKey || baseKey;
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File)) throw new Error("PRACTICE_FILE_REQUIRED");
    validatePracticeEvidenceFile(fileValue);

    bucket = practiceEvidenceBucket();
    const intent = await practiceRuntime.createUploadIntent({
      actorUserAccountId: auth.identity.user_account_id,
      stepInstanceId: step,
      originalFilename: fileValue.name,
      expectedContentType: fileValue.type,
      storageProvider: "supabase_storage",
      bucket,
      allowPublicUse: formData.get("allow_public_use") === "on",
      idempotencyKey
    });

    submissionId = intent.data.submission_id;
    uploadIntentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;

    const uploaded = await uploadPracticeEvidence({ bucket, objectKey, file: fileValue });
    objectCreated = uploaded.created;

    await practiceRuntime.confirmUpload({
      actorUserAccountId: auth.identity.user_account_id,
      submissionId,
      uploadIntentId,
      actualContentType: fileValue.type,
      actualSizeBytes: fileValue.size,
      sha256: uploaded.sha256,
      providerObjectVersion: uploaded.providerObjectVersion,
      etag: uploaded.etag,
      metadata: {
        source: "participant_web",
        originalFilename: fileValue.name,
        userAgentPresent: Boolean(request.headers.get("user-agent"))
      },
      idempotencyKey: `${idempotencyKey}:confirm`
    });

    return activityRedirect(request, step, journey, "enviada");
  } catch (error) {
    const code = errorCode(error);
    if (submissionId) {
      await practiceRuntime.abortUpload(
        auth.identity.user_account_id,
        submissionId,
        code,
        `${baseKey}:abort`
      ).catch(() => undefined);
    }
    if (objectCreated && bucket && objectKey) {
      await removePracticeEvidence(bucket, objectKey).catch(() => undefined);
    }
    if (step && journey) return activityRedirect(request, step, journey, "erro", code);
    return NextResponse.json({ error: code }, { status: code === "INTERFACE_PREVIEW_READ_ONLY" ? 403 : 400 });
  }
}
