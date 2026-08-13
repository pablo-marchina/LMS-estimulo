import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPublicSignupLegalDocument,
  type SignupLegalDocument,
} from "@/lib/auth/public-signup-provisioning";

export async function GovernedDocumentPage({
  documentType,
  fallbackTitle,
  version,
}: {
  documentType: SignupLegalDocument["document_type"];
  fallbackTitle: string;
  version?: string;
}) {
  const legalDocument = await getPublicSignupLegalDocument(documentType, version);
  if (!legalDocument) notFound();
  const publishedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(legalDocument.published_at));

  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader
        eyebrow="Documento público"
        title={legalDocument.title || fallbackTitle}
        description={`Versão ${legalDocument.version_number}, publicada em ${publishedAt}.`}
      />
      <Card className="max-w-none whitespace-pre-wrap text-sm leading-7 text-ink">{legalDocument.body}</Card>
      <Link href="/cadastro" className="w-fit font-semibold text-primary hover:underline">Voltar ao cadastro</Link>
    </main>
  );
}
