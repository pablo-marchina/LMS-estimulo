import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { certificateTemplateBucket, removeCredentialFile, uploadCredentialFile, validateCertificateTemplateFile } from "@/lib/storage/credential-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = z.string().uuid();

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}
function code(error: unknown) {
  const raw = error instanceof Error ? error.message : "CERTIFICATE_TEMPLATE_UPLOAD_FAILED";
  const value = raw.split(":", 1)[0]?.trim() || "CERTIFICATE_TEMPLATE_UPLOAD_FAILED";
  return /^[A-Z0-9_]+$/.test(value) ? value : "CERTIFICATE_TEMPLATE_UPLOAD_FAILED";
}
function redirectTo(request: NextRequest, organizationId: string, values: Record<string, string>) {
  const target = new URL("/admin/gamificacao", request.url);
  target.searchParams.set("organization", organizationId);
  for (const [key, value] of Object.entries(values)) target.searchParams.set(key, value);
  target.hash = "template-certificado";
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar/administracao", request.url), 303);
  const key = randomUUID();
  let organizationId = "";
  let intentId: string | null = null;
  let bucket: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
  try {
    const formData = await request.formData();
    organizationId = uuid.parse(formData.get("organization_id"));
    const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
    if (!organization?.permissions.includes("engagement.manage")) throw new Error("FORBIDDEN");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("CERTIFICATE_TEMPLATE_FILE_REQUIRED");
    validateCertificateTemplateFile(file);
    bucket = certificateTemplateBucket();
    const intent = await extendedCredentialRuntime.createTemplateIntent({ actorUserAccountId: auth.identity.user_account_id, organizationId, originalFilename: file.name, expectedContentType: file.type, storageProvider: "supabase_storage", bucket, idempotencyKey: key });
    intentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;
    const uploaded = await uploadCredentialFile({ bucket, objectKey, file, kind: "template" });
    objectCreated = uploaded.created;
    const confirmed = await extendedCredentialRuntime.confirmTemplate({ actorUserAccountId: auth.identity.user_account_id, organizationId, uploadIntentId: intentId, actualContentType: file.type, actualSizeBytes: file.size, sha256: uploaded.sha256, providerObjectVersion: uploaded.providerObjectVersion, etag: uploaded.etag, idempotencyKey: `${key}:confirm` });
    return redirectTo(request, organizationId, { template: confirmed.data.file_object_id, templateNome: confirmed.data.original_filename, templateStatus: "enviado" });
  } catch (error) {
    if (objectCreated && bucket && objectKey) await removeCredentialFile(bucket, objectKey).catch(() => undefined);
    if (organizationId) return redirectTo(request, organizationId, { templateStatus: "erro", codigo: code(error) });
    return NextResponse.json({ error: code(error) }, { status: 400 });
  }
}
