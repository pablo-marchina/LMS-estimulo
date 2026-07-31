"use client";

import { ExternalLink, Monitor, MousePointer2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { resolvedInterfaceValue, type AdminInterfaceContentEntry } from "@/lib/interface-content/contracts";

const SELECT_MESSAGE = "estimulo:interface-content-selected";
const READY_MESSAGE = "estimulo:interface-preview-ready";
const areaLabels: Record<string, string> = { shared: "Compartilhado", public: "Público", participant: "Participante", admin: "Administrador" };
const typeLabels: Record<string, string> = { text: "Texto", textarea: "Texto longo", navigation: "Menu", button: "Botão", link: "Link", image: "Imagem", notice: "Aviso", section: "Bloco", element: "Elemento" };

function routeFromEntry(entry: AdminInterfaceContentEntry): string | null {
  const value = resolvedInterfaceValue(entry);
  const href = typeof value.href === "string" && value.href.startsWith("/") ? value.href : null;
  if (entry.element_type === "navigation" && href) return href;
  if (entry.route_pattern) return entry.route_pattern.endsWith("/*") ? entry.route_pattern.slice(0, -2) || "/" : entry.route_pattern;
  const match = entry.content_key.match(/^(admin|participant)\.page\.([^.]+)\.header\./);
  if (!match) return null;
  const [, area, page] = match;
  const root = area === "admin" ? "/admin" : "/empreendedor";
  return page === "overview" ? root : `${root}/${page}`;
}

function routeMatches(pattern: string | null, route: string) {
  if (!pattern) return false;
  if (pattern === route) return true;
  if (!pattern.endsWith("/*")) return false;
  const base = pattern.slice(0, -2);
  return route === base || route.startsWith(`${base}/`);
}

function entryMatchesRoute(entry: AdminInterfaceContentEntry, route: string) {
  if (entry.placement === "navigation") return route.startsWith(entry.area === "participant" ? "/empreendedor" : entry.area === "admin" ? "/admin" : "/");
  return routeFromEntry(entry) === route || routeMatches(entry.route_pattern, route);
}

function visibleText(entry: AdminInterfaceContentEntry) {
  const value = resolvedInterfaceValue(entry);
  return String(value.text || value.title || value.body || entry.element_name || "Sem conteúdo");
}

function previewUrl(route: string) {
  const url = new URL(route, window.location.origin);
  url.searchParams.set("interface_preview", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function VisualInterfaceSelector({ entries, selectedKey, initialRoute }: { entries: AdminInterfaceContentEntry[]; selectedKey: string; initialRoute: string }) {
  const router = useRouter();
  const [route, setRoute] = useState(initialRoute);
  const [frameKey, setFrameKey] = useState(0);
  const [ready, setReady] = useState(false);

  const routes = useMemo(() => {
    const map = new Map<string, { route: string; label: string; area: string }>();
    for (const entry of entries) {
      const candidate = routeFromEntry(entry);
      if (!candidate || candidate === "/admin/experiencia" || candidate.includes("*")) continue;
      if (!map.has(candidate)) map.set(candidate, { route: candidate, label: entry.page || candidate, area: areaLabels[entry.area] ?? entry.area });
    }
    if (!map.has("/empreendedor")) map.set("/empreendedor", { route: "/empreendedor", label: "Início", area: "Participante" });
    if (!map.has("/admin")) map.set("/admin", { route: "/admin", label: "Visão geral", area: "Administrador" });
    return [...map.values()].sort((a, b) => `${a.area} ${a.label}`.localeCompare(`${b.area} ${b.label}`, "pt-BR"));
  }, [entries]);

  const visibleEntries = useMemo(() => entries.filter((entry) => entryMatchesRoute(entry, route)).sort((a, b) => a.element_name.localeCompare(b.element_name, "pt-BR")), [entries, route]);

  function selectEntry(contentKey: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("edit", contentKey);
    params.set("preview_route", route);
    router.replace(`/admin/experiencia?${params.toString()}#editor-elemento`, { scroll: false });
  }

  function changeRoute(nextRoute: string) {
    setRoute(nextRoute);
    setReady(false);
    setFrameKey((value) => value + 1);
    const params = new URLSearchParams(window.location.search);
    params.set("preview_route", nextRoute);
    params.delete("edit");
    router.replace(`/admin/experiencia?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== "object") return;
      const data = event.data as { type?: string; contentKey?: string };
      if (data.type === READY_MESSAGE) setReady(true);
      if (data.type === SELECT_MESSAGE && data.contentKey) selectEntry(data.contentKey);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  });

  const src = typeof window === "undefined" ? route : previewUrl(route);

  return <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-labelledby="visual-interface-title">
    <div className="flex flex-col gap-4 border-b border-border bg-surface-muted p-4 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex items-center gap-2 text-primary"><MousePointer2 size={18} /><p className="text-xs font-black uppercase tracking-[.12em]">Editor visual</p></div><h2 id="visual-interface-title" className="mt-1 text-lg font-black text-secondary">Clique diretamente no que deseja editar</h2><p className="mt-1 text-sm text-muted">A prévia abaixo é a página real. Os elementos editáveis ficam contornados quando ela termina de carregar.</p></div>
      <div className="flex flex-wrap items-end gap-2"><label className="grid min-w-64 gap-1 text-xs font-bold text-secondary">Página exibida<select value={route} onChange={(event) => changeRoute(event.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none">{routes.map((item) => <option key={item.route} value={item.route}>{item.area} · {item.label}</option>)}</select></label><Button type="button" variant="secondary" size="sm" onClick={() => { setReady(false); setFrameKey((value) => value + 1); }}><RefreshCw size={15} /> Recarregar</Button></div>
    </div>

    <div className="grid min-h-[720px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 bg-[#e9edf1] p-3 sm:p-5">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-3 py-2"><div className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-danger/70" /><span className="size-2.5 rounded-full bg-warning/70" /><span className="size-2.5 rounded-full bg-success/70" /></div><div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-muted"><Monitor size={13} /><span className="truncate">{route}</span></div><a href={route} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-primary" aria-label="Abrir página em nova aba"><ExternalLink size={15} /></a></div>
          <div className="relative h-[650px] bg-white"><iframe key={`${src}:${frameKey}`} src={src} title={`Prévia de ${route}`} className="size-full border-0" onLoad={() => setTimeout(() => setReady(true), 500)} />{!ready ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/80"><div className="text-center"><RefreshCw className="mx-auto animate-spin text-primary" /><p className="mt-2 text-sm font-semibold text-secondary">Carregando a página…</p></div></div> : null}</div>
        </div>
        <p className="mt-3 text-xs text-muted">Cliques em elementos contornados abrem a edição abaixo. Links e botões não executam ações durante a seleção.</p>
      </div>

      <aside className="border-t border-border bg-white lg:border-l lg:border-t-0"><div className="border-b border-border p-4"><h3 className="font-black text-secondary">Elementos desta página</h3><p className="mt-1 text-xs text-muted">Também é possível selecionar pela lista.</p></div><div className="grid max-h-[675px] gap-2 overflow-y-auto p-3">{visibleEntries.map((entry) => { const active = entry.content_key === selectedKey; return <button type="button" key={entry.content_key} onClick={() => selectEntry(entry.content_key)} className={`rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary-light shadow-sm" : "border-border bg-white hover:border-primary/45 hover:bg-surface-muted"}`}><div className="flex items-start justify-between gap-2"><strong className="text-sm text-secondary">{entry.element_name}</strong><span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted">{typeLabels[entry.element_type] ?? "Elemento"}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{visibleText(entry)}</p>{entry.has_pending_changes ? <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-wide text-warning">Alteração não publicada</span> : null}</button>; })}{!visibleEntries.length ? <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Nenhum elemento editável foi registrado nesta página.</div> : null}</div></aside>
    </div>
  </section>;
}
