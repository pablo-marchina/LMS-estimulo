"use client";

import { useEffect } from "react";

export function LibraryAccessTracker({ libraryItemVersionId }: { libraryItemVersionId: string }) {
  useEffect(() => {
    const storageKey = `estimulo:library:view:${libraryItemVersionId}`;
    let idempotencyKey = sessionStorage.getItem(storageKey);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
    }

    void fetch("/api/library/access", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ libraryItemVersionId, idempotencyKey })
    });
  }, [libraryItemVersionId]);

  return null;
}
