import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPublicSignupLegalDocument } from "@/lib/auth/public-signup-provisioning";

export const metadata = { title: "Política de Privacidade | Plataforma Estímulo" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams;
  const legalDocument = await getPublicSignupLegalDocument("privacy_policy", version);
  if (!legalDocument) notFound();
  const publishedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(legalDocument.published_at));

  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl gap-8 px-5 py-10 lg:px-9 lg:py-14">
      <PageHeader
        eyebrow="Documento público"
        title={legalDocument.title || "Política de Privacidade"}
        description={`Versão ${legalDocument.version_number}, publicada em ${publishedAt}.`}
      />
      <Card className="max-w-none whitespace-pre-wrap text-sm leading-7 text-ink">{legalDocument.body}</Card>
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/termos" className="text-primary hover:underline">Ver Termos de Uso</Link>
        <Link href="/cadastro" className="text-primary hover:underline">Voltar ao cadastro</Link>
      </div>
    </main>
  );
}
