"use client";

import { useEffect } from "react";

export function InterfacePreviewGuard() {
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("interface_preview") === "1";
    if (!preview) return;

    document.documentElement.dataset.interfacePreview = "true";

    const preventSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("submit", preventSubmit, true);

    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null;
      const method = String(init?.method ?? request?.method ?? "GET").toUpperCase();
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true, preview: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }));
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const blocked = new WeakSet<XMLHttpRequest>();
    XMLHttpRequest.prototype.open = (function previewOpen(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async = true,
      username?: string | null,
      password?: string | null,
    ) {
      if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) blocked.add(this);
      return originalOpen.call(this, method, url, async, username ?? null, password ?? null);
    }) as typeof XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.send = (function previewSend(
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      if (blocked.has(this)) {
        this.abort();
        return;
      }
      return originalSend.call(this, body);
    }) as typeof XMLHttpRequest.prototype.send;

    const hadOwnBeacon = Object.prototype.hasOwnProperty.call(navigator, "sendBeacon");
    const originalBeacon = navigator.sendBeacon?.bind(navigator);
    if (originalBeacon) {
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        value: () => true,
      });
    }

    return () => {
      delete document.documentElement.dataset.interfacePreview;
      document.removeEventListener("submit", preventSubmit, true);
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
      XMLHttpRequest.prototype.send = originalSend;
      if (originalBeacon) {
        if (hadOwnBeacon) {
          Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: originalBeacon });
        } else {
          delete (navigator as Navigator & { sendBeacon?: Navigator["sendBeacon"] }).sendBeacon;
        }
      }
    };
  }, []);

  return null;
}
