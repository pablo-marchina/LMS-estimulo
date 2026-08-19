"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  saveProfileDiagnosisAnswerAction,
  submitProfileDiagnosisAction,
} from "@/app/empreendedor/diagnostico/actions";
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

type DiagnosticDraft = {
  answers?: Record<string, string>;
  currentIndex?: number;
};

function firstPendingIndex(items: DiagnosticItem[], answers: Record<string, string>) {
  const index = items.findIndex((item) => item.is_required && !answers[item.id]);
  return index >= 0 ? index : 0;
}

function serverAnswers(items: DiagnosticItem[]) {
  return Object.fromEntries(
    items
      .map((item) => [item.id, item.response?.option_code ?? ""] as const)
      .filter(([, value]) => Boolean(value)),
  );
}

export function DiagnosticStepper({
  journeyInstanceId,
  idempotencyKey,
  items,
}: {
  journeyInstanceId: string;
  idempotencyKey: string;
  items: DiagnosticItem[];
}) {
  const initialAnswers = useMemo(() => serverAnswers(items), [items]);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(() => firstPendingIndex(items, initialAnswers));
  const [draftReady, setDraftReady] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const draftKey = `estimulo:diagnostic:${journeyInstanceId}`;

  useEffect(() => {
    let merged = initialAnswers;
    let draftIndex: number | null = null;
    try {
      const raw = window.localStorage.getItem(draftKey);
      const draft = raw ? JSON.parse(raw) as DiagnosticDraft : null;
      if (draft?.answers && typeof draft.answers === "object") {
        const validDraftAnswers = Object.fromEntries(
          items.flatMap((item) => {
            const optionCode = draft.answers?.[item.id];
            return typeof optionCode === "string" && item.options.some((option) => option.code === optionCode)
              ? [[item.id, optionCode] as const]
              : [];
          }),
        );
        merged = { ...initialAnswers, ...validDraftAnswers };
      }
      if (Number.isInteger(draft?.currentIndex) && Number(draft?.currentIndex) >= 0 && Number(draft?.currentIndex) < items.length) {
        draftIndex = Number(draft?.currentIndex);
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
    setAnswers(merged);
    setCurrentIndex(draftIndex ?? firstPendingIndex(items, merged));
    setDraftReady(true);
  }, [draftKey, initialAnswers, items]);

  useEffect(() => {
    if (!draftReady) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ answers, currentIndex } satisfies DiagnosticDraft));
    } catch {
      // The server-side per-answer save remains the source of truth when local storage is unavailable.
    }
  }, [answers, currentIndex, draftKey, draftReady]);

  const current = items[currentIndex];
  const completed = useMemo(() => items.filter((item) => Boolean(answers[item.id])).length, [answers, items]);
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;
  const isLast = currentIndex === items.length - 1;

  if (!current) return null;

  function persistAnswer(itemId: string, optionCode: string) {
    setAnswers((existing) => ({ ...existing, [itemId]: optionCode }));
    setValidationMessage(null);
    setSaveMessage(null);

    // Keep the interaction lightweight: choosing an alternative immediately reveals
    // the next question while persistence continues in the background. The answer is
    // already mirrored in localStorage and is re-sent on final submission if needed.
    if (itemId === current.id && !isLast) {
      setCurrentIndex((index) => Math.min(items.length - 1, index + 1));
    }

    startSaving(async () => {
      try {
        await saveProfileDiagnosisAnswerAction({
          journeyInstanceId,
          itemId,
          optionCode,
          idempotencyKey,
        });
      } catch {
        setSaveMessage("Não foi possível sincronizar esta resposta agora. Ela ficou salva neste dispositivo e será tentada novamente ao concluir o diagnóstico.");
      }
    });
  }

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
                    onChange={() => persistAnswer(current.id, option.code)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {validationMessage ? <p className="text-sm font-semibold text-danger" role="alert">{validationMessage}</p> : null}
        {saveMessage ? <p className="text-sm font-semibold text-warning" role="status">{saveMessage}</p> : null}
        {isSaving ? <p className="text-sm text-muted" role="status">Salvando resposta…</p> : null}
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
          <PendingSubmitButton pendingLabel="Salvando diagnóstico…" disabled={isSaving || items.some((item) => item.is_required && !answers[item.id])}>
            {isSaving ? "Salvando resposta…" : "Concluir diagnóstico"}
          </PendingSubmitButton>
        ) : (
          <Button type="button" onClick={advance}>Continuar</Button>
        )}
      </div>
    </form>
  );
}
