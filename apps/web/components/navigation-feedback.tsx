"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_VISIBLE_MS = 12_000;
const COMPLETE_DELAY_MS = 180;

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!pendingRef.current) return;
    setProgress(100);
    const completion = window.setTimeout(() => {
      pendingRef.current = false;
      setVisible(false);
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, COMPLETE_DELAY_MS);
    return () => window.clearTimeout(completion);
  }, [routeKey]);

  useEffect(() => {
    const stopTimers = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
    };

    const start = () => {
      stopTimers();
      pendingRef.current = true;
      setVisible(true);
      setProgress(10);
      intervalRef.current = setInterval(() => {
        setProgress((current) => Math.min(90, current + Math.max(1.5, (90 - current) * 0.14)));
      }, 140);
      timeoutRef.current = setTimeout(() => {
        pendingRef.current = false;
        setVisible(false);
        setProgress(0);
        stopTimers();
      }, MAX_VISIBLE_MS);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const destinationKey = `${destination.pathname}?${destination.searchParams.toString()}`;
      if (destinationKey === routeKey) return;
      start();
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented || !(event.target instanceof HTMLFormElement)) return;
      start();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", start);
      stopTimers();
    };
  }, [routeKey]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary-soft/80"
      role="progressbar"
      aria-label="Carregando próxima página"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full rounded-r-full bg-primary shadow-[0_0_16px_rgba(0,0,141,.35)] transition-[width] duration-150 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
