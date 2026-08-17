import { GovernedDocumentPage } from "@/components/governed-document-page";

export const metadata = { title: "Termos de Uso | Plataforma Estímulo" };
export const dynamic = "force-dynamic";

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams;
  return <GovernedDocumentPage documentType="terms_of_use" fallbackTitle="Termos de Uso" version={version} />;
}
