import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [mediaGateway, mediaEdge, authenticatedEdge, extensionsEdge, issuerRoute, previewRoute] = await Promise.all([
  readFile("apps/web/lib/rpc/media-gateway.ts", "utf8"),
  readFile("supabase/functions/authenticated-media-rpc/index.ts", "utf8"),
  readFile("supabase/functions/authenticated-rpc/index.ts", "utf8"),
  readFile("supabase/functions/platform-extensions-rpc/index.ts", "utf8"),
  readFile("apps/web/app/api/admin/certificate-issuer-media/[role]/route.ts", "utf8"),
  readFile("apps/web/app/api/certificate-template-previews/[fileObjectId]/route.ts", "utf8"),
]);

test("dedicated media gateway keeps its canonical five-operation scope", () => {
  assert.ok(!mediaGateway.includes("get_admin_certificate_issuer_media_download"));
  assert.ok(!mediaGateway.includes("get_admin_certificate_template_preview_download"));
  assert.ok(!mediaEdge.includes("get_admin_certificate_issuer_media_download"));
  assert.ok(!mediaEdge.includes("get_admin_certificate_template_preview_download"));
});

test("certificate issuer media is signed by the authenticated RPC gateway", () => {
  assert.match(issuerRoute, /invokeServerRpc<Descriptor>\("get_admin_certificate_issuer_media_download"/u);
  assert.match(issuerRoute, /descriptor\.signed_url\s*\?\?/u);
  assert.match(authenticatedEdge, /operation === "get_admin_certificate_issuer_media_download"/u);
  assert.match(authenticatedEdge, /createSignedUrl\(objectKey, SIGNED_URL_SECONDS\)/u);
  assert.match(authenticatedEdge, /signed_url: data\.signedUrl/u);
});

test("certificate template previews remain on extensions gateway and receive a signed URL", () => {
  assert.match(previewRoute, /extensionsRuntime\.certificateTemplatePreviewDownload/u);
  assert.match(previewRoute, /descriptor\.signed_url\s*\?\?/u);
  assert.match(extensionsEdge, /name === "get_admin_certificate_template_preview_download"/u);
  assert.match(extensionsEdge, /createSignedUrl\(objectKey, SIGNED_URL_SECONDS\)/u);
  assert.match(extensionsEdge, /signed_url: data\.signedUrl/u);
});
