import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPublicSignupLegalDocument } from "@/lib/auth/public-signup-provisioning";

export const metadata = { title: "Termos de Uso | Plataforma Estímulo" };
export const dynamic = "force-dynamic";

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams;
  const legalDocument = await getPublicSignupLegalDocument("terms_of_use", version);
  if (!legalDocument) notFound();
  const publishedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(legalDocument.published_at));

  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader
        eyebrow="Documento público"
        title={legalDocument.title || "Termos de Uso"}
        description={`Versão ${legalDocument.version_number}, publicada em ${publishedAt}.`}
      />
      <Card className="max-w-none whitespace-pre-wrap text-sm leading-7 text-ink">{legalDocument.body}</Card>
      <Link href="/cadastro" className="w-fit font-semibold text-primary hover:underline">Voltar ao cadastro</Link>
    </main>
  );
}
