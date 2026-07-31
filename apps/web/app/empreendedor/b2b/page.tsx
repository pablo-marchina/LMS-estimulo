import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }

export default async function ParticipantB2bIndexPage() {
  const auth = await requireParticipantContext();
  const workspace = await extensionsRuntime.participantWorkspace(auth.identity.user_account_id);

  return <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader eyebrow="Conteúdo exclusivo" title="B2B" description="Páginas e materiais liberados especificamente para a sua conta." />
    {workspace.b2b_pages.length === 0 ? <EmptyState title="Nenhum conteúdo exclusivo disponível" tone="info">Quando uma página for liberada para você ou para um dos seus grupos, ela aparecerá aqui.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{workspace.b2b_pages.map((page) => <Link key={text(page.id)} href={`/empreendedor/b2b/${text(page.slug)}`} className="group"><Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-sm"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Building2 size={20} /></span><div className="min-w-0 flex-1"><h2 className="font-black text-ink">{text(page.title)}</h2><p className="mt-1 line-clamp-3 text-sm text-muted">{text(page.description)}</p></div><ChevronRight size={18} className="mt-1 text-muted transition group-hover:translate-x-1 group-hover:text-primary" /></div></Card></Link>)}</div>}
  </div>;
}
