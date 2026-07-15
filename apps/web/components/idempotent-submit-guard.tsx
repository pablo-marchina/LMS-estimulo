"use client";

import { useEffect } from "react";

const DUPLICATE_WINDOW_MS = 2_000;

export function IdempotentSubmitGuard() {
  useEffect(() => {
    const pending = new WeakSet<HTMLFormElement>();
    const bypass = new WeakSet<HTMLFormElement>();

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.querySelector('input[name="idempotency_key"]')) return;

      if (bypass.has(form)) {
        bypass.delete(form);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      if (pending.has(form)) return;

      pending.add(form);
      const submitter = event.submitter;
      queueMicrotask(() => {
        if (!form.isConnected) return;
        bypass.add(form);
        if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
          form.requestSubmit(submitter);
        } else {
          form.requestSubmit();
        }
      });
      window.setTimeout(() => pending.delete(form), DUPLICATE_WINDOW_MS);
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}
