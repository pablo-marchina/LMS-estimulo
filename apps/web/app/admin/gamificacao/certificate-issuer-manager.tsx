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
  return (
    <Card className="grid gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Etapa 1 de 3</p>
        <h2 className="mt-1 text-lg font-black text-secondary">Identidade do emissor</h2>
        <p className="mt-1 text-sm text-muted">Essa identidade é reutilizada em todos os certificados e reúne os dados legais, assinatura e marca em um único lugar.</p>
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
          <FileUploadPreview name="issuer_logo_file" label="Logo do emissor" accept="image/png,image/jpeg,.png,.jpg,.jpeg" maxSizeBytes={4 * 1024 * 1024} recommendedDimensions="800 × 300 px" recommendedAspectRatio="8:3" help="PNG ou JPEG em alta resolução. A imagem será incorporada ao PDF." />
          <FileUploadPreview name="issuer_signature_file" label="Assinatura digitalizada" accept="image/png,image/jpeg,.png,.jpg,.jpeg" maxSizeBytes={4 * 1024 * 1024} recommendedDimensions="1200 × 400 px" recommendedAspectRatio="3:1" help="Use PNG transparente ou JPEG com boa legibilidade para inclusão no PDF." />
        </div>
        <PendingSubmitButton pendingLabel="Salvando emissor…" className="w-fit">Salvar identidade do emissor</PendingSubmitButton>
      </form>
    </Card>
  );
}
