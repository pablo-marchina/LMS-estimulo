"use client";

import { useEffect, useState } from "react";

const SELECT_MESSAGE = "estimulo:interface-content-selected";

export function InterfacePreviewBridge() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const enabled = new URLSearchParams(window.location.search).get("interface_preview") === "1";
    if (!enabled || window.parent === window) return;

    setActive(true);
    document.documentElement.dataset.interfacePreview = "true";

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-interface-content-key]")
        : null;
      const contentKey = target?.dataset.interfaceContentKey;
      if (!target || !contentKey) return;

      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage({ type: SELECT_MESSAGE, contentKey, pathname: window.location.pathname }, window.location.origin);
    };

    document.addEventListener("click", handleClick, true);
    window.parent.postMessage({ type: "estimulo:interface-preview-ready", pathname: window.location.pathname }, window.location.origin);

    return () => {
      document.removeEventListener("click", handleClick, true);
      delete document.documentElement.dataset.interfacePreview;
    };
  }, []);

  if (!active) return null;

  return (
    <>
      <style>{`
        html[data-interface-preview="true"] [data-interface-content-key] {
          cursor: crosshair !important;
          outline: 2px dashed rgba(0, 129, 138, .72);
          outline-offset: 3px;
          transition: outline-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
        }
        html[data-interface-preview="true"] [data-interface-content-key]:hover {
          outline-color: #00a4ad;
          box-shadow: 0 0 0 5px rgba(0, 164, 173, .16);
          transform: translateY(-1px);
        }
      `}</style>
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[9999] mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-secondary px-4 py-2 text-center text-xs font-bold text-white shadow-xl">
        Clique em um elemento contornado para editá-lo
      </div>
    </>
  );
}
