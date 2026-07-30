"use client";

import { ExternalLink, ImageIcon, Monitor, MousePointer2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { resolvedInterfaceValue, type AdminInterfaceContentEntry } from "@/lib/interface-content/contracts";

const areaLabels: Record<string, string> = {
  shared: "Compartilhado",
  public: "Público",
  participant: "Participante",
  admin: "Administrador",
};
const typeLabels: Record<string, string> = {
  text: "Texto",
  textarea: "Texto longo",
  navigation: "Menu",
  button: "Botão",
  link: "Link",
  image: "Imagem",
  notice: "Aviso",
  section: "Bloco",
  element: "Elemento",
};

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
  if (entry.placement === "navigation") {
    return route.startsWith(entry.area === "participant" ? "/empreendedor" : entry.area === "admin" ? "/admin" : "/");
  }
  const directRoute = routeFromEntry(entry);
  if (directRoute === route) return true;
  return routeMatches(entry.route_pattern, route);
}

function entryOrder(entry: AdminInterfaceContentEntry) {
  const order = Number(resolvedInterfaceValue(entry).order ?? 9999);
  return Number.isFinite(order) ? order : 9999;
}

function entryPlacement(entry: AdminInterfaceContentEntry) {
  if (entry.placement === "navigation") return "navigation";
  if (entry.placement === "header" || entry.content_key.includes(".header.")) return "header";
  if (entry.placement === "footer") return "footer";
  if (entry.placement === "after_content") return "after_content";
  return "content";
}

function visibleText(entry: AdminInterfaceContentEntry) {
  const value = resolvedInterfaceValue(entry);
  return String(value.text || value.title || value.body || entry.element_name || "Sem conteúdo");
}

function PreviewElement({
  entry,
  active,
  onSelect,
}: {
  entry: AdminInterfaceContentEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const value = resolvedInterfaceValue(entry);
  const visible = value.visible !== false;
  const title = String(value.title || value.text || entry.element_name);
  const body = String(value.body || "");
  const imageUrl = typeof value.image_url === "string" ? value.image_url : "";
  const classes = `group relative w-full rounded-xl border-2 p-3 text-left transition ${active ? "border-primary bg-primary-light shadow-md" : "border-dashed border-primary/35 bg-white hover:border-primary hover:bg-primary-light/40"} ${visible ? "" : "opacity-50"}`;

  if (entry.element_type === "image") {
    return <button type="button" onClick={onSelect} className={classes} aria-label={`Editar ${entry.element_name}`}>
      {imageUrl ? <img src={imageUrl} alt={String(value.alt || "")} className="h-32 w-full rounded-lg object-cover" /> : <span className="grid h-32 place-items-center rounded-lg bg-surface-muted text-muted"><ImageIcon size={28} aria-hidden="true" /></span>}
      <span className="mt-2 block text-xs font-bold text-secondary">{entry.element_name}</span>
      {!visible ? <span className="text-[10px] font-black uppercase text-warning">Oculto</span> : null}
    </button>;
  }

  if (entry.element_type === "navigation") {
    return <button type="button" onClick={onSelect} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${active ? "border-primary bg-primary text-white" : "border-primary/25 bg-white text-secondary hover:border-primary"}`}>
      {title}
    </button>;
  }

  if (entry.element_type === "button" || entry.element_type === "link") {
    return <button type="button" onClick={onSelect} className={classes}>
      <span className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-bold text-white">{title}</span>
      <span className="mt-2 block text-[10px] font-bold uppercase text-muted">Clique para editar o elemento</span>
    </button>;
  }

  return <button type="button" onClick={onSelect} className={classes}>
    <span className="block text-sm font-black text-secondary">{title}</span>
    {body ? <span className="mt-1 block whitespace-pre-line text-xs leading-5 text-muted">{body}</span> : null}
    {!visible ? <span className="mt-2 block text-[10px] font-black uppercase text-warning">Oculto</span> : null}
  </button>;
}

export function VisualInterfaceSelector({
  entries,
  selectedKey,
  initialRoute,
}: {
  entries: AdminInterfaceContentEntry[];
  selectedKey: string;
  initialRoute: string;
}) {
  const router = useRouter();
  const [route, setRoute] = useState(initialRoute);

  const routes = useMemo(() => {
    const map = new Map<string, { route: string; label: string; area: string }>();
    for (const entry of entries) {
      const candidate = routeFromEntry(entry);
      if (!candidate || candidate === "/admin/experiencia" || candidate.includes("*")) continue;
      if (!map.has(candidate)) {
        map.set(candidate, {
          route: candidate,
          label: entry.page || candidate,
          area: areaLabels[entry.area] ?? entry.area,
        });
      }
    }
    if (!map.has("/empreendedor")) map.set("/empreendedor", { route: "/empreendedor", label: "Início", area: "Participante" });
    if (!map.has("/admin")) map.set("/admin", { route: "/admin", label: "Visão geral", area: "Administrador" });
    return [...map.values()].sort((a, b) => `${a.area} ${a.label}`.localeCompare(`${b.area} ${b.label}`, "pt-BR"));
  }, [entries]);

  const visibleEntries = useMemo(
    () => entries
      .filter((entry) => entryMatchesRoute(entry, route))
      .sort((a, b) => entryOrder(a) - entryOrder(b) || a.element_name.localeCompare(b.element_name, "pt-BR")),
    [entries, route],
  );

  const groups = useMemo(() => ({
    navigation: visibleEntries.filter((entry) => entryPlacement(entry) === "navigation"),
    header: visibleEntries.filter((entry) => entryPlacement(entry) === "header"),
    content: visibleEntries.filter((entry) => entryPlacement(entry) === "content"),
    after_content: visibleEntries.filter((entry) => entryPlacement(entry) === "after_content"),
    footer: visibleEntries.filter((entry) => entryPlacement(entry) === "footer"),
  }), [visibleEntries]);

  function selectEntry(contentKey: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("edit", contentKey);
    params.set("preview_route", route);
    router.replace(`/admin/experiencia?${params.toString()}#editor-elemento`, { scroll: false });
  }

  function changeRoute(nextRoute: string) {
    setRoute(nextRoute);
    const params = new URLSearchParams(window.location.search);
    params.set("preview_route", nextRoute);
    params.delete("edit");
    router.replace(`/admin/experiencia?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-labelledby="visual-interface-title">
      <div className="flex flex-col gap-4 border-b border-border bg-surface-muted p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary"><MousePointer2 size={18} aria-hidden="true" /><p className="text-xs font-black uppercase tracking-[.12em]">Editor visual</p></div>
          <h2 id="visual-interface-title" className="mt-1 text-lg font-black text-secondary">Selecione o elemento que deseja alterar</h2>
          <p className="mt-1 text-sm text-muted">A prévia estruturada funciona para páginas de participante e de administração sem trocar sua sessão.</p>
        </div>
        <label className="grid min-w-64 gap-1 text-xs font-bold text-secondary">
          Página exibida
          <select value={route} onChange={(event) => changeRoute(event.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink focus:border-primary focus:outline-none">
            {routes.map((item) => <option key={item.route} value={item.route}>{item.area} · {item.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid min-h-[660px] lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 bg-[#e9edf1] p-3 sm:p-5">
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-3 py-2">
              <div className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-danger/70" /><span className="size-2.5 rounded-full bg-warning/70" /><span className="size-2.5 rounded-full bg-success/70" /></div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-muted"><Monitor size={13} /><span className="truncate">{route}</span></div>
              <a href={route} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-primary" aria-label="Abrir página em nova aba"><ExternalLink size={15} /></a>
            </div>
            <div className="min-h-[590px] bg-white">
              {groups.navigation.length ? <nav className="flex flex-wrap gap-2 border-b border-border bg-surface-muted p-4">{groups.navigation.map((entry) => <PreviewElement key={entry.content_key} entry={entry} active={entry.content_key === selectedKey} onSelect={() => selectEntry(entry.content_key)} />)}</nav> : null}
              <div className="mx-auto grid max-w-4xl gap-5 p-5 sm:p-8">
                {groups.header.length ? <header className="grid gap-3 border-b border-border pb-5">{groups.header.map((entry) => <PreviewElement key={entry.content_key} entry={entry} active={entry.content_key === selectedKey} onSelect={() => selectEntry(entry.content_key)} />)}</header> : null}
                {groups.content.map((entry) => <PreviewElement key={entry.content_key} entry={entry} active={entry.content_key === selectedKey} onSelect={() => selectEntry(entry.content_key)} />)}
                {groups.after_content.length ? <div className="grid gap-3 border-t border-border pt-5">{groups.after_content.map((entry) => <PreviewElement key={entry.content_key} entry={entry} active={entry.content_key === selectedKey} onSelect={() => selectEntry(entry.content_key)} />)}</div> : null}
                {!visibleEntries.length ? <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border p-8 text-center"><div><p className="font-bold text-secondary">Nenhum elemento registrado</p><p className="mt-1 text-sm text-muted">Cadastre um elemento para esta rota ou selecione outra página.</p></div></div> : null}
              </div>
              {groups.footer.length ? <footer className="grid gap-2 border-t border-border bg-surface-muted p-5">{groups.footer.map((entry) => <PreviewElement key={entry.content_key} entry={entry} active={entry.content_key === selectedKey} onSelect={() => selectEntry(entry.content_key)} />)}</footer> : null}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Esta visualização representa a posição e o conteúdo configurável. Use “Abrir página em nova aba” para conferir o resultado publicado completo.</p>
        </div>

        <aside className="border-t border-border bg-white lg:border-l lg:border-t-0">
          <div className="sticky top-0 border-b border-border p-4">
            <h3 className="font-black text-secondary">Elementos desta tela</h3>
            <p className="mt-1 text-xs text-muted">{visibleEntries.length} elemento(s) disponível(is) para edição.</p>
          </div>
          <div className="grid max-h-[610px] gap-2 overflow-y-auto p-3">
            {visibleEntries.map((entry) => {
              const active = entry.content_key === selectedKey;
              return (
                <button
                  type="button"
                  key={entry.content_key}
                  onClick={() => selectEntry(entry.content_key)}
                  className={`rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary-light shadow-sm" : "border-border bg-white hover:border-primary/45 hover:bg-surface-muted"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm text-secondary">{entry.element_name}</strong>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted">{typeLabels[entry.element_type] ?? entry.element_type}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{visibleText(entry)}</p>
                  {entry.has_pending_changes ? <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-wide text-warning">Rascunho pendente</span> : null}
                </button>
              );
            })}
            {!visibleEntries.length ? <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Nenhum elemento foi registrado para esta página.</div> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
