import { notFound, redirect } from "next/navigation";
import type { ParticipantActivityQuery } from "@/components/participant-activity-workspace";

type LegacyActivityQuery = ParticipantActivityQuery & {
  journey?: string;
};

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ stepInstanceId: string }>;
  searchParams: Promise<LegacyActivityQuery>;
}) {
  const [{ stepInstanceId }, query] = await Promise.all([params, searchParams]);
  const journey = query.journey;
  if (!journey) notFound();

  const target = new URLSearchParams({ conteudo: stepInstanceId });
  for (const key of ["comentario", "pratica", "codigo", "avaliacao", "utilidade", "conclusao"] as const) {
    const value = query[key];
    if (value) target.set(key, value);
  }

  redirect(`/empreendedor/jornada/${journey}?${target.toString()}#aula`);
}
