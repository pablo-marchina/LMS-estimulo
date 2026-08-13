import { CheckCircle2 } from "lucide-react";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import { saveCertificateIssuerAction } from "./actions";

export async function CertificateIssuerManager() {
  const { auth, organization } = await requireAdminExtensionsWorkspace();
  const issuer = await extendedCredentialRuntime.getIssuer(auth.identity.user_account_id, organization.organization_id);
  const hasLogo = Boolean(issuer.logo_file_object_id);
  const hasSignature = Boolean(issuer.signature_file_object_id);

  return (
    <Card className="grid gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Etapa 1 de 3</p>
        <h2 className="mt-1 text-lg font-black text-secondary">Identidade do emissor</h2>
        <p className="mt-1 text-sm text-muted">Essa identidade é reutilizada em todos os certificados e reúne os dados legais, assinatura e marca em um único lugar.</p>
        {(hasLogo || hasSignature) ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
            <CheckCircle2 size={14} aria-hidden="true" />
            Identidade salva · {hasLogo ? "logo" : "sem logo"} · {hasSignature ? "assinatura" : "sem assinatura"}
          </p>
        ) : null}
      </div>
      <form action={saveCertificateIssuerAction} encType="multipart/form-data" className="grid gap-4">
        <input type="hidden" name="current_logo_file_object_id" value={issuer.logo_file_object_id ?? ""} />
        <input type="hidden" name="current_signature_file_object_id" value={issuer.signature_file_object_id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Nome do emissor<Input name="issuer_name" required defaultValue={issuer.name || "Estímulo"} /></Label>
          <Label>CNPJ<Input name="issuer_cnpj" defaultValue={issuer.cnpj ?? ""} placeholder="00.000.000/0000-00" /></Label>
          <Label>Representante legal<Input name="representative_name" defaultValue={issuer.representative_name ?? ""} /></Label>
          <Label>Cargo do representante<Input name="representative_role" defaultValue={issuer.representative_role ?? ""} /></Label>
          <Label>Cor principal<Input name="primary_color" type="color" defaultValue={issuer.primary_color || "#13115B"} /></Label>
          <Label>Cor secundária<Input name="secondary_color" type="color" defaultValue={issuer.secondary_color || "#54D68C"} /></Label>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FileUploadPreview
            name="issuer_logo_file"
            label="Logo do emissor"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            maxSizeBytes={4 * 1024 * 1024}
            recommendedDimensions="800 × 300 px"
            recommendedAspectRatio="8:3"
            existingPreviewUrl={hasLogo ? "/api/admin/certificate-issuer-media/logo" : null}
            existingPreviewAlt="Logo atual do emissor"
            help="PNG, JPEG ou WebP em alta resolução. Escolha outro arquivo apenas para substituir o atual."
          />
          <FileUploadPreview
            name="issuer_signature_file"
            label="Assinatura digitalizada"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            maxSizeBytes={4 * 1024 * 1024}
            recommendedDimensions="1200 × 400 px"
            recommendedAspectRatio="3:1"
            existingPreviewUrl={hasSignature ? "/api/admin/certificate-issuer-media/signature" : null}
            existingPreviewAlt="Assinatura atual do emissor"
            help="Use uma imagem nítida, de preferência com fundo transparente. Escolha outro arquivo apenas para substituir a atual."
          />
        </div>
        <PendingSubmitButton pendingLabel="Salvando emissor…" className="w-fit">Salvar identidade do emissor</PendingSubmitButton>
      </form>
    </Card>
  );
}
