import Link from "next/link";
import { ArrowLeft, CheckCircle2, Compass, ExternalLink, FileUp, Flag, PlayCircle, Sparkles } from "lucide-react";
import { getAuthContext } from "@/lib/auth/context";
import type { ActivityAsset, JourneyState } from "@/lib/journey-runtime/contracts";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

export type JourneyStage = "diagnostic" | "activity" | "result";

const labels: Record<JourneyStage, string> = {
  diagnostic: "Diagnóstico",
  activity: "Aprendizagem",
  result: "Resultado",
};

const icons = {
  diagnostic: Compass,
  activity: FileUp,
  result: Flag,
};

function youtubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (!["youtube.com", "m.youtube.com"].includes(hostname)) return null;
    const playlist = url.searchParams.get("list");
    if (playlist) return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlist)}`;
    const id = url.searchParams.get("v") ?? (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/") ? url.pathname.split("/").filter(Boolean)[1] : null);
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch {
    return null;
  }
}

export async function JourneyProgressNav({ state, current }: { state: JourneyState; current: JourneyStage }) {
  const Icon = icons[current];
  const diagnosticComplete = state.d?.status === "completed";
  let assets: ActivityAsset[] = [];
  if (current === "activity") {
    const auth = await getAuthContext();
    if (auth.status === "authenticated") {
      const experience = await journeyRuntime.getParticipantExperience(auth.identity.user_account_id, state.journey_instance_id).catch(() => null);
      assets = experience?.activity?.assets ?? [];
    }
  }

  return (
    <>
      <aside className="no-print brand-card relative mb-6 overflow-hidden rounded-card border border-primary/15 bg-[linear-gradient(115deg,rgba(255,255,255,.98),rgba(233,234,255,.94),rgba(234,251,241,.92))] p-5 shadow-md" aria-label={`Contexto de ${state.journey_title ?? state.journey_code}`}>
        <div className="absolute -right-10 -top-12 size-32 rounded-full border-[22px] border-brand-magenta/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="brand-button flex items-center gap-2 rounded-xl border border-primary/15 bg-white/85 px-3 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary hover:text-white">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar à jornada
          </Link>
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-md"><Icon size={21} aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-[.14em] text-primary/70">{state.journey_title ?? state.journey_code}</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-black text-secondary"><Sparkles size={16} className="text-brand-magenta" aria-hidden="true" /> {labels[current]}</p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${diagnosticComplete ? "bg-brand-green text-secondary" : "bg-warning-soft text-warning"}`}>
            {diagnosticComplete ? <CheckCircle2 size={14} /> : <Compass size={14} />}
            {diagnosticComplete ? "Diagnóstico concluído" : current === "diagnostic" ? "Em andamento" : "Diagnóstico pendente"}
          </span>
        </div>
      </aside>
      {assets.length ? <section className="mb-6 grid gap-4" aria-labelledby="recursos-audiovisuais-titulo">
        <div><p className="brand-kicker">Conteúdo audiovisual</p><h2 id="recursos-audiovisuais-titulo" className="display-font mt-1 text-2xl text-secondary">Vídeos desta atividade</h2></div>
        {assets.map((asset) => <ActivityAssetCard asset={asset} key={asset.id} />)}
      </section> : null}
    </>
  );
}

function ActivityAssetCard({ asset }: { asset: ActivityAsset }) {
  const embedUrl = asset.external_url && asset.asset_type === "video" ? youtubeEmbedUrl(asset.external_url) : null;
  const description = typeof asset.accessibility_metadata.description === "string" ? asset.accessibility_metadata.description : null;
  return <article className="brand-card overflow-hidden rounded-card border border-border bg-white shadow-card">
    <div className="flex items-center gap-3 border-b border-border p-4"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><PlayCircle size={20} /></span><div><h3 className="font-semibold text-ink">{asset.title}</h3>{description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}</div></div>
    {embedUrl ? <div className="aspect-video bg-black"><iframe src={embedUrl} title={asset.title} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : asset.external_url ? <div className="p-4"><a href={asset.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"><ExternalLink size={16} /> Abrir conteúdo</a></div> : null}
  </article>;
}
