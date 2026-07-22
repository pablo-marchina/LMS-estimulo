import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PrintCertificateButton } from "@/components/print-certificate-button";
import { EmptyState } from "@/components/ui/empty-state";
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
    const message =
      certificate.reason === "expired"
        ? "O certificado existiu, mas sua validade terminou."
        : certificate.reason === "revoked"
          ? "O certificado foi revogado e não deve ser usado como credencial ativa."
          : "Não foi encontrado um certificado válido para este código.";
    return (
      <main className="grid min-h-screen place-items-center gap-6 bg-surface-muted p-6">
        <EmptyState title="Certificado não validado" tone="warning">
          {message}
        </EmptyState>
        <ButtonLink href="/" variant="secondary" className="no-print">
          Voltar ao início
        </ButtonLink>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center gap-6 bg-surface-muted p-6">
      <article className="w-full max-w-3xl rounded-b-lg border-t-8 border-primary bg-surface p-8 text-center shadow-lg sm:p-14" aria-labelledby="certificate-title">
        <div className="mb-6 inline-flex items-center gap-2 text-lg font-bold text-primary">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-white">E</span>
          Estímulo
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Certificado de conclusão</p>
        <h1 id="certificate-title" className="mt-2 text-2xl font-bold text-ink">
          {certificate.certificate_name}
        </h1>
        <p className="mt-6 text-muted">Certificamos que</p>
        <p className="my-3 text-4xl font-bold text-primary sm:text-5xl">{certificate.display_name}</p>
        <p className="mx-auto max-w-lg text-muted">
          concluiu a jornada <strong className="text-ink">{certificate.journey_title}</strong>, conforme os requisitos pedagógicos e registros
          versionados da plataforma.
        </p>
        <dl className="mt-8 flex flex-wrap justify-center gap-8">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Emissão</dt>
            <dd className="mt-1 font-semibold text-ink">{certificate.issued_at ? dateFormatter.format(new Date(certificate.issued_at)) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Código de validação</dt>
            <dd className="mt-1 font-semibold text-ink">{certificate.verification_code}</dd>
          </div>
          {certificate.expires_at ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Validade</dt>
              <dd className="mt-1 font-semibold text-ink">{dateFormatter.format(new Date(certificate.expires_at))}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-8 flex items-center justify-center gap-2 font-semibold text-success">
          <CheckCircle2 size={18} aria-hidden="true" /> Certificado válido
        </p>
      </article>
      <div className="no-print flex flex-wrap justify-center gap-3">
        <PrintCertificateButton />
        <ButtonLink href="/" variant="secondary">
          <Link href="/" className="contents">
            Voltar ao início
          </Link>
        </ButtonLink>
      </div>
    </main>
  );
}
