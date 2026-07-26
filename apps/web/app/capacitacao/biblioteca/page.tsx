import { BookOpen } from "lucide-react";
import { LibraryFilters } from "@/components/library-filters";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";
import { LibraryGrid } from "./library-grid";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const data = await libraryRuntime.list(auth.identity.user_account_id);
  const topics = [...new Set(data.items.flatMap((item) => item.topics))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const selectedTopic = typeof query.tema === "string" ? query.tema : "";
  const selectedFormat = typeof query.formato === "string" ? query.formato : "";
  const selectedLevel = typeof query.nivel === "string" ? query.nivel : "";
  const search = typeof query.q === "string" ? query.q.trim().toLocaleLowerCase("pt-BR") : "";
  const filtered = data.items.filter((item) => {
    if (selectedTopic && !item.topics.includes(selectedTopic)) return false;
    if (selectedFormat && item.content_format !== selectedFormat) return false;
    if (selectedLevel && item.level !== selectedLevel) return false;
    if (search && ![item.title, item.summary, ...item.topics].join(" ").toLocaleLowerCase("pt-BR").includes(search)) return false;
    return true;
  });

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Conteúdo complementar" title="Biblioteca" description="Artigos, arquivos, links e materiais para consultar no seu ritmo." />
      <LibraryFilters topics={topics} selectedTopic={selectedTopic} selectedFormat={selectedFormat} selectedLevel={selectedLevel} search={typeof query.q === "string" ? query.q : ""} />
      {filtered.length ? <LibraryGrid items={filtered} /> : <EmptyState icon={<BookOpen size={24} />} title="Nenhum material encontrado" tone="info">Ajuste os filtros ou volte mais tarde para consultar novos conteúdos.</EmptyState>}
    </div>
  );
}
