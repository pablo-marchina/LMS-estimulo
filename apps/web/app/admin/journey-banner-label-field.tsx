"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";

type MountState = {
  hidden: HTMLInputElement;
  target: HTMLElement;
  value: string;
};

function persistedEyebrow(form: HTMLFormElement | null) {
  const snapshot = form?.querySelector<HTMLInputElement>('input[name="configuration_snapshot"]');
  if (!snapshot?.value) return "";
  try {
    const configuration = JSON.parse(snapshot.value) as { presentation?: { eyebrow?: unknown } };
    return typeof configuration.presentation?.eyebrow === "string" ? configuration.presentation.eyebrow : "";
  } catch {
    return "";
  }
}

export function JourneyBannerLabelField() {
  const [mount, setMount] = useState<MountState | null>(null);

  useEffect(() => {
    let currentHidden: HTMLInputElement | null = null;

    const connect = () => {
      const hidden = document.querySelector<HTMLInputElement>('input[type="hidden"][name="presentation_eyebrow"]');
      if (!hidden) {
        currentHidden = null;
        setMount(null);
        return;
      }
      if (hidden === currentHidden) return;

      const cta = hidden.form?.querySelector<HTMLInputElement>('input[name="presentation_cta"]');
      const target = cta?.parentElement?.parentElement ?? hidden.parentElement;
      if (!target) return;

      const value = persistedEyebrow(hidden.form);
      hidden.value = value;
      currentHidden = hidden;
      setMount({ hidden, target, value });
    };

    connect();
    const observer = new MutationObserver(connect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!mount) return null;

  return createPortal(
    <label className="grid gap-1 text-sm font-medium text-ink sm:col-span-2 lg:col-span-2">
      <span>Texto no banner <span className="text-xs font-normal text-muted">(opcional)</span></span>
      <Input
        key={mount.hidden.value}
        defaultValue={mount.value}
        placeholder="Ex.: Jornada demonstrativa"
        onChange={(event) => {
          mount.hidden.value = event.currentTarget.value;
        }}
      />
      <span className="text-[11px] font-normal text-muted">Edite livremente ou deixe em branco para remover o texto do banner da jornada.</span>
    </label>,
    mount.target,
  );
}
