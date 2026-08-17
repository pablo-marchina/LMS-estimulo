import { GovernedDocumentPage } from "@/components/governed-document-page";

export const metadata = { title: "Política de Privacidade | Plataforma Estímulo" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams;
  return <GovernedDocumentPage documentType="privacy_policy" fallbackTitle="Política de Privacidade" version={version} />;
}
