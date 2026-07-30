import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { externalCredentialBucket, removeCredentialFile, uploadCredentialFile, validateExternalCredentialFile } from "@/lib/storage/credential-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

function errorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "EXTERNAL_CREDENTIAL_UPLOAD_FAILED";
  const code = raw.split(":", 1)[0]?.trim() || "EXTERNAL_CREDENTIAL_UPLOAD_FAILED";
  return /^[A-Z0-9_]+$/.test(code) ? code : "EXTERNAL_CREDENTIAL_UPLOAD_FAILED";
}

function redirectTo(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/empreendedor/conquistas", request.url);
  target.hash = "certificados-externos";
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return NextResponse.redirect(target, 303);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForProjection(actorUserAccountId: string, externalCredentialId: string) {
  const delays = [0, 100, 250, 500];
  for (const delay of delays) {
    if (delay) await sleep(delay);
    const projection = await extendedCredentialRuntime.listExternal(actorUserAccountId);
    if (projection.items.some((item) => item.id === externalCredentialId)) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await requireParticipantContext();

  const key = randomUUID();
  let intentId: string | null = null;
  let bucket: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
  let credentialConfirmed = false;

  try {
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const issuerCode = String(formData.get("issuer_code") ?? "").trim();
    const otherIssuer = String(formData.get("issuer_other") ?? "").trim();
    const issuedOn = String(formData.get("issued_on") ?? "").trim() || null;
    const expiresOn = String(formData.get("expires_on") ?? "").trim() || null;
    const verificationUrl = String(formData.get("verification_url") ?? "").trim() || null;
    const file = formData.get("file");

    if (!issuerCode) throw new Error("EXTERNAL_CREDENTIAL_ISSUER_REQUIRED");
    const issuerCatalog = await extendedCredentialRuntime.listIssuers(auth.identity.user_account_id);
    const selectedIssuer = issuerCatalog.items.find((issuer) => issuer.code === issuerCode);
    if (!selectedIssuer) throw new Error("EXTERNAL_CREDENTIAL_ISSUER_INVALID");
    const issuer = issuerCode === "other" ? otherIssuer : selectedIssuer.name;
    if (issuerCode === "other" && issuer.length < 2) throw new Error("EXTERNAL_CREDENTIAL_OTHER_ISSUER_REQUIRED");

    if (!(file instanceof File)) throw new Error("EXTERNAL_CREDENTIAL_FILE_REQUIRED");
    validateExternalCredentialFile(file);
    bucket = externalCredentialBucket();
    const intent = await extendedCredentialRuntime.createExternalIntent({ actorUserAccountId: auth.identity.user_account_id, originalFilename: file.name, expectedContentType: file.type, storageProvider: "supabase_storage", bucket, idempotencyKey: key });
    intentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;
    const uploaded = await uploadCredentialFile({ bucket, objectKey, file, kind: "external" });
    objectCreated = uploaded.created;
    const confirmation = await extendedCredentialRuntime.confirmExternal({
      actorUserAccountId: auth.identity.user_account_id,
      uploadIntentId: intentId,
      title,
      issuer,
      issuedOn,
      expiresOn,
      verificationUrl,
      actualContentType: file.type,
      actualSizeBytes: file.size,
      sha256: uploaded.sha256,
      providerObjectVersion: uploaded.providerObjectVersion,
      etag: uploaded.etag,
      idempotencyKey: `${key}:confirm`,
    });
    credentialConfirmed = true;

    const projected = await waitForProjection(auth.identity.user_account_id, confirmation.data.external_credential_id);
    if (!projected) {
      console.error("EXTERNAL_CREDENTIAL_PROJECTION_DELAYED", {
        actorUserAccountId: auth.identity.user_account_id,
        externalCredentialId: confirmation.data.external_credential_id,
      });
      return redirectTo(request, { certificadoExterno: "enviado", aviso: "atualizando" });
    }

    return redirectTo(request, { certificadoExterno: "enviado" });
  } catch (error) {
    const code = errorCode(error);
    if (!credentialConfirmed) {
      if (intentId) await extendedCredentialRuntime.abortExternal(auth.identity.user_account_id, intentId, code, `${key}:abort`).catch(() => undefined);
      if (objectCreated && bucket && objectKey) await removeCredentialFile(bucket, objectKey).catch(() => undefined);
    }
    return redirectTo(request, { certificadoExterno: "erro", codigo: code });
  }
}
