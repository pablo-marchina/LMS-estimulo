import { redirect } from "next/navigation";

export default function CertificateTemplatesRedirect() {
  redirect("/admin/gamificacao?tipo=certificados#templates-certificado");
}
