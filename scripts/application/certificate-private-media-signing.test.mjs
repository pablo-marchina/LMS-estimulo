import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [mediaGateway, mediaEdge, issuerRoute, previewRoute] = await Promise.all([
  readFile("apps/web/lib/rpc/media-gateway.ts", "utf8"),
  readFile("supabase/functions/authenticated-media-rpc/index.ts", "utf8"),
  readFile("apps/web/app/api/admin/certificate-issuer-media/[role]/route.ts", "utf8"),
  readFile("apps/web/app/api/certificate-template-previews/[fileObjectId]/route.ts", "utf8"),
]);

test("certificate media operations are authorized by the authenticated media signer", () => {
  for (const operation of [
    "get_admin_certificate_issuer_media_download",
    "get_admin_certificate_template_preview_download",
  ]) {
    assert.ok(mediaGateway.includes(`| "${operation}"`));
    assert.ok(mediaEdge.includes(`"${operation}"`));
  }
  assert.match(mediaEdge, /createSignedUrl\(objectKey, SIGNED_URL_SECONDS\)/u);
  assert.match(mediaEdge, /signed_url: signedData\.signedUrl/u);
});

test("certificate issuer logo and signature prefer the authenticated signed URL", () => {
  assert.match(issuerRoute, /invokeMediaDescriptorGateway<Descriptor>\("get_admin_certificate_issuer_media_download"/u);
  assert.match(issuerRoute, /descriptor\.signed_url\s*\?\?/u);
  assert.match(issuerRoute, /p_organization_id: organization\.organization_id/u);
  assert.match(issuerRoute, /p_role: roleSchema\.parse/u);
});

test("certificate template previews prefer the authenticated signed URL", () => {
  assert.match(previewRoute, /invokeMediaDescriptorGateway<Descriptor>\("get_admin_certificate_template_preview_download"/u);
  assert.match(previewRoute, /descriptor\.signed_url\s*\?\?/u);
  assert.match(previewRoute, /p_organization_id: organizationId\.data/u);
  assert.match(previewRoute, /p_file_object_id: fileId\.data/u);
});
