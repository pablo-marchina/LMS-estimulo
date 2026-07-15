"use client";

import { useRef, type FormEvent, type ReactNode } from "react";

const DUPLICATE_WINDOW_MS = 2_000;

export function IdempotentSubmitBoundary({ children }: { children: ReactNode }) {
  const pending = useRef(new WeakSet<HTMLFormElement>());

  const handleSubmitCapture = (event: FormEvent<HTMLDivElement>) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.querySelector('input[name="idempotency_key"]')) return;

    if (pending.current.has(form)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    pending.current.add(form);
    window.setTimeout(() => pending.current.delete(form), DUPLICATE_WINDOW_MS);
  };

  return <div onSubmitCapture={handleSubmitCapture}>{children}</div>;
}
