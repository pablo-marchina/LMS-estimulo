import { ParticipantLibraryPage } from "@/components/participant-library-page";

export const dynamic = "force-dynamic";

export default function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ParticipantLibraryPage searchParams={searchParams} basePath="/capacitacao/biblioteca" />;
}
