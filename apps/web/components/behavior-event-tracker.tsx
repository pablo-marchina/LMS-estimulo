"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

function sessionId() {
  const key = "estimulo_behavior_session";
  const current = sessionStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

function cleanText(value: string | null | undefined, limit = 160) {
  return (value ?? "").replace(/\s+/gu, " ").trim().slice(0, limit);
}

function emit(interactionType: string, input: { entityType?: string; entityId?: string; properties?: Record<string, unknown> } = {}) {
  const payload = JSON.stringify({
    event_id: `web:${crypto.randomUUID()}`,
    interaction_type: interactionType,
    captured_at: new Date().toISOString(),
    session_id: sessionId(),
    entity_type: input.entityType ?? "page",
    entity_id: input.entityId ?? window.location.pathname,
    properties: {
      path: window.location.pathname,
      query_keys: [...new URLSearchParams(window.location.search).keys()].slice(0, 20),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      ...input.properties,
    },
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/behavior-events", new Blob([payload], { type: "application/json" }));
    return;
  }
  fetch("/api/behavior-events", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true, cache: "no-store" }).catch(() => undefined);
}

export function BehaviorEventTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enteredAt = useRef(0);

  useEffect(() => {
    enteredAt.current = performance.now();
    emit("page_view", { entityType: "page", entityId: pathname, properties: { search_parameter_count: [...searchParams.keys()].length } });
    return () => {
      emit("page_duration", { entityType: "page", entityId: pathname, properties: { duration_ms: Math.round(performance.now() - enteredAt.current) } });
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    const progress = new WeakMap<HTMLMediaElement, Set<number>>();
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a,button,[role='button']") : null;
      if (!target) return;
      const href = target instanceof HTMLAnchorElement ? target.getAttribute("href") : null;
      const identifier = target.getAttribute("data-behavior-id") || target.id || cleanText(target.textContent, 80) || "anonymous_control";
      emit("control_activate", {
        entityType: target instanceof HTMLAnchorElement ? "link" : "button",
        entityId: identifier,
        properties: { label: cleanText(target.textContent, 100), href: href?.startsWith("/") ? href.slice(0, 300) : href ? "external" : null },
      });
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      emit("form_submit", { entityType: "form", entityId: form.getAttribute("data-behavior-id") || form.id || form.action.split("?")[0]?.slice(-200) || "form", properties: { method: form.method.toUpperCase() } });
    };
    const media = (event: Event) => {
      const element = event.target instanceof HTMLMediaElement ? event.target : null;
      if (!element) return;
      if (event.type === "play" || event.type === "pause" || event.type === "ended") {
        emit(`media_${event.type}`, { entityType: element.tagName.toLowerCase(), entityId: element.dataset.behaviorId || element.currentSrc.slice(-200), properties: { current_time: Math.round(element.currentTime), duration: Number.isFinite(element.duration) ? Math.round(element.duration) : null } });
        return;
      }
      if (event.type === "timeupdate" && Number.isFinite(element.duration) && element.duration > 0) {
        const ratio = element.currentTime / element.duration;
        const threshold = [25, 50, 75, 100].find((value) => ratio * 100 >= value && !(progress.get(element) ?? new Set()).has(value));
        if (!threshold) return;
        const seen = progress.get(element) ?? new Set<number>();
        seen.add(threshold); progress.set(element, seen);
        emit("media_progress", { entityType: element.tagName.toLowerCase(), entityId: element.dataset.behaviorId || element.currentSrc.slice(-200), properties: { percentage: threshold } });
      }
    };
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    document.addEventListener("play", media, true);
    document.addEventListener("pause", media, true);
    document.addEventListener("ended", media, true);
    document.addEventListener("timeupdate", media, true);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      document.removeEventListener("play", media, true);
      document.removeEventListener("pause", media, true);
      document.removeEventListener("ended", media, true);
      document.removeEventListener("timeupdate", media, true);
    };
  }, []);

  return null;
}
