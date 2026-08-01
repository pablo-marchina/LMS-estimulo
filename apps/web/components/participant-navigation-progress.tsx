"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function ParticipantNavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setProgress(100);
    const timeout = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    function start() {
      if (timer.current) clearInterval(timer.current);
      setVisible(true);
      setProgress(12);
      timer.current = setInterval(() => {
        setProgress((current) => Math.min(88, current + Math.max(2, (88 - current) * 0.12)));
      }, 160);
    }

    function click(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || event.defaultPrevented) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || !destination.pathname.startsWith("/empreendedor")) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      start();
    }

    function submit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return;
      start();
    }

    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-white/30"
      role="progressbar"
      aria-label="Carregando próxima tela"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full bg-brand-cyan transition-[width] duration-150 motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
