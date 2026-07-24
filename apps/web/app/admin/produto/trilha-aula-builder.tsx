import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Trilha, TrilhaAula } from "@/lib/admin/product-management";
import { saveAulaAction } from "./actions";

type TrilhaAulaBuilderProps = {
  journeyVersionId: string;
  organizationId: string;
  trilha: Trilha;
};

function aulaSummary(aula: TrilhaAula) {
  const details: string[] = [];
  if (aula.assessment) details.push(`Quiz (${aula.assessment.questions.length} pergunta(s))`);
  if (aula.practice) details.push("Entrega prática");
  return details.length ? ` · ${details.join(" · ")}` : "";
}

export function TrilhaAulaBuilder({ journeyVersionId, organizationId, trilha }: TrilhaAulaBuilderProps) {
  const aulas = trilha.aulas.slice().sort((a, b) => a.position - b.position);

  return (
    <article className="grid gap-4 rounded-xl border border-border bg-surface p-4">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-ink">{trilha.position}. {trilha.name}</h4>
          <span className="text-xs text-muted">{aulas.length} aula(s)</span>
        </div>
        {trilha.description ? <p className="max-w-3xl text-sm text-muted">{trilha.description}</p> : null}
        {trilha.badge ? <p className="text-xs font-medium text-ink">Selo: {trilha.badge.title}</p> : null}
      </header>

      <section className="grid gap-2" aria-label={`Aulas de ${trilha.name}`}>
        <h5 className="text-sm font-semibold text-ink">Aulas</h5>
        {aulas.length ? aulas.map((aula) => (
          <div key={aula.step_id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-background px-3 py-2">
            <p className="text-sm text-ink">
              <strong>{aula.position}. {aula.title}</strong>
              <span className="text-muted">{aulaSummary(aula)}</span>
            </p>
            <span className="text-xs text-muted">{aula.activity_type === "practice" ? "Encerramento" : "Conteúdo"}</span>
          </div>
        )) : <p className="text-sm text-muted">Nenhuma aula adicionada.</p>}
      </section>

      <details className="group rounded-lg border border-border bg-background">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-primary marker:content-none [&::-webkit-details-marker]:hidden">
          Adicionar aula
        </summary>
        <form action={saveAulaAction} className="grid gap-4 border-t border-border p-4">
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="journey_version_id" value={journeyVersionId} />
          <input type="hidden" name="path_template_id" value={trilha.id} />
          <input type="hidden" name="position" value={String(aulas.length + 1)} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Título da aula
              <Input name="title" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Duração estimada em minutos
              <Input name="estimated_minutes" type="number" min="1" defaultValue="10" required />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Descrição (rascunho editável)
            <Textarea name="description" rows={4} />
          </label>

          <fieldset className="grid gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-semibold text-ink">Prompts da aula (opcional)</legend>
            <p className="text-xs text-muted">Preencha apenas os blocos necessários. Cada prompt precisa de título e texto.</p>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="grid gap-2 rounded-lg bg-background sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                <Input name={`prompt_title_${index}`} placeholder={`Título do prompt ${index + 1}`} />
                <Textarea name={`prompt_text_${index}`} rows={2} placeholder="Texto do prompt" />
              </div>
            ))}
          </fieldset>

          <label className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-sm text-ink">
            <input type="checkbox" name="is_closing" value="on" className="mt-0.5 size-4 accent-primary" />
            <span>
              <strong className="block">Esta aula encerra a trilha</strong>
              <span className="text-muted">Cria o quiz final e a entrega prática desta trilha.</span>
            </span>
          </label>

          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">Quiz e entrega de encerramento</summary>
            <div className="grid gap-4 border-t border-border p-3">
              <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold text-ink">Quiz de encerramento</legend>
                <p className="text-xs text-muted">Para cada pergunta preenchida, inclua ao menos duas alternativas e marque a correta.</p>
                {[0, 1, 2, 3, 4].map((questionIndex) => (
                  <div key={questionIndex} className="grid gap-2 rounded-lg bg-background p-3">
                    <Input name={`quiz_prompt_${questionIndex}`} placeholder={`Pergunta ${questionIndex + 1}`} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[0, 1, 2, 3].map((optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2 text-xs text-ink">
                          <input
                            type="radio"
                            name={`quiz_correct_${questionIndex}`}
                            value={String(optionIndex)}
                            className="size-4 shrink-0 accent-primary"
                            aria-label={`Marcar alternativa ${optionIndex + 1} como correta`}
                          />
                          <Input name={`quiz_option_${questionIndex}_${optionIndex}`} placeholder={`Alternativa ${optionIndex + 1}`} aria-label={`Texto da alternativa ${optionIndex + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>

              <label className="grid gap-1.5 text-sm font-medium text-ink">
                Checklist da entrega prática (um item por linha)
                <Textarea name="practice_checklist" rows={6} />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-ink">
                Nome do Selo desta trilha
                <Input name="badge_title" />
                <span className="text-xs font-normal text-muted">O nome fica registrado no formulário; a vinculação automática do Selo será concluída na etapa de credenciais.</span>
              </label>
            </div>
          </details>

          <Button type="submit" size="sm" className="w-fit">Salvar aula</Button>
        </form>
      </details>
    </article>
  );
}
