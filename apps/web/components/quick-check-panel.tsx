"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, LockKeyhole } from "lucide-react";
import { submitQuickCheckAction } from "@/app/actions/journey";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { AssessmentQuestion } from "@/lib/journey-runtime/contracts";

type Props = {
  journeyInstanceId: string;
  stepInstanceId: string;
  idempotencyKey: string;
  questions: AssessmentQuestion[];
  passingScore: number | null;
  maxAttempts: number | null;
  attemptsUsed: number;
  attemptAvailable: boolean;
  passed: boolean;
  requiredAssets: Array<{ id: string; completed: boolean }>;
  sectionsComplete: boolean;
};

function isOpenQuestion(type: string) {
  return ["open_text", "short_text", "long_text"].includes(type);
}

function questionTypeLabel(type: string) {
  if (isOpenQuestion(type)) return "Resposta aberta";
  if (type === "multiple_choice") return "Pode marcar mais de uma";
  if (type === "true_false") return "Verdadeiro ou falso";
  return "Escolha uma alternativa";
}

export function QuickCheckPanel({
  journeyInstanceId,
  stepInstanceId,
  idempotencyKey,
  questions,
  passingScore,
  maxAttempts,
  attemptsUsed,
  attemptAvailable,
  passed,
  requiredAssets,
  sectionsComplete,
}: Props) {
  const [assetState, setAssetState] = useState(() => new Map(requiredAssets.map((asset) => [asset.id, asset.completed])));
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ assetId?: string; completed?: boolean }>).detail;
      const assetId = detail?.assetId;
      if (!assetId || !detail.completed) return;
      setAssetState((current) => {
        const next = new Map(current);
        next.set(assetId, true);
        return next;
      });
    };
    window.addEventListener("estimulo:asset-progress", listener);
    return () => window.removeEventListener("estimulo:asset-progress", listener);
  }, []);

  const requiredAssetsComplete = useMemo(() => Array.from(assetState.values()).every(Boolean), [assetState]);
  const contentReady = sectionsComplete && requiredAssetsComplete;
  if (!questions.length) return null;

  if (passed) {
    return <Card id="verificacao" className="border-success/30 bg-success-soft after:!hidden"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 text-success" size={22} /><div><h2 className="font-black text-secondary">Aprendizado registrado</h2><p className="mt-1 text-sm text-muted">Você concluiu a verificação rápida desta atividade. A aula continua disponível para consulta.</p></div></div></Card>;
  }

  const hasOnlyOpenQuestions = questions.every((question) => isOpenQuestion(question.question_type));

  return (
    <form action={submitQuickCheckAction} className="grid gap-4" id="verificacao">
      <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
      <input type="hidden" name="step_instance_id" value={stepInstanceId} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <Card className="brand-quick-check overflow-hidden border-primary/20 bg-primary-soft/45 after:!hidden">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-white"><Brain size={21} /></span><div><p className="brand-kicker">Verificação rápida</p><h2 className="mt-1 text-xl font-black text-secondary">Registre o que ficou desta aula</h2><p className="mt-2 text-sm leading-6 text-muted">{questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}{!hasOnlyOpenQuestions && passingScore !== null ? ` · aprovação a partir de ${passingScore}%` : ""}{maxAttempts !== null ? ` · tentativa ${Math.min(attemptsUsed + 1, maxAttempts)} de ${maxAttempts}` : ""}.</p>{hasOnlyOpenQuestions ? <p className="mt-1 text-xs text-muted">Nas respostas abertas, qualquer texto preenchido registra a participação; o conteúdo não é corrigido automaticamente.</p> : null}</div></div>
        {!contentReady ? <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/80 p-3 text-sm text-muted"><LockKeyhole className="mt-0.5 shrink-0 text-primary" size={17} /><span>Conclua os conteúdos obrigatórios acima para enviar. As perguntas já ficam visíveis para orientar sua atenção.</span></div> : null}
      </Card>

      {questions.map((question, index) => {
        const name = `answer_${question.id}`;
        const open = isOpenQuestion(question.question_type);
        return (
          <Card key={question.id} className="grid gap-3 after:!hidden">
            <fieldset disabled={!contentReady || !attemptAvailable}>
              <legend className="text-sm font-semibold text-ink"><span className="mr-2 text-primary">Pergunta {index + 1}</span>{question.prompt}</legend>
              <p className="mt-1 text-xs text-muted">{questionTypeLabel(question.question_type)}</p>
              {question.response ? <><input type="hidden" name={name} value={question.response.option_code} /><p className="mt-3 rounded-xl bg-success-soft p-3 text-sm text-success">Resposta registrada nesta tentativa.</p></> : open ? (
                <Textarea name={name} rows={question.question_type === "long_text" ? 5 : 3} required minLength={1} maxLength={4000} className="mt-3" placeholder="Escreva uma resposta curta com suas próprias palavras." />
              ) : (
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white p-3 text-sm font-medium transition hover:border-primary/40 has-checked:border-primary has-checked:bg-primary-soft"><input type={question.question_type === "multiple_choice" ? "checkbox" : "radio"} name={name} value={option.code} required={question.question_type !== "multiple_choice"} className="size-4 accent-primary" /><span>{option.label}</span></label>)}
                </div>
              )}
            </fieldset>
          </Card>
        );
      })}
      {!attemptAvailable ? <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">O limite de tentativas desta versão foi atingido.</p> : null}
      <Button type="submit" className="w-fit" disabled={!contentReady || !attemptAvailable}>Enviar verificação</Button>
    </form>
  );
}
