"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileSearch, MousePointerClick, PanelTop, Settings2 } from "lucide-react";
import { Select } from "@/components/ui/input";
import type { AdminInterfaceContentEntry } from "@/lib/interface-content/contracts";
import {
  interfaceRouteCatalog,
  interfaceRouteDefinition,
  type InterfaceRouteArea,
  type InterfaceRouteDefinition,
} from "@/lib/interface-content/route-catalog";

function pathnameOf(route: string) {
  return route.split(/[?#]/u, 1)[0] || "/";
}

function entryMatchesRoute(entry: AdminInterfaceContentEntry, route: string) {
  const pathname = pathnameOf(route);
  const pattern = entry.route_pattern;
  if (!pattern) return entry.area === "shared";
  if (pattern.endsWith("/*")) return pathname === pattern.slice(0, -2) || pathname.startsWith(pattern.slice(0, -1));
  return pathname === pattern;
}

function isParticipantRoute(route: string) {
  const pathname = pathnameOf(route);
  return pathname === "/empreendedor" || pathname.startsWith("/empreendedor/");
}

function previewTarget(route: string) {
  const definition = interfaceRouteDefinition(route);
  return definition?.canonicalRoute ?? route;
}

function previewUrl(route: string) {
  const target = previewTarget(route);
  if (isParticipantRoute(target)) {
    const params = new URLSearchParams({ route: target });
    return `/interface-preview/participant/start?${params.toString()}`;
  }
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}interface_preview=1`;
}

function inferredArea(route: string): InterfaceRouteArea {
  const pathname = pathnameOf(route);
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/empreendedor" || pathname.startsWith("/empreendedor/")) return "participant";
  return "public";
}

function inferredLabel(route: string, page: string, area: string) {
  const prefix = area === "participant" ? "Participante" : area === "public" ? "Público" : "Administrador";
  const words = page.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
  return `${prefix} — ${words || pathnameOf(route)}`;
}

function customRouteDefinitions(entries: AdminInterfaceContentEntry[]) {
  const known = new Set(interfaceRouteCatalog.map((item) => item.route));
  const custom = new Map<string, InterfaceRouteDefinition>();
  for (const entry of entries) {
    const pattern = entry.route_pattern;
    if (!pattern || pattern.includes("*") || pattern.includes("[") || known.has(pattern) || pattern === "/admin/experiencia") continue;
    custom.set(pattern, {
      route: pattern,
      label: inferredLabel(pattern, entry.page, entry.area),
      area: entry.area === "shared" ? inferredArea(pattern) : entry.area,
      description: "Rota registrada diretamente na configuração da interface.",
      previewable: true,
      kind: "page",
      specifications: ["Rota personalizada", "Prévia em modo somente leitura", "Elementos registrados pelo administrador"],
    });
  }
  return [...custom.values()];
}

function routeHasCoverage(entries: AdminInterfaceContentEntry[], route: string) {
  return entries.some((entry) => Boolean(entry.route_pattern) && entryMatchesRoute(entry, route));
}

const areaLabels: Record<InterfaceRouteArea, string> = {
  admin: "Administrador",
  participant: "Participante",
  public: "Público",
};

export function VisualInterfaceSelector({ entries, selectedKey, initialRoute }: { entries: AdminInterfaceContentEntry[]; selectedKey: string; initialRoute: string }) {
  const router = useRouter();
  const definitions = useMemo(() => [...interfaceRouteCatalog, ...customRouteDefinitions(entries)], [entries]);
  const previewableDefinitions = useMemo(() => definitions.filter((item) => item.previewable), [definitions]);
  const initialDefinition = interfaceRouteDefinition(initialRoute);
  const fallbackRoute = initialDefinition?.previewable ? initialRoute : "/empreendedor";
  const [route, setRoute] = useState(fallbackRoute);
  const [area, setArea] = useState<InterfaceRouteArea>(inferredArea(fallbackRoute));
  const [frameKey, setFrameKey] = useState(0);
  const [ready, setReady] = useState(false);
  const selectedDefinition = definitions.find((item) => item.route === pathnameOf(route)) ?? null;
  const visibleEntries = useMemo(() => entries.filter((entry) => entryMatchesRoute(entry, route)), [entries, route]);
  const options = useMemo(() => previewableDefinitions.filter((item) => item.area === area), [area, previewableDefinitions]);
  const src = previewUrl(route);
  const coverage = useMemo(() => {
    return (["admin", "participant", "public"] as InterfaceRouteArea[]).map((targetArea) => {
      const routes = definitions.filter((item) => item.area === targetArea);
      const configured = routes.filter((item) => routeHasCoverage(entries, item.route)).length;
      return { area: targetArea, total: routes.length, configured };
    });
  }, [definitions, entries]);

  useEffect(() => {
    const definition = definitions.find((item) => item.route === pathnameOf(initialRoute));
    const nextRoute = definition?.previewable ? initialRoute : "/empreendedor";
    setRoute(nextRoute);
    setArea(inferredArea(nextRoute));
    setReady(false);
    setFrameKey((value) => value + 1);
  }, [definitions, initialRoute]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== "object") return;
      const payload = event.data as { type?: string; contentKey?: string; pathname?: string };
      if (payload.type === "estimulo:interface-preview-ready") {
        setReady(true);
        return;
      }
      if (payload.type !== "estimulo:interface-content-selected" || !payload.contentKey) return;
      const entry = entries.find((item) => item.content_key === payload.contentKey);
      if (!entry) return;
      const params = new URLSearchParams(window.location.search);
      params.set("edit", payload.contentKey);
      params.set("preview_route", payload.pathname?.startsWith("/") ? payload.pathname : route);
      router.replace(`/admin/experiencia?${params.toString()}#editor-elemento`, { scroll: false });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [entries, route, router]);

  function changeArea(nextArea: InterfaceRouteArea) {
    const first = previewableDefinitions.find((item) => item.area === nextArea);
    setArea(nextArea);
    if (first) changeRoute(first.route, nextArea);
  }

  function changeRoute(nextRoute: string, nextArea = inferredArea(nextRoute)) {
    setRoute(nextRoute);
    setArea(nextArea);
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

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Cobertura da interface">
        {coverage.map((item) => (
          <article key={item.area} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-secondary">{areaLabels[item.area]}</p>
              <span className="text-xs font-bold text-primary">{item.configured}/{item.total}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${item.total ? Math.round((item.configured / item.total) * 100) : 0}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">Seções com ao menos um elemento configurável registrado.</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm lg:grid-cols-[minmax(240px,310px)_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <div>
            <p className="brand-kicker">Configuração administrativa</p>
            <h2 className="mt-1 text-lg font-black text-secondary">Página exibida</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Escolha qualquer seção estática da plataforma. A prévia usa a rota real e bloqueia escritas.</p>
          </div>

          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Área da plataforma">
            {(["admin", "participant", "public"] as InterfaceRouteArea[]).map((item) => (
              <button key={item} type="button" onClick={() => changeArea(item)} className={`rounded-xl px-2 py-2 text-xs font-bold transition ${area === item ? "bg-primary text-white" : "bg-surface-muted text-secondary hover:bg-primary-soft"}`}>{areaLabels[item]}</button>
            ))}
          </div>

          <Select value={route} onChange={(event) => changeRoute(event.target.value)} aria-label="Página exibida na prévia">
            {options.map((option) => <option key={option.route} value={option.route}>{option.label}</option>)}
          </Select>

          <a href={previewUrl(route)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"><ExternalLink size={15} /> Abrir prévia somente leitura</a>

          <article className="rounded-xl border border-border bg-surface-muted p-3">
            <div className="flex items-start gap-2"><FileSearch className="mt-0.5 shrink-0 text-primary" size={17} /><div><p className="text-sm font-black text-secondary">Especificações da seção</p><p className="mt-1 text-xs leading-5 text-muted">{selectedDefinition?.description ?? "Rota personalizada registrada na interface."}</p></div></div>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-muted">Rota</dt><dd className="max-w-[65%] break-all text-right font-semibold text-secondary">{route}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Elementos</dt><dd className="font-semibold text-secondary">{visibleEntries.length}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Prévia</dt><dd className="font-semibold text-success">Somente leitura</dd></div>
            </dl>
            <ul className="mt-3 grid gap-1.5 border-t border-border pt-3 text-xs text-muted">
              {(selectedDefinition?.specifications ?? ["Rota personalizada", "Elementos configuráveis por administrador"]).map((specification) => <li key={specification} className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-success" size={13} /> <span>{specification}</span></li>)}
            </ul>
          </article>

          <div className="grid gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><Settings2 size={14} /> Elementos nesta página</p>
            {visibleEntries.length ? visibleEntries.map((entry) => (
              <button key={entry.content_key} type="button" onClick={() => selectEntry(entry.content_key)} className={`rounded-xl border p-3 text-left transition ${selectedKey === entry.content_key ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40 hover:bg-surface-muted"}`}>
                <strong className="block text-sm text-secondary">{entry.element_name}</strong>
                <span className="mt-1 block text-xs text-muted">{entry.placement.replaceAll("_", " ")} · {entry.element_type}</span>
              </button>
            )) : <p className="rounded-xl bg-surface-muted p-3 text-sm text-muted">Nenhum elemento registrado especificamente para esta página. Use “Adicionar elemento” abaixo para ampliar a seção.</p>}
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface-muted">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3"><span className="inline-flex items-center gap-2 text-sm font-bold text-secondary"><PanelTop size={16} /> Prévia da rota real</span><span className="inline-flex items-center gap-1.5 text-xs text-muted"><MousePointerClick size={14} /> Clique nos contornos para editar</span></div>
          <div className="relative min-h-[640px] bg-white">
            {!ready ? <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-primary-soft"><div className="h-full w-2/3 animate-pulse rounded-r-full bg-primary" /></div> : null}
            <iframe
              key={`${src}:${frameKey}`}
              name="estimulo-interface-preview"
              src={src}
              title={`Prévia da interface: ${route}`}
              className="h-[760px] w-full bg-white"
              onLoad={() => setReady(true)}
              referrerPolicy="same-origin"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      </section>
    </section>
  );
}
