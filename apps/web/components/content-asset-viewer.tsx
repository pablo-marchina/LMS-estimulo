"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileAudio, FileImage, FileText, PlayCircle, RefreshCw } from "lucide-react";
import type { ActivityAsset } from "@/lib/journey-runtime/contracts";

export type ContentViewerAsset = Partial<ActivityAsset> & {
  id: string;
  asset_type: string;
  title: string;
  external_url?: string | null;
  description?: string | null;
  progress?: ActivityAsset["progress"];
  library_body?: string | null;
  library_slug?: string | null;
  library_summary?: string | null;
  library_source_name?: string | null;
};

type Props = {
  asset: ContentViewerAsset;
  progressEndpoint?: string;
  downloadHref?: string | null;
  compact?: boolean;
};

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: { events?: { onStateChange?: (event: { data: number; target: YouTubePlayer }) => void } },
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("BROWSER_REQUIRED"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YOUTUBE_API_UNAVAILABLE"));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("YOUTUBE_API_FAILED"));
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

type YouTubeSource = { videoId: string | null; playlistId: string | null };

function youtubeSource(raw: string | null | undefined): YouTubeSource | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { videoId: url.pathname.split("/").filter(Boolean)[0] ?? null, playlistId: url.searchParams.get("list") };
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
      const parts = url.pathname.split("/").filter(Boolean);
      const videoId = url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0] ?? "") ? parts[1] ?? null : null);
      return { videoId, playlistId: url.searchParams.get("list") };
    }
  } catch {
    return null;
  }
  return null;
}

function youtubeEmbed(source: YouTubeSource | null) {
  if (!source) return null;
  const params = new URLSearchParams({ rel: "0", playsinline: "1", enablejsapi: "1" });
  if (source.playlistId) params.set("list", source.playlistId);
  if (!source.videoId && source.playlistId) {
    params.set("listType", "playlist");
    return `https://www.youtube.com/embed/videoseries?${params.toString()}`;
  }
  return source.videoId ? `https://www.youtube.com/embed/${source.videoId}?${params.toString()}` : null;
}

function vimeoEmbed(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!url.hostname.includes("vimeo.com")) return null;
    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

function googleDriveEmbed(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.hostname !== "drive.google.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const fileIndex = parts.findIndex((part) => part === "d");
    const id = fileIndex > 0 && parts[fileIndex - 1] === "file" ? parts[fileIndex + 1] : null;
    return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : null;
  } catch {
    return null;
  }
}

function safeExternalUrl(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function metadataText(asset: ContentViewerAsset, key: string) {
  const value = asset.accessibility_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function ContentAssetViewer({ asset, progressEndpoint, downloadHref, compact = false }: Props) {
  const [ratio, setRatio] = useState(asset.progress?.completion_ratio ?? 0);
  const [completed, setCompleted] = useState(Boolean(asset.progress?.completed));
  const [saving, setSaving] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const ratioRef = useRef(ratio);
  const lastSent = useRef(asset.progress?.watched_seconds ?? 0);
  const youtubeFrame = useRef<HTMLIFrameElement>(null);
  const youtubePlayer = useRef<YouTubePlayer | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const externalUrl = safeExternalUrl(asset.external_url);
  const youtube = useMemo(() => youtubeSource(externalUrl), [externalUrl]);
  const youtubeUrl = useMemo(() => youtubeEmbed(youtube), [youtube]);
  const vimeo = useMemo(() => vimeoEmbed(externalUrl), [externalUrl]);
  const googleDriveUrl = useMemo(() => googleDriveEmbed(externalUrl), [externalUrl]);
  const description = asset.description ?? asset.library_summary ?? metadataText(asset, "description");
  const type = asset.asset_type.toLowerCase();

  const persist = useCallback(async (positionSeconds: number, durationSeconds: number | null, forceComplete = false) => {
    const nextRatio = forceComplete ? 1 : durationSeconds && durationSeconds > 0 ? Math.min(1, positionSeconds / durationSeconds) : ratioRef.current;
    ratioRef.current = Math.max(ratioRef.current, nextRatio);
    setRatio(ratioRef.current);
    if (forceComplete || nextRatio >= 0.9) setCompleted(true);
    if (!progressEndpoint) return;
    if (!forceComplete && positionSeconds - lastSent.current < 4.5) return;
    lastSent.current = positionSeconds;
    setSaving(true);
    try {
      const response = await fetch(progressEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content_asset_id: asset.id,
          position_seconds: Math.max(0, positionSeconds),
          duration_seconds: durationSeconds && durationSeconds > 0 ? durationSeconds : null,
          completed: forceComplete,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json() as { data?: { completion_ratio?: number; completed?: boolean } };
      const persistedRatio = payload.data?.completion_ratio ?? nextRatio;
      const persistedCompleted = Boolean(payload.data?.completed || persistedRatio >= 0.9);
      ratioRef.current = Math.max(ratioRef.current, persistedRatio);
      setRatio(ratioRef.current);
      setCompleted((current) => current || persistedCompleted);
      window.dispatchEvent(new CustomEvent("estimulo:asset-progress", { detail: { assetId: asset.id, ratio: persistedRatio, completed: persistedCompleted } }));
    } finally {
      setSaving(false);
    }
  }, [asset.id, progressEndpoint]);

  useEffect(() => {
    if (!youtubeUrl || !youtube?.videoId || !youtubeFrame.current) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !youtubeFrame.current) return;
      youtubePlayer.current = new YT.Player(youtubeFrame.current, {
        events: {
          onStateChange: (event) => {
            if (interval.current) clearInterval(interval.current);
            if (event.data === YT.PlayerState.PLAYING) {
              interval.current = setInterval(() => {
                void persist(event.target.getCurrentTime(), event.target.getDuration() || null, false);
              }, 5000);
            }
            if (event.data === YT.PlayerState.ENDED) void persist(event.target.getDuration(), event.target.getDuration(), true);
          },
        },
      });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (interval.current) clearInterval(interval.current);
      youtubePlayer.current?.destroy();
      youtubePlayer.current = null;
    };
  }, [persist, youtube?.videoId, youtubeUrl]);

  const markViewed = () => void persist(1, 1, true);
  const viewerClass = compact ? "rounded-xl" : "rounded-2xl";
  const mediaUrl = downloadHref ?? externalUrl;
  const isLibraryArticle = type === "library_article" && Boolean(asset.library_body);
  const embedded = Boolean(youtubeUrl || vimeo || googleDriveUrl);
  const requiresManualCompletion = Boolean(googleDriveUrl || (youtube?.playlistId && !youtube.videoId));

  return (
    <article className={`brand-media-card overflow-hidden border border-border bg-white shadow-sm ${viewerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">{type === "video" ? "Vídeo" : type === "audio" ? "Áudio" : type === "image" ? "Imagem" : type === "pdf" ? "Documento" : isLibraryArticle ? "Conteúdo da Biblioteca" : "Conteúdo complementar"}</p>
          <h3 className="mt-1 font-bold text-secondary">{asset.title}</h3>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${completed ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
          {completed ? <CheckCircle2 size={14} /> : <PlayCircle size={14} />}
          {completed ? "Concluído" : asset.is_required ? "Obrigatório" : "Opcional"}
        </span>
      </div>

      {youtubeUrl ? <div className="relative aspect-video w-full bg-black"><iframe ref={youtube?.videoId ? youtubeFrame : undefined} className="absolute inset-0 size-full" src={youtubeUrl} title={asset.title} loading="eager" onLoad={() => setFrameLoaded(true)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />{!frameLoaded ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-white"><RefreshCw className="animate-spin" size={24} /><span className="sr-only">Carregando vídeo</span></div> : null}</div> : null}
      {!youtubeUrl && vimeo ? <div className="relative aspect-video w-full bg-black"><iframe className="absolute inset-0 size-full" src={vimeo} title={asset.title} loading="eager" onLoad={() => setFrameLoaded(true)} allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />{!frameLoaded ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-white"><RefreshCw className="animate-spin" size={24} /></div> : null}</div> : null}
      {!youtubeUrl && !vimeo && googleDriveUrl ? <div className="relative aspect-video w-full bg-black"><iframe className="absolute inset-0 size-full" src={googleDriveUrl} title={asset.title} loading="eager" onLoad={() => setFrameLoaded(true)} allow="autoplay; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />{!frameLoaded ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-white"><RefreshCw className="animate-spin" size={24} /><span className="sr-only">Carregando vídeo do Google Drive</span></div> : null}</div> : null}
      {!embedded && type === "video" && mediaUrl ? <video className="aspect-video w-full bg-black" src={mediaUrl} controls playsInline preload="metadata" onTimeUpdate={(event) => void persist(event.currentTarget.currentTime, event.currentTarget.duration || null)} onEnded={(event) => void persist(event.currentTarget.duration, event.currentTarget.duration, true)} /> : null}
      {type === "audio" && mediaUrl ? <div className="flex min-h-36 items-center gap-4 bg-info-soft p-6"><FileAudio className="text-info" size={34} /><audio className="w-full" src={mediaUrl} controls preload="metadata" onTimeUpdate={(event) => void persist(event.currentTarget.currentTime, event.currentTarget.duration || null)} onEnded={(event) => void persist(event.currentTarget.duration, event.currentTarget.duration, true)} /></div> : null}
      {type === "image" && mediaUrl ? <img src={mediaUrl} alt={metadataText(asset, "alt") ?? asset.title} className="max-h-[38rem] w-full bg-surface-muted object-contain" /> : null}
      {type === "pdf" && mediaUrl ? <object data={mediaUrl} type="application/pdf" className="h-[min(70vh,48rem)] w-full"><p className="p-6 text-sm text-muted">Seu navegador não exibiu o PDF. Use o botão abaixo para abrir o arquivo.</p></object> : null}
      {isLibraryArticle ? <div className="grid gap-4 px-5 py-6 text-sm leading-7 text-ink/90">{asset.library_body?.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`} className="whitespace-pre-line">{paragraph}</p>)}</div> : null}
      {(type === "external_link" || type === "link" || type === "library") && !embedded ? <div className="grid min-h-44 place-items-center bg-primary-soft/55 p-6 text-center"><div><ExternalLink className="mx-auto text-primary" size={34} /><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Este conteúdo é mantido pela fonte indicada. Use o botão abaixo para acessá-lo.</p></div></div> : null}
      {!mediaUrl && !embedded && !isLibraryArticle ? <div className="grid min-h-40 place-items-center bg-surface-muted p-6 text-center"><FileText className="text-primary" size={34} /><p className="mt-2 text-sm text-muted">O conteúdo não pôde ser carregado. Abra a fonte ou tente novamente.</p></div> : null}

      <div className="grid gap-3 px-4 py-3">
        {progressEndpoint ? <div className="grid gap-1.5"><div className="flex justify-between text-xs font-semibold text-muted"><span>Progresso deste conteúdo</span><span>{saving ? "Salvando…" : `${Math.round(ratio * 100)}%`}</span></div><div className="h-2 overflow-hidden rounded-full bg-primary-soft"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(ratio * 100)}%` }} /></div></div> : null}
        <div className="flex flex-wrap items-center gap-2">
          {externalUrl ? <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary-soft"><ExternalLink size={15} /> Abrir na fonte</a> : null}
          {downloadHref ? <a href={downloadHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary-soft">{type === "image" ? <FileImage size={15} /> : <FileText size={15} />} Abrir arquivo</a> : null}
          {progressEndpoint && !completed && (!( ["video", "audio"].includes(type)) || requiresManualCompletion) ? <button type="button" onClick={markViewed} disabled={saving} className="rounded-full bg-success px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60">Marcar como concluído</button> : null}
        </div>
        {embedded ? <p className="text-xs text-muted">Caso a fonte bloqueie a reprodução incorporada, use “Abrir na fonte”. Seu acesso à atividade continua disponível.</p> : null}
      </div>
    </article>
  );
}
