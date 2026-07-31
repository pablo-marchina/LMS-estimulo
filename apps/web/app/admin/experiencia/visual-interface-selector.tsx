"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, MousePointerClick, PanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { AdminInterfaceContentEntry } from "@/lib/interface-content/contracts";

function entryMatchesRoute(entry: AdminInterfaceContentEntry, route: string) {
  const pattern = entry.route_pattern;
  if (!pattern) return entry.area === "shared";
  if (pattern.endsWith("/*")) return route === pattern.slice(0,-2) || route.startsWith(pattern.slice(0,-1));
  return route === pattern;
}

function previewUrl(route: string) {
  const separator = route.includes("?") ? "&" : "?";
  return `${route}${separator}interface_preview=1`;
}

function routeOptions(entries: AdminInterfaceContentEntry[]) {
  const values = new Map<string,string>();
  values.set("/empreendedor", "Início do participante");
  values.set("/empreendedor/jornadas", "Jornadas do participante");
  values.set("/empreendedor/biblioteca", "Biblioteca do participante");
  values.set("/empreendedor/entregas", "Entregas do participante");
  values.set("/empreendedor/perfil", "Perfil do participante");
  values.set("/admin", "Visão geral administrativa");
  values.set("/admin/produto", "Jornadas administrativas");
  values.set("/admin/biblioteca", "Biblioteca administrativa");
  values.set("/admin/operacao", "Operação administrativa");
  for (const entry of entries) {
    const pattern = entry.route_pattern;
    if (!pattern || pattern.includes("*") || pattern.includes("[") || pattern === "/admin/experiencia") continue;
    values.set(pattern, entry.page.replaceAll("_"," "));
  }
  return Array.from(values, ([route,label]) => ({ route, label })).sort((a,b) => a.label.localeCompare(b.label,"pt-BR"));
}

export function VisualInterfaceSelector({ entries, selectedKey, initialRoute }: { entries: AdminInterfaceContentEntry[]; selectedKey: string; initialRoute: string }) {
  const router = useRouter();
  const options = useMemo(() => routeOptions(entries), [entries]);
  const [route, setRoute] = useState(initialRoute);
  const [frameKey, setFrameKey] = useState(0);
  const [ready, setReady] = useState(false);
  const visibleEntries = useMemo(() => entries.filter((entry) => entryMatchesRoute(entry, route)), [entries, route]);
  const src = previewUrl(route);

  useEffect(() => {
    setRoute(initialRoute);
    setReady(false);
    setFrameKey((value) => value + 1);
  }, [initialRoute]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== "object") return;
      const payload = event.data as { type?: string; contentKey?: string; pathname?: string };
      if (payload.type !== "estimulo:interface-content-selected" || !payload.contentKey) return;
      const entry = entries.find((item) => item.content_key === payload.contentKey);
      if (!entry) return;
      const params = new URLSearchParams(window.location.search);
      params.set("edit", payload.contentKey);
      params.set("preview_route", payload.pathname && payload.pathname.startsWith("/") ? payload.pathname : route);
      router.replace(`/admin/experiencia?${params.toString()}#editor-elemento`, { scroll: false });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [entries, route, router]);

  function changeRoute(nextRoute: string) {
    setRoute(nextRoute);
    setReady(false);
    setFrameKey((value) => value + 1);
    const params = new URLSearchParams(window.location.search);
    params.set("preview_route", nextRoute);
    params.delete("edit");
    window.history.replaceState(window.history.state, "", `/admin/experiencia?${params.toString()}`);
  }

  function selectEntry(contentKey: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("edit", contentKey);
    params.set("preview_route", route);
    router.replace(`/admin/experiencia?${params.toString()}#editor-elemento`, { scroll: false });
  }

  return <section className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
    <aside className="grid content-start gap-4">
      <div><p className="brand-kicker">Navegação visual</p><h2 className="mt-1 text-lg font-black text-secondary">Página exibida</h2><p className="mt-1 text-sm text-muted">Troque a página abaixo. A prévia muda imediatamente sem recarregar o editor.</p></div>
      <Select value={route} onChange={(event) => changeRoute(event.target.value)} aria-label="Página exibida na prévia">{options.map((option) => <option key={option.route} value={option.route}>{option.label}</option>)}</Select>
      <a href={route} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"><ExternalLink size={15} /> Abrir página em nova aba</a>
      <div className="grid gap-2"><p className="text-xs font-bold uppercase tracking-wide text-muted">Elementos nesta página</p>{visibleEntries.length ? visibleEntries.map((entry) => <button key={entry.content_key} type="button" onClick={() => selectEntry(entry.content_key)} className={`rounded-xl border p-3 text-left transition ${selectedKey === entry.content_key ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40 hover:bg-surface-muted"}`}><strong className="block text-sm text-secondary">{entry.element_name}</strong><span className="mt-1 block text-xs text-muted">{entry.placement.replaceAll("_"," ")} · {entry.element_type}</span></button>) : <p className="rounded-xl bg-surface-muted p-3 text-sm text-muted">Nenhum elemento registrado especificamente para esta página.</p>}</div>
    </aside>
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface-muted">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3"><span className="inline-flex items-center gap-2 text-sm font-bold text-secondary"><PanelTop size={16} /> Prévia clicável</span><span className="inline-flex items-center gap-1.5 text-xs text-muted"><MousePointerClick size={14} /> Clique nos contornos para editar</span></div>
      <div className="relative min-h-[640px] bg-white">
        {!ready ? <div className="absolute inset-0 z-10 grid place-items-center bg-white"><p className="text-sm font-semibold text-muted">Carregando {route}…</p></div> : null}
        <iframe key={`${src}:${frameKey}`} name="estimulo-interface-preview" src={src} title={`Prévia da interface: ${route}`} className="h-[760px] w-full bg-white" onLoad={() => setReady(true)} referrerPolicy="same-origin" />
      </div>
    </div>
  </section>;
}
