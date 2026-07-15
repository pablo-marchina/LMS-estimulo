"use client";

import { useEffect } from "react";

const DUPLICATE_WINDOW_MS = 2_000;

export function IdempotentSubmitGuard() {
  useEffect(() => {
    const pending = new WeakSet<HTMLFormElement>();

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.querySelector('input[name="idempotency_key"]')) return;

      if (pending.has(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      pending.add(form);
      window.setTimeout(() => pending.delete(form), DUPLICATE_WINDOW_MS);
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}
