import { ParticipantLibraryContentPage } from "@/components/participant-library-content-page";

export const dynamic = "force-dynamic";

export default function LibraryContentPage({ params }: { params: Promise<{ slug: string }> }) {
  return <ParticipantLibraryContentPage params={params} basePath="/capacitacao/biblioteca" />;
}
