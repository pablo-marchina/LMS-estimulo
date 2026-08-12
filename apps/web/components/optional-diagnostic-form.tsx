"use client";

import { useState, useTransition } from "react";
import {
  completeOptionalDiagnosticAction,
  saveOptionalDiagnosticAnswerAction,
} from "@/app/empreendedor/perfil/diagnosticos/[availabilityId]/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";

export type OptionalDiagnosticQuestion = {
  id: string;
  prompt: string;
  helpText: string;
  required: boolean;
  options: Array<{ id: string; label: string }>;
};

export type OptionalDiagnosticSavedResponse = {
  item_id: string;
  item_option_id: string | null;
  text_value: string | null;
};

export function OptionalDiagnosticForm({
  availabilityId,
  sessionId,
  questions,
  savedResponses,
  readOnly = false,
}: {
  availabilityId: string;
  sessionId: string;
  questions: OptionalDiagnosticQuestion[];
  savedResponses: OptionalDiagnosticSavedResponse[];
  readOnly?: boolean;
}) {
  const [responses, setResponses] = useState<Record<string, { optionId: string; textValue: string }>>(() =>
    Object.fromEntries(
      savedResponses.map((response) => [response.item_id, {
        optionId: response.item_option_id ?? "",
        textValue: response.text_value ?? "",
      }]),
    ),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function saveAnswer(itemId: string, next: { optionId: string; textValue: string }) {
    if (readOnly) return;
    setResponses((current) => ({ ...current, [itemId]: next }));
    if (!next.optionId && !next.textValue.trim()) return;
    setSaveError(null);
    startSaving(async () => {
      try {
        await saveOptionalDiagnosticAnswerAction({
          sessionId,
          itemId,
          optionId: next.optionId || null,
          textValue: next.textValue,
        });
      } catch {
        setSaveError("Não foi possível salvar a última resposta automaticamente. Ela continua nesta tela e será tentada novamente ao concluir.");
      }
    });
  }

  return (
    <form action={completeOptionalDiagnosticAction} className="grid gap-5">
      <input type="hidden" name="availability_id" value={availabilityId} />
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="question_ids" value={questions.map((question) => question.id).join(",")} />
      {questions.map((question, index) => {
        const current = responses[question.id] ?? { optionId: "", textValue: "" };
        return (
          <Card key={question.id}>
            <div className="flex items-start gap-3">
              <StatusPill tone="neutral">{index + 1}</StatusPill>
              <div className="flex-1">
                <h2 className="font-bold text-ink">{question.prompt}</h2>
                {question.helpText ? <p className="mt-1 text-sm text-muted">{question.helpText}</p> : null}
                <div className="mt-4 grid gap-2">
                  {question.options.length ? question.options.map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 has-checked:border-primary has-checked:bg-primary-soft/30">
                      <input
                        type="radio"
                        name={`question_${question.id}`}
                        value={option.id}
                        required={question.required && !readOnly}
                        checked={current.optionId === option.id}
                        disabled={readOnly}
                        onChange={() => saveAnswer(question.id, { optionId: option.id, textValue: "" })}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span className="text-sm text-ink">{option.label}</span>
                    </label>
                  )) : (
                    <Label>
                      Resposta
                      <Input
                        name={`text_${question.id}`}
                        required={question.required && !readOnly}
                        value={current.textValue}
                        disabled={readOnly}
                        onChange={(event) => setResponses((existing) => ({
                          ...existing,
                          [question.id]: { optionId: "", textValue: event.target.value },
                        }))}
                        onBlur={(event) => saveAnswer(question.id, { optionId: "", textValue: event.target.value })}
                      />
                    </Label>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      {!readOnly && isSaving ? <p className="text-sm text-muted" role="status">Salvando resposta…</p> : null}
      {!readOnly && saveError ? <p className="text-sm font-semibold text-warning" role="alert">{saveError}</p> : null}
      {!readOnly ? <PendingSubmitButton pendingLabel="Calculando resultado…" className="w-fit">Concluir diagnóstico</PendingSubmitButton> : null}
    </form>
  );
}
