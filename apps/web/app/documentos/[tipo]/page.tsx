import { notFound } from "next/navigation";
import { GovernedDocumentPage } from "@/components/governed-document-page";

export const dynamic = "force-dynamic";

const documentKinds = {
  termos: { documentType: "terms_of_use", fallbackTitle: "Termos de Uso" },
  privacidade: { documentType: "privacy_policy", fallbackTitle: "Política de Privacidade" },
} as const;

export default async function PublicDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ tipo: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ tipo }, { version }] = await Promise.all([params, searchParams]);
  const kind = documentKinds[tipo as keyof typeof documentKinds];
  if (!kind) notFound();
  return <GovernedDocumentPage documentType={kind.documentType} fallbackTitle={kind.fallbackTitle} version={version} />;
}
