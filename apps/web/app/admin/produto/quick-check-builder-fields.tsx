"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export type ExistingQuickQuestion = {
  prompt: string;
  question_type?: string;
  options: Array<{ label: string; is_correct: boolean }>;
};

function optionLabel(question: ExistingQuickQuestion | undefined, index: number) {
  return question?.options[index]?.label ?? "";
}

export function QuickCheckBuilderFields({
  questions = [],
  passingScore = 70,
  maxAttempts = 3,
}: {
  questions?: ExistingQuickQuestion[];
  passingScore?: number | null;
  maxAttempts?: number | null;
}) {
  const [count, setCount] = useState(Math.max(0, questions.length));
  const [types, setTypes] = useState(() => questions.map((question) => question.question_type ?? "single_choice"));

  function addQuestion() {
    setCount((value) => value + 1);
    setTypes((current) => [...current, "single_choice"]);
  }

  function removeQuestion() {
    setCount((value) => Math.max(0, value - 1));
    setTypes((current) => current.slice(0, Math.max(0, current.length - 1)));
  }

  return (
    <details className="min-w-0 rounded-2xl border border-border bg-white" open={questions.length > 0}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-black text-secondary">Verificação rápida <span className="font-normal text-muted">· opcional</span></summary>
      <div className="grid min-w-0 gap-4 border-t border-border p-4">
        <div className="grid min-w-0 gap-3 sm:flex sm:items-center sm:justify-between"><p className="min-w-0 max-w-2xl text-xs text-muted">Adicione quantas perguntas forem necessárias. Respostas abertas não são corrigidas: qualquer texto preenchido conta como participação válida.</p><div className="grid w-full min-w-0 gap-2 sm:flex sm:w-auto"><Button type="button" variant="secondary" size="sm" onClick={removeQuestion} disabled={count === 0} className="w-full sm:w-auto">Remover última</Button><Button type="button" variant="secondary" size="sm" onClick={addQuestion} className="w-full sm:w-auto">Adicionar pergunta</Button></div></div>
        <input type="hidden" name="quiz_question_count" value={count} />
        {Array.from({ length: count }, (_, index) => {
          const type = types[index] ?? questions[index]?.question_type ?? "single_choice";
          const question = questions[index];
          const open = type === "open_text";
          const trueFalse = type === "true_false";
          return <section key={index} className="grid min-w-0 gap-3 rounded-xl bg-surface-muted p-3"><div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]"><label className="grid min-w-0 gap-1 text-sm font-medium text-ink">Pergunta {index + 1}<Input className="min-w-0" name={`quiz_prompt_${index}`} required defaultValue={question?.prompt ?? ""} /></label><label className="grid min-w-0 gap-1 text-sm font-medium text-ink">Formato<Select className="min-w-0" name={`quiz_type_${index}`} value={type} onChange={(event) => setTypes((current) => { const next = [...current]; next[index] = event.target.value; return next; })}><option value="single_choice">Uma alternativa</option><option value="multiple_choice">Várias alternativas</option><option value="true_false">Verdadeiro ou falso</option><option value="open_text">Resposta aberta</option></Select></label></div>{open ? <p className="rounded-lg bg-info-soft p-2 text-xs text-info">O participante escreve livremente. Qualquer resposta não vazia é aceita.</p> : trueFalse ? <div className="grid min-w-0 gap-2 sm:grid-cols-2"><label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white p-3 text-sm"><input type="radio" name={`quiz_correct_${index}`} value="0" defaultChecked={question?.options[0]?.is_correct !== false} required className="accent-primary" /> Verdadeiro é a resposta correta</label><label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white p-3 text-sm"><input type="radio" name={`quiz_correct_${index}`} value="1" defaultChecked={question?.options[1]?.is_correct === true} required className="accent-primary" /> Falso é a resposta correta</label><input type="hidden" name={`quiz_option_${index}_0`} value="Verdadeiro" /><input type="hidden" name={`quiz_option_${index}_1`} value="Falso" /></div> : <div className="grid min-w-0 gap-2 sm:grid-cols-2">{Array.from({ length: 4 }, (_, optionIndex) => <label key={optionIndex} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-border bg-white p-2 text-sm"><input type={type === "multiple_choice" ? "checkbox" : "radio"} name={`quiz_correct_${index}`} value={String(optionIndex)} defaultChecked={question?.options[optionIndex]?.is_correct ?? optionIndex === 0} required={type !== "multiple_choice"} className="accent-primary" /><Input className="min-w-0" name={`quiz_option_${index}_${optionIndex}`} defaultValue={optionLabel(question, optionIndex)} placeholder={`Alternativa ${optionIndex + 1}`} required={optionIndex < 2} /></label>)}</div>}</section>;
        })}
        {count > 0 ? <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="grid min-w-0 gap-1 text-sm font-medium text-ink">Aprovação (%)<Input className="min-w-0" name="quiz_passing_score" type="number" min="0" max="100" defaultValue={String(passingScore ?? 70)} /><span className="text-[11px] font-normal text-muted">Ignorado quando todas as perguntas são abertas.</span></label><label className="grid min-w-0 gap-1 text-sm font-medium text-ink">Tentativas<Input className="min-w-0" name="quiz_max_attempts" type="number" min="1" max="20" defaultValue={String(maxAttempts ?? 3)} /></label></div> : null}
      </div>
    </details>
  );
}
