"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function behaviorSessionId() {
  const key = "estimulo_behavior_session";
  const current = sessionStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

function emitShareEvent(entityType: string, entityId: string, channel: string) {
  const payload = JSON.stringify({
    event_id: `web:${crypto.randomUUID()}`,
    interaction_type: "social_share",
    captured_at: new Date().toISOString(),
    session_id: behaviorSessionId(),
    entity_type: entityType,
    entity_id: entityId,
    properties: {
      channel,
      path: window.location.pathname,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
    },
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/behavior-events", new Blob([payload], { type: "application/json" }));
    return;
  }
  fetch("/api/behavior-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
    cache: "no-store",
  }).catch(() => undefined);
}

export function ShareAction({
  title,
  text,
  url,
  entityType,
  entityId,
  label = "Compartilhar",
  size = "sm",
}: {
  title: string;
  text: string;
  url?: string;
  entityType: string;
  entityId: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const targetUrl = url ? new URL(url, window.location.origin).toString() : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: targetUrl });
        emitShareEvent(entityType, entityId, "native_share");
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${targetUrl}`);
      setCopied(true);
      emitShareEvent(entityType, entityId, "clipboard");
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        emitShareEvent(entityType, entityId, "clipboard_fallback");
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        // The share action remains safe to retry if the browser blocks both APIs.
      }
    }
  }

  return (
    <Button type="button" variant="secondary" size={size} icon={copied ? <Check size={15} /> : <Share2 size={15} />} onClick={share} data-behavior-id={`share:${entityType}:${entityId}`}>
      {copied ? "Link copiado" : label}
    </Button>
  );
}
