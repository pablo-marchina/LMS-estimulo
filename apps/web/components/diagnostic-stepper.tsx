"use client";

import { useMemo, useState } from "react";
import { submitProfileDiagnosisAction } from "@/app/empreendedor/diagnostico/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DiagnosticOption = {
  id: string;
  code: string;
  label: string;
};

type DiagnosticItem = {
  id: string;
  prompt: string;
  is_required: boolean;
  response?: { option_code?: string | null } | null;
  options: DiagnosticOption[];
};

export function DiagnosticStepper({
  journeyInstanceId,
  idempotencyKey,
  items,
}: {
  journeyInstanceId: string;
  idempotencyKey: string;
  items: DiagnosticItem[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items
        .map((item) => [item.id, item.response?.option_code ?? ""] as const)
        .filter(([, value]) => Boolean(value)),
    ),
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const current = items[currentIndex];
  const completed = useMemo(() => items.filter((item) => Boolean(answers[item.id])).length, [answers, items]);
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;
  const isLast = currentIndex === items.length - 1;

  if (!current) return null;

  function advance() {
    if (current.is_required && !answers[current.id]) {
      setValidationMessage("Escolha uma resposta para continuar.");
      return;
    }
    setValidationMessage(null);
    setCurrentIndex((index) => Math.min(items.length - 1, index + 1));
  }

  return (
    <form action={submitProfileDiagnosisAction} className="grid gap-6">
      <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      {items.map((item) => (
        <input key={item.id} type="hidden" name={`answer_${item.id}`} value={answers[item.id] ?? ""} />
      ))}

      <div className="grid gap-2" aria-label="Progresso do diagnóstico">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-secondary">Pergunta {currentIndex + 1} de {items.length}</span>
          <span className="text-muted">{completed} respondidas</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card className="grid gap-5" aria-live="polite">
        <fieldset className="grid gap-4">
          <legend className="text-xl font-black leading-7 text-secondary">{current.prompt}</legend>
          <div className="grid gap-3">
            {current.options.map((option) => {
              const selected = answers[current.id] === option.code;
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm font-medium transition has-checked:border-primary has-checked:bg-primary-soft hover:border-primary/45"
                >
                  <input
                    type="radio"
                    name={`visible_answer_${current.id}`}
                    value={option.code}
                    checked={selected}
                    onChange={() => {
                      setAnswers((existing) => ({ ...existing, [current.id]: option.code }));
                      setValidationMessage(null);
                    }}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {validationMessage ? <p className="text-sm font-semibold text-danger" role="alert">{validationMessage}</p> : null}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/empreendedor" variant="ghost">Pular por agora</ButtonLink>
          {currentIndex > 0 ? (
            <Button type="button" variant="secondary" onClick={() => { setValidationMessage(null); setCurrentIndex((index) => index - 1); }}>
              Anterior
            </Button>
          ) : null}
        </div>
        {isLast ? (
          <PendingSubmitButton pendingLabel="Salvando diagnóstico…" disabled={items.some((item) => item.is_required && !answers[item.id])}>
            Concluir diagnóstico
          </PendingSubmitButton>
        ) : (
          <Button type="button" onClick={advance}>Continuar</Button>
        )}
      </div>
    </form>
  );
}
