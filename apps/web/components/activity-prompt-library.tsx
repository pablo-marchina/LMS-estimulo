"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ActivityPrompt } from "@/lib/journey-runtime/contracts";

export function ActivityPromptLibrary({ prompts }: { prompts: ActivityPrompt[] }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  if (!prompts.length) return null;

  async function copyPrompt(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((current) => current === index ? null : current), 1800);
    } catch {
      setCopiedIndex(null);
    }
  }

  return (
    <section id="prompts" aria-labelledby="prompts-titulo" className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Sparkles size={19} /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary">Material da aula</p>
          <h2 id="prompts-titulo" className="mt-0.5 text-lg font-black text-secondary sm:text-xl">Biblioteca de prompts desta aula</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Use estes prompts como ponto de partida e adapte os campos entre colchetes ao seu negócio. Eles vêm da mesma versão da aula, por isso permanecem sincronizados com o conteúdo publicado.</p>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-2">
        {prompts.map((prompt, index) => (
          <article key={`${prompt.title}:${index}`} className="grid content-start gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-black text-secondary">{prompt.title}</h3>
              <button type="button" onClick={() => void copyPrompt(prompt.text, index)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-white px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary-soft" aria-label={`Copiar prompt: ${prompt.title}`}>
                {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                {copiedIndex === index ? "Copiado" : "Copiar"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-surface-muted p-3 font-sans text-sm leading-6 text-ink">{prompt.text}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}
