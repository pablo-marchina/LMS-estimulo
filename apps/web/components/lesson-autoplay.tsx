"use client";

import { useEffect } from "react";

const AUTOPLAY_QUERY_VALUE = "1";
const PLAYER_SELECTOR = "[data-video-player]";

function tryNativePlayback(media: HTMLMediaElement) {
  const play = () => {
    void media.play().catch(() => undefined);
  };
  play();
  if (media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
    media.addEventListener("canplay", play, { once: true });
    return () => media.removeEventListener("canplay", play);
  }
  return () => undefined;
}

function requestIframePlayback(iframe: HTMLIFrameElement) {
  let url: URL;
  try {
    url = new URL(iframe.src);
  } catch {
    return;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "https://www.youtube.com",
    );
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "https://www.youtube-nocookie.com",
    );
    return;
  }

  if (host === "player.vimeo.com") {
    iframe.contentWindow?.postMessage({ method: "play" }, "https://player.vimeo.com");
    return;
  }

  if (host === "drive.google.com" && url.searchParams.get("autoplay") !== AUTOPLAY_QUERY_VALUE) {
    url.searchParams.set("autoplay", AUTOPLAY_QUERY_VALUE);
    iframe.src = url.toString();
  }
}

export function LessonAutoplay() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autoplay") !== AUTOPLAY_QUERY_VALUE) return;

    let cleanupNative: (() => void) | null = null;
    let attempts = 0;
    const tryPlayback = () => {
      attempts += 1;
      const player = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
      if (!player) return attempts >= 12;

      if (player instanceof HTMLMediaElement) {
        cleanupNative = tryNativePlayback(player);
        return true;
      }

      const iframe = player instanceof HTMLIFrameElement
        ? player
        : player.querySelector<HTMLIFrameElement>("iframe");
      if (!iframe) return attempts >= 12;

      const request = () => requestIframePlayback(iframe);
      request();
      iframe.addEventListener("load", request, { once: true });
      window.setTimeout(request, 400);
      return true;
    };

    if (tryPlayback()) return () => cleanupNative?.();

    const interval = window.setInterval(() => {
      if (tryPlayback()) window.clearInterval(interval);
    }, 500);

    return () => {
      window.clearInterval(interval);
      cleanupNative?.();
    };
  }, []);

  return null;
}
