import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wallet = await readFile("apps/web/app/empreendedor/conquistas/page.tsx", "utf8");
const legacy = await readFile("apps/web/app/empreendedor/credenciais/page.tsx", "utf8");
const participantUpload = await readFile("apps/web/app/api/external-credential-uploads/route.ts", "utf8");
const certificateDownload = await readFile("apps/web/app/api/certificates/[issuanceId]/download/route.ts", "utf8");
const pdf = await readFile("apps/web/lib/credentials/pdf.ts", "utf8");
const admin = await readFile("apps/web/app/admin/gamificacao/page.tsx", "utf8");
const gateway = await readFile("supabase/functions/authenticated-rpc/index.ts", "utf8");

test("achievements is the single credential wallet", () => {
  assert.match(wallet, /Conquistas e certificados/u);
  assert.match(wallet, /Certificados de jornada/u);
  assert.match(wallet, /Certificados de outros cursos/u);
  assert.match(wallet, /\/api\/external-credential-uploads/u);
  assert.match(legacy, /redirect\("\/empreendedor\/conquistas#certificados-estimulo"\)/u);
});

test("external certificate files are private and validated", () => {
  assert.match(participantUpload, /sameOrigin/u);
  assert.match(participantUpload, /validateExternalCredentialFile/u);
  assert.match(participantUpload, /supabase_storage/u);
  assert.match(wallet, /PDF ou imagem, até 8 MB/u);
});

test("platform certificates are generated as downloadable PDFs", () => {
  assert.match(certificateDownload, /Content-Type": "application\/pdf/u);
  assert.match(certificateDownload, /generateCertificatePdf/u);
  assert.match(pdf, /CERTIFICADO DE CONCLUSÃO/u);
  assert.match(pdf, /Código de validação/u);
  assert.match(pdf, /DCTDecode/u);
});

test("administrator can prepare and configure a certificate template", () => {
  assert.match(admin, /Template visual/u);
  assert.match(admin, /certificate-template-uploads/u);
  assert.match(admin, /Altura do nome/u);
  assert.match(admin, /Cor do texto/u);
});

test("credential commands are only exposed through the authenticated gateway", () => {
  assert.match(gateway, /create_external_credential_upload_intent/u);
  assert.match(gateway, /configure_certificate_version/u);
  assert.match(gateway, /ACTOR_MISMATCH/u);
});
