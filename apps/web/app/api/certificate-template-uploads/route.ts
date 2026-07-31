import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { certificateTemplateBucket, removeCredentialFile, uploadCredentialFile, validateCertificateTemplateFile } from "@/lib/storage/credential-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = z.string().uuid();
const scopeSchema = z.enum(["global", "program", "journey"]);

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
function safeReturnTo(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value.trim() : "";
  return path === "/admin/certificados" ? path : "/admin/gamificacao";
}
function redirectTo(request: NextRequest, pathname: string, organizationId: string, values: Record<string, string>) {
  const target = new URL(pathname, request.url);
  target.searchParams.set("organization", organizationId);
  if (pathname === "/admin/gamificacao") target.searchParams.set("tipo", "certificados");
  for (const [key, value] of Object.entries(values)) target.searchParams.set(key, value);
  if (pathname === "/admin/gamificacao") target.hash = "template-certificado";
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar/administracao", request.url), 303);
  const key = randomUUID();
  let organizationId = "";
  let returnTo = "/admin/gamificacao";
  let intentId: string | null = null;
  let bucket: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
  try {
    const formData = await request.formData();
    returnTo = safeReturnTo(formData.get("return_to"));
    organizationId = uuid.parse(formData.get("organization_id"));
    const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
    if (!organization?.permissions.includes("engagement.manage")) throw new Error("FORBIDDEN");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("CERTIFICATE_TEMPLATE_FILE_REQUIRED");
    validateCertificateTemplateFile(file);

    const rawScope = formData.get("scope_type");
    const scopeType = typeof rawScope === "string" && rawScope ? scopeSchema.parse(rawScope) : null;
    const rawScopeId = typeof formData.get("scope_id") === "string" ? String(formData.get("scope_id")).trim() : "";
    const scopeId = scopeType === "global" || !scopeType ? "" : uuid.parse(rawScopeId);
    const templateName = typeof formData.get("name") === "string" && String(formData.get("name")).trim()
      ? String(formData.get("name")).trim()
      : file.name;

    bucket = certificateTemplateBucket();
    const intent = await extendedCredentialRuntime.createTemplateIntent({ actorUserAccountId: auth.identity.user_account_id, organizationId, originalFilename: file.name, expectedContentType: file.type, storageProvider: "supabase_storage", bucket, idempotencyKey: key });
    intentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;
    const uploaded = await uploadCredentialFile({ bucket, objectKey, file, kind: "template" });
    objectCreated = uploaded.created;
    const confirmed = await extendedCredentialRuntime.confirmTemplate({ actorUserAccountId: auth.identity.user_account_id, organizationId, uploadIntentId: intentId, actualContentType: file.type, actualSizeBytes: file.size, sha256: uploaded.sha256, providerObjectVersion: uploaded.providerObjectVersion, etag: uploaded.etag, idempotencyKey: `${key}:confirm` });

    if (scopeType) {
      await extensionsRuntime.saveAdmin({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId,
        resourceType: "certificate_template_register",
        idempotencyKey: `${key}:register`,
        payload: {
          file_object_id: confirmed.data.file_object_id,
          name: templateName,
          content_type: file.type,
          scope_type: scopeType,
          scope_id: scopeId,
          metadata: { original_filename: file.name, size_bytes: file.size },
        },
      });
    }

    return redirectTo(request, returnTo, organizationId, { template: confirmed.data.file_object_id, templateNome: confirmed.data.original_filename, templateStatus: "enviado" });
  } catch (error) {
    if (objectCreated && bucket && objectKey) await removeCredentialFile(bucket, objectKey).catch(() => undefined);
    if (organizationId) return redirectTo(request, returnTo, organizationId, { templateStatus: "erro", codigo: code(error) });
    return NextResponse.json({ error: code(error) }, { status: 400 });
  }
}
