"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AssetProgressDetail = {
  lessonCompleted?: boolean;
};

const AUTO_ADVANCE_SECONDS = 3;

export function LessonAutoAdvance() {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);
  const scheduled = useRef(false);

  useEffect(() => {
    let interval: number | null = null;
    let timeout: number | null = null;

    function clearTimers() {
      if (interval !== null) window.clearInterval(interval);
      if (timeout !== null) window.clearTimeout(timeout);
      interval = null;
      timeout = null;
    }

    function onProgress(event: Event) {
      const detail = (event as CustomEvent<AssetProgressDetail>).detail;
      if (!detail?.lessonCompleted || scheduled.current) return;

      scheduled.current = true;
      setSeconds(AUTO_ADVANCE_SECONDS);
      router.refresh();

      let remaining = AUTO_ADVANCE_SECONDS;
      interval = window.setInterval(() => {
        remaining -= 1;
        setSeconds(Math.max(0, remaining));
      }, 1000);

      timeout = window.setTimeout(() => {
        clearTimers();
        const nextForm = document.querySelector<HTMLFormElement>('form[data-next-lesson-form="true"]');
        if (nextForm) {
          nextForm.requestSubmit();
          return;
        }
        scheduled.current = false;
        setSeconds(null);
        router.refresh();
      }, AUTO_ADVANCE_SECONDS * 1000);
    }

    window.addEventListener("estimulo:asset-progress", onProgress);
    return () => {
      window.removeEventListener("estimulo:asset-progress", onProgress);
      clearTimers();
    };
  }, [router]);

  if (seconds === null) return null;

  return (
    <p className="mt-3 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success" role="status" aria-live="polite">
      Aula concluída. Abrindo a próxima aula em {seconds}…
    </p>
  );
}
