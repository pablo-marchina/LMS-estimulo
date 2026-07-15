import Link from "next/link";
import { PrintCertificateButton } from "@/components/print-certificate-button";
import { StatusPanel } from "@/components/status-panel";
import { credentialRuntime } from "@/lib/credentials/runtime";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo"
});

export default async function CertificateVerificationPage({
  params
}: {
  params: Promise<{ verificationCode: string }>;
}) {
  const { verificationCode } = await params;
  const certificate = await credentialRuntime.verifyCertificate(verificationCode);

  if (!certificate.valid) {
    const message = certificate.reason === "expired"
      ? "O certificado existiu, mas sua validade terminou."
      : certificate.reason === "revoked"
        ? "O certificado foi revogado e não deve ser usado como credencial ativa."
        : "Não foi encontrado um certificado válido para este código.";
    return <main className="certificate-page">
      <StatusPanel title="Certificado não validado" tone="warning"><p>{message}</p></StatusPanel>
      <Link className="button button--secondary no-print" href="/">Voltar ao início</Link>
    </main>;
  }

  return <main className="certificate-page">
    <article className="certificate-document" aria-labelledby="certificate-title">
      <div className="certificate-brand"><span className="brand-mark" aria-hidden="true">E</span><strong>Estímulo</strong></div>
      <p className="eyebrow">Certificado de conclusão</p>
      <h1 id="certificate-title">{certificate.certificate_name}</h1>
      <p className="certificate-intro">Certificamos que</p>
      <p className="certificate-name">{certificate.display_name}</p>
      <p>concluiu a jornada <strong>{certificate.journey_title}</strong>, conforme os requisitos pedagógicos e registros versionados da plataforma.</p>
      <dl className="certificate-details">
        <div><dt>Emissão</dt><dd>{certificate.issued_at ? dateFormatter.format(new Date(certificate.issued_at)) : "—"}</dd></div>
        <div><dt>Código de validação</dt><dd>{certificate.verification_code}</dd></div>
        {certificate.expires_at ? <div><dt>Validade</dt><dd>{dateFormatter.format(new Date(certificate.expires_at))}</dd></div> : null}
      </dl>
      <p className="certificate-validity">✓ Certificado válido</p>
    </article>
    <div className="certificate-actions"><PrintCertificateButton /><Link className="button button--secondary no-print" href="/">Voltar ao início</Link></div>
  </main>;
}
